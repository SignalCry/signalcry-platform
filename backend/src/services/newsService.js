const Parser = require("rss-parser");
const staticNews = require("../data/news");

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
];

// In-memory cache
let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
  return text.slice(0, maxLength).replace(/\s\S*$/, "") + "…";
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

  // Sort by date (newest first)
  articles.sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
  );

  // Deduplicate by title (lowercased)
  const seen = new Set();
  articles = articles.filter((a) => {
    const key = a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Assign stable IDs and limit to 30 articles
  return articles.slice(0, 30).map((a, idx) => ({
    id: String(idx + 1),
    ...a,
  }));
}

/**
 * Get news — returns cached data if fresh, otherwise fetches new data.
 * Falls back to static data if all feeds fail.
 */
async function getNews() {
  const now = Date.now();

  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const articles = await fetchAllNews();

    // If every feed failed, fall back to static data
    if (articles.length === 0) {
      console.warn("[newsService] All feeds returned empty, using static fallback");
      return staticNews;
    }

    cache = { data: articles, timestamp: now };
    return articles;
  } catch (err) {
    console.error("[newsService] Unexpected error, using static fallback:", err.message);
    return cache.data || staticNews;
  }
}

module.exports = { getNews };
