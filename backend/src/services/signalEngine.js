/**
 * Signal engine — turns one news article into clean, structured AI analysis.
 *
 * Pipeline: build prompt → call AI → parse JSON → validate/sanitize → return.
 * Throws (never swallows) so the caller can skip a bad article and move on.
 */

const { generateText } = require("./aiClient");
const { buildSignalPrompt } = require("./signalPrompt");

const VALID_SENTIMENTS = ["bullish", "bearish", "neutral"];

/**
 * Parse AI text as JSON. If it fails, strip markdown code fences and retry.
 */
function parseAiJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(stripped);
  }
}

/**
 * Analyze a single article and return structured AI fields.
 * @param {{ id: any, title: string, excerpt?: string, content?: string }} article
 * @returns {Promise<{ aiSummary: string, aiSentiment: string, aiImpactScore: number, aiAssets: string[] }>}
 */
async function processArticle(article) {
  try {
    const prompt = buildSignalPrompt({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
    });

    const { text } = await generateText(prompt);

    const parsed = parseAiJson(text);

    // summary: required non-empty string
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) {
      throw new Error("AI result missing a valid summary");
    }

    // sentiment: lowercase, must be one of the allowed values, else neutral
    let sentiment =
      typeof parsed.sentiment === "string"
        ? parsed.sentiment.toLowerCase().trim()
        : "";
    if (!VALID_SENTIMENTS.includes(sentiment)) {
      sentiment = "neutral";
    }

    // impactScore: integer clamped 0-100, NaN → 0
    let impactScore = parseInt(parsed.impactScore, 10);
    if (Number.isNaN(impactScore)) {
      impactScore = 0;
    }
    impactScore = Math.max(0, Math.min(100, impactScore));

    // assets: array of uppercase strings, max 5, non-strings filtered out
    const assets = Array.isArray(parsed.assets)
      ? parsed.assets
          .filter((a) => typeof a === "string")
          .map((a) => a.toUpperCase().trim())
          .filter((a) => a.length > 0)
          .slice(0, 5)
      : [];

    return {
      aiSummary: summary,
      aiSentiment: sentiment,
      aiImpactScore: impactScore,
      aiAssets: assets,
    };
  } catch (err) {
    throw new Error(
      `Failed to process article ${article?.id}: ${err.message}`
    );
  }
}

module.exports = { processArticle };
