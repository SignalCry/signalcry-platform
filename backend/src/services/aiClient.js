/**
 * AI client — calls Gemini Flash (primary), falls back to Groq (free) on failure.
 * Both return plain text. Caller is responsible for parsing.
 *
 * Env required:
 *   GEMINI_API_KEY  — https://aistudio.google.com  (free tier)
 *   GROQ_API_KEY    — https://console.groq.com     (free tier)
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // free, fast fallback

/**
 * Call Gemini Flash. Returns the text response.
 */
async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,            // low = consistent, factual
        responseMimeType: "application/json", // ask Gemini for clean JSON
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

/**
 * Call Groq (Llama 70B). Returns the text response.
 */
async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" }, // force JSON
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return text;
}

/**
 * Main entry: try Gemini, fall back to Groq.
 * Returns { text, provider } so the caller knows which model answered.
 */
async function generateText(prompt) {
  try {
    const text = await callGemini(prompt);
    console.log("[aiClient] article processed via gemini");
    return { text, provider: "gemini" };
  } catch (geminiErr) {
    console.warn(`[aiClient] Gemini failed, trying Groq: ${geminiErr.message}`);
    try {
      const text = await callGroq(prompt);
      console.log("[aiClient] article processed via groq");
      return { text, provider: "groq" };
    } catch (groqErr) {
      console.error(`[aiClient] Both providers failed. Groq: ${groqErr.message}`);
      throw new Error("All AI providers failed");
    }
  }
}

module.exports = { generateText };