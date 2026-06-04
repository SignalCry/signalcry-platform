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
  "impactScore": number,    // integer 0-100. How much could this move the crypto market? Minor listing=10-25, notable news=40-60, major event (ETF approval, big hack, Fed decision)=80-95
  "assets": string[]        // ticker symbols affected, uppercase, e.g. ["BTC","ETH"]. Empty array if none. Max 5.
}

Rules:
- sentiment is from a TRADER's view: is this good (bullish) or bad (bearish) for the affected assets?
- impactScore reflects market-moving potential, not how interesting the news is.
- assets: only include coins clearly mentioned or directly affected. Use standard tickers (BTC, ETH, SOL, XRP, BNB, ADA, DOGE...).
- If the news is not really about crypto, set impactScore low and assets to [].
- Output ONLY the JSON. No markdown, no backticks, no explanation.

NEWS ITEM:
Title: ${title}
Body: ${body}`;
}

module.exports = { buildSignalPrompt };