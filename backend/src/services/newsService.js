const Parser = require("rss-parser");
const cheerio = require("cheerio");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "SignalCry/1.0",
  },
  customFields: {
    item: [["media:content", "mediaContent"]],
  },
});

// RSS feed sources — all free, no API key required
const FEEDS = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
  { url: "https://bitcoinmagazine.com/.rss/full/", source: "Bitcoin Magazine" },
  { url: "https://blockworks.co/feed", source: "Blockworks" },
  { url: "https://www.newsbtc.com/feed/", source: "NewsBTC" },
  { url: "https://ambcrypto.com/feed/", source: "AMBCrypto" },
  { url: "https://cryptopotato.com/feed/", source: "CryptoPotato" },
];

// In-memory caches
let cache = { data: null, timestamp: 0 };
const articleCache = new Map(); // url -> { content, scrapedAt }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const ARTICLE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const DATES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

let datesCache = { data: null, timestamp: 0 };

/**
 * Extract the best available image from a feed item.
 */
function extractImage(item) {
  // <media:content url="...">
  if (item.mediaContent && item.mediaContent.$?.url) {
    return item.mediaContent.$.url;
  }
  // <enclosure url="...">
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // First <img> in content
  const imgMatch = (item["content:encoded"] || item.content || "").match(
    /<img[^>]+src=["']([^"']+)["']/
  );
  if (imgMatch) {
    return imgMatch[1];
  }
  return null;
}

/**
 * Strip HTML tags and truncate to a clean excerpt.
 */
function makeExcerpt(html, maxLength = 200) {
  const text = (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s\S*$/, "").replace(/[,;:\-\u2013\u2014]+$/, "") + "\u2026";
}

/**
 * Strip HTML for plain-text content.
 */
function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect topics from an article's title + excerpt.
 */
const TOPIC_RULES = [
  { topic: "Bitcoin",    pattern: /\b(bitcoin|btc|satoshi|halving|mining)\b/i },
  { topic: "Ethereum",   pattern: /\b(ethereum|eth|layer.?2|rollup|eip|vitalik)\b/i },
  { topic: "DeFi",       pattern: /\b(defi|dex|dao|liquidity|yield|amm|uniswap|aave|compound)\b/i },
  { topic: "NFT",        pattern: /\b(nft|token|airdrop|opensea|mint)\b/i },
  { topic: "Regulation", pattern: /\b(regulation|sec|cftc|legislation|ban|law|compliance|congress|cbdc)\b/i },
  { topic: "Altcoins",   pattern: /\b(solana|sol|cardano|ada|xrp|ripple|bnb|avax|avalanche|dot|polkadot|link|chainlink|doge|dogecoin|shib|memecoin|altcoin)\b/i },
];

function detectTopics(article) {
  const text = `${article.title} ${article.excerpt}`;
  return TOPIC_RULES.filter((r) => r.pattern.test(text)).map((r) => r.topic);
}

/**
 * Fetch a single feed, returning normalized articles.
 */
async function fetchFeed({ url, source }) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => ({
      title: (item.title || "").trim(),
      image: extractImage(item),
      excerpt: makeExcerpt(item.contentSnippet || item["content:encoded"] || item.content),
      content: stripHtml(item["content:encoded"] || item.content || item.contentSnippet),
      source,
      publishedAt: item.isoDate || item.pubDate || null,
      url: item.link || null,
    }));
  } catch (err) {
    console.warn(`[newsService] Failed to fetch ${source}: ${err.message}`);
    return [];
  }
}

/**
 * Fetch all feeds in parallel, merge, sort by date, deduplicate, and assign IDs.
 */
async function fetchAllNews() {
  const results = await Promise.allSettled(
    FEEDS.map((feed) => fetchFeed(feed))
  );

  let articles = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Filter out items without a title
  articles = articles.filter((a) => a.title);

  // Keep only crypto-related articles
  const CRYPTO_KEYWORDS = /\b(crypto|bitcoin|btc|ethereum|eth|blockchain|defi|nft|token|altcoin|stablecoin|web3|mining|halving|solana|cardano|xrp|ripple|binance|coinbase|exchange|wallet|ledger|dex|dao|airdrop|memecoin|layer.?2|rollup)\b/i;
  articles = articles.filter(
    (a) => CRYPTO_KEYWORDS.test(a.title) || CRYPTO_KEYWORDS.test(a.excerpt)
  );

  // Sort by date (newest first)
  articles.sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
  );

  // Deduplicate by URL (falls back to title if URL is missing)
  const seen = new Set();
  articles = articles.filter((a) => {
    const key = a.url || a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Assign stable IDs based on URL hash and limit to 300 articles
  return articles.slice(0, 300).map((a) => ({
    id: crypto.createHash("sha256").update(a.url || a.title).digest("hex").slice(0, 12),
    topics: detectTopics(a),
    ...a,
  }));
}

/**
 * Upsert a batch of articles into the DB (fire-and-forget, never throws).
 */
async function upsertArticlesToDB(articles) {
  // Only persist articles published today (local date) so the DB stays lean
  // and the AI worker only ever sees fresh, same-day content.
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayArticles = articles.filter((a) => {
    if (!a.publishedAt) return false;
    return new Date(a.publishedAt).toISOString().slice(0, 10) === todayStr;
  });

  try {
    await prisma.news.createMany({
      data: todayArticles
        .filter((a) => a.url) // url is required (unique key)
        .map((a) => ({
          id: a.id,
          title: a.title,
          excerpt: a.excerpt || null,
          content: a.content || null,
          image: a.image || null,
          source: a.source,
          url: a.url,
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
          topics: a.topics ?? [],
        })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("[newsService] DB upsert failed:", err.message);
  }
}

/**
 * Fetch latest RSS articles, cache in memory, and persist new ones to DB.
 */
async function getNews() {
  const now = Date.now();

  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const articles = await fetchAllNews();
    cache = { data: articles, timestamp: now };

    // Persist new articles to DB in the background
    upsertArticlesToDB(articles);

    return articles;
  } catch (err) {
    console.error("[newsService] Unexpected error, using static fallback:", err.message);
    return cache.data ?? [];
  }
}

/**
 * Scrape full article content from the source URL.
 */
async function scrapeArticle(url) {
  // Check cache first
  const cached = articleCache.get(url);
  if (cached && Date.now() - cached.scrapedAt < ARTICLE_CACHE_TTL) {
    return cached.content;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise elements
  $(
    "script, style, nav, footer, header, aside, iframe, figure, figcaption, " +
    ".ad, .ads, .advert, .sidebar, .social, .share, .related, .comments, " +
    ".newsletter, .subscribe, .popup, .modal, .banner, [role=navigation], " +
    ".article-tags, .tags, .breadcrumb"
  ).remove();

  // Source-specific selectors (most reliable)
  const SOURCE_SELECTORS = [
    ".at-body",                          // CoinDesk
    ".article-body",                     // CoinDesk alt
    ".post-content",                     // CoinTelegraph / Decrypt
    ".article__body",                    // CoinTelegraph alt
    '[class*="ArticleBody"]',            // CoinDesk React
    '[class*="article-detail"]',         // CoinTelegraph React
    ".entry-content",                    // WordPress-based
    "article",                           // Generic semantic
    "[role=article]",                    // ARIA
    "main",                              // Fallback
  ];

  let paragraphs = [];

  for (const selector of SOURCE_SELECTORS) {
    const container = $(selector).first();
    if (!container.length) continue;

    container.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) paragraphs.push(text);
    });

    if (paragraphs.length >= 3) break;
    paragraphs = []; // reset and try next selector
  }

  // Last resort: all <p> in body with meaningful length
  if (paragraphs.length < 3) {
    paragraphs = [];
    $("body p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) paragraphs.push(text);
    });
  }

  const content = paragraphs.join("\n\n");

  // Cache result
  articleCache.set(url, { content, scrapedAt: Date.now() });

  return content;
}

/**
 * Get a single article by ID — returns DB metadata plus AI analysis fields.
 * Does NOT return scraped full article text.
 */
async function getArticle(id) {
  const row = await prisma.news.findUnique({ where: { id } });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? "",
    image: row.image,
    source: row.source,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    url: row.url,
    topics: row.topics,
    aiProcessed: row.aiProcessed,
    aiSummary: row.aiSummary ?? null,
    aiSentiment: row.aiSentiment ?? null,
    aiImpactScore: row.aiImpactScore ?? null,
    aiAssets: row.aiAssets ?? [],
  };
}

/**
 * Get a paginated slice of news from the DB with optional filters.
 * @param {object} opts
 * @param {number}  opts.page
 * @param {number}  opts.limit
 * @param {string}  opts.source  - exact source name, e.g. "CoinDesk"
 * @param {string}  opts.topic   - topic label, e.g. "Bitcoin"
 * @param {string}  opts.date    - ISO date string "YYYY-MM-DD"
 */
async function getNewsPaginated({ cursor = "", limit = 10, source = "", topic = "", date = "" } = {}) {
  const where = {};
  if (source) where.source = source;
  if (topic)  where.topics = { has: topic };
  if (date) {
    const dayStart = new Date(date);
    const dayEnd   = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.publishedAt = { gte: dayStart, lt: dayEnd };
  }

  const total = await prisma.news.count({ where });

  const queryArgs = {
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: limit + 1,
    select: {
      id: true, title: true, excerpt: true, image: true,
      source: true, publishedAt: true, url: true, topics: true,
      aiProcessed: true, aiSentiment: true, aiImpactScore: true, aiAssets: true,
    },
  };

  if (cursor) {
    queryArgs.cursor = { id: cursor };
    queryArgs.skip = 1;
  }

  const rows = await prisma.news.findMany(queryArgs);
  const hasMore = rows.length > limit;
  const articles = rows.slice(0, limit).map((r) => ({
    ...r,
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));

  return { articles, total, nextCursor: hasMore ? articles[articles.length - 1].id : null };
}

/**
 * Return all unique calendar dates (YYYY-MM-DD) that have at least one article in DB.
 */
async function getAvailableDates() {
  const now = Date.now();
  if (datesCache.data && now - datesCache.timestamp < DATES_CACHE_TTL) {
    return datesCache.data;
  }

  const rows = await prisma.$queryRaw`
    SELECT DISTINCT DATE("publishedAt") AS date
    FROM "News"
    WHERE "publishedAt" IS NOT NULL
    ORDER BY date DESC
  `;
  const dates = rows.map((r) => {
    const d = r.date;
    return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  });

  datesCache = { data: dates, timestamp: now };
  return dates;
}

/**
 * Delete articles older than 28 days. Call once on server startup.
 */
async function cleanupOldArticles() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const { count } = await prisma.news.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (count > 0) {
    console.log(`[newsService] Cleaned up ${count} articles older than 28 days`);
  }
}

module.exports = { getNews, getNewsPaginated, getAvailableDates, getArticle, cleanupOldArticles };
