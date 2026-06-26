/**
 * Builds the analysis prompt for a single news article.
 * The AI must return STRICT JSON with 4 fields — nothing else.
 */
function buildSignalPrompt({ title, excerpt, content }) {
  // Keep input bounded so we don't waste tokens on huge scraped bodies
  const body = (content || excerpt || "").slice(0, 2000);

  return `You are a crypto market analyst for a real-time intelligence platform.
Analyze the news item below and return your analysis as STRICT JSON.

Return ONLY a JSON object with these exact keys:
{
  "summary": string,        // 2-3 sentences. Your ORIGINAL analysis: what this means for the market and what to watch next. Do NOT just rephrase the headline. No fluff.
  "sentiment": string,      // exactly one of: "bullish", "bearish", "neutral"
  "impactScore": number,    // integer 0-100. See SCORING GUIDE below.
  "assets": string[]        // ticker symbols affected, uppercase, e.g. ["BTC","ETH"]. Empty array if none. Max 5.
}

SCORING GUIDE for impactScore (use the FULL range — most news is low-impact):
  1-15  = NOISE: opinion pieces, price recaps, "crypto is the future" fluff, minor partnerships, recycled headlines
  16-35 = LOW: token listings on small exchanges, routine protocol updates, minor integrations, developer tooling news
  36-55 = MEDIUM: notable partnerships with known brands, mid-cap regulatory news, exchange outages, new L1/L2 launches
  56-80 = HIGH: major exchange hacks (>$50M), top-10 coin regulatory rulings, large institutional fund entries/exits, stablecoin depegs
  81-100 = CRITICAL: BTC/ETH ETF approvals or rejections, central bank actions on crypto, protocol-breaking exploits, country-level bans or legal tender adoption

IMPORTANT: Be harsh. 60-70% of crypto news is noise or low-impact (score 1-35). Only give 56+ to genuinely market-moving events. Ask yourself: "Would this make a trader act RIGHT NOW?" If not, it's probably below 40.

Rules:
- sentiment is from a TRADER's view: is this good (bullish) or bad (bearish) for the affected assets?
- impactScore reflects market-moving potential, not how interesting the news is.
- assets: only include coins clearly mentioned or directly affected. Use standard tickers (BTC, ETH, SOL, XRP, BNB, ADA, DOGE...).
- If the news is not really about crypto, set impactScore to 1-5 and assets to [].
- Output ONLY the JSON. No markdown, no backticks, no explanation.

NEWS ITEM:
Title: ${title}
Body: ${body}`;
}

module.exports = { buildSignalPrompt };