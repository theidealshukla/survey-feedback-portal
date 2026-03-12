/**
 * AI Configuration Module
 * Centralized OpenAI API integration for the Survey Feedback Portal
 * All AI features (sentiment, summaries, RCA/CAPA) use this module.
 */

// ⚠️ REPLACE WITH YOUR OPENAI API KEY
const OPENAI_API_KEY = "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";

const AI_CONFIG = {
  model: "openai/gpt-4o-mini",
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  maxRetries: 2,
  timeout: 30000,
};

/**
 * Core OpenAI API caller. All AI features in the portal use this.
 * @param {string} systemPrompt - The system instruction
 * @param {string} userPrompt - The user message / data to analyze
 * @param {object} options - Optional overrides (temperature, max_tokens, etc.)
 * @returns {string} The AI response text
 */
async function callOpenAI(systemPrompt, userPrompt, options = {}) {
  const { temperature = 0.4, max_tokens = 2000, retryCount = 0 } = options;

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
    throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY in ai-config.js");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

    const response = await fetch(AI_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "HTTP-Referer": window.location.href, // For OpenRouter
        "X-Title": "Smart Support Portal" // For OpenRouter
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return content.trim();
  } catch (error) {
    if (error.name === "AbortError") {
      error.message = "OpenAI request timed out after " + (AI_CONFIG.timeout / 1000) + "s";
    }

    // Retry on transient errors
    if (retryCount < AI_CONFIG.maxRetries && (error.message.includes("429") || error.message.includes("500") || error.message.includes("timed out"))) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`⚠️ AI call failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${AI_CONFIG.maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callOpenAI(systemPrompt, userPrompt, { ...options, retryCount: retryCount + 1 });
    }

    throw error;
  }
}

/**
 * Classify sentiment of a single text as Positive, Negative, or Neutral.
 * @param {string} text - The feedback/complaint text
 * @returns {string} "Positive", "Negative", or "Neutral"
 */
async function classifySentiment(text) {
  if (!text || text.trim().length === 0) return "Neutral";

  const systemPrompt = `You are a sentiment classifier for customer feedback. Classify the sentiment as exactly one of: Positive, Negative, or Neutral. Respond with ONLY the single word — no punctuation, no explanation.`;

  try {
    const result = await callOpenAI(systemPrompt, text, { temperature: 0, max_tokens: 10 });
    const cleaned = result.trim().replace(/[^a-zA-Z]/g, "");

    if (["Positive", "Negative", "Neutral"].includes(cleaned)) {
      return cleaned;
    }
    // Fuzzy match
    if (cleaned.toLowerCase().startsWith("pos")) return "Positive";
    if (cleaned.toLowerCase().startsWith("neg")) return "Negative";
    return "Neutral";
  } catch (error) {
    console.warn("⚠️ AI sentiment failed, using fallback:", error.message);
    return fallbackSentiment(text);
  }
}

/**
 * Batch classify sentiments for multiple texts in a single API call.
 * @param {Array<{id: string, text: string}>} entries
 * @returns {Object} Map of id -> "Positive"/"Negative"/"Neutral"
 */
async function batchClassifySentiments(entries) {
  if (!entries || entries.length === 0) return {};

  // Filter out empty texts
  const validEntries = entries.filter((e) => e.text && e.text.trim().length > 0);
  if (validEntries.length === 0) return {};

  const systemPrompt = `You are a sentiment classifier for customer feedback. For each numbered feedback below, classify the sentiment as exactly one of: Positive, Negative, or Neutral. 
Respond with ONLY a JSON array of objects like: [{"id":"...","sentiment":"Positive"},{"id":"...","sentiment":"Negative"}]
No explanation, no markdown, just valid JSON.`;

  const userPrompt = validEntries
    .map((e, i) => `${i + 1}. [ID: ${e.id}] "${e.text}"`)
    .join("\n");

  try {
    const result = await callOpenAI(systemPrompt, userPrompt, {
      temperature: 0,
      max_tokens: validEntries.length * 50,
    });

    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = result;
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    const sentimentMap = {};
    parsed.forEach((item) => {
      if (item.id && item.sentiment) {
        sentimentMap[item.id] = item.sentiment;
      }
    });
    return sentimentMap;
  } catch (error) {
    console.warn("⚠️ Batch sentiment failed, falling back to individual:", error.message);
    // Fallback: classify each individually with heuristic
    const sentimentMap = {};
    validEntries.forEach((e) => {
      sentimentMap[e.id] = fallbackSentiment(e.text);
    });
    return sentimentMap;
  }
}

/**
 * Improved fallback sentiment analysis (100+ words) when API is unavailable.
 * Far better than the original 12-word list.
 */
function fallbackSentiment(text) {
  if (!text) return "Neutral";
  text = text.toLowerCase();

  const positiveWords = [
    "good", "great", "excellent", "amazing", "awesome", "love", "wonderful", "fantastic",
    "superb", "outstanding", "brilliant", "perfect", "impressive", "delighted", "satisfied",
    "happy", "pleased", "enjoy", "best", "terrific", "remarkable", "exceptional", "nice",
    "thank", "thanks", "appreciate", "helpful", "friendly", "quick", "fast", "efficient",
    "smooth", "easy", "convenient", "recommend", "reliable", "professional", "quality",
    "valuable", "beautiful", "elegant", "intuitive", "responsive", "support", "resolved",
    "improved", "upgrade", "positive", "definitely", "absolutely", "exceeded", "favorite",
  ];

  const negativeWords = [
    "bad", "poor", "terrible", "awful", "hate", "issue", "problem", "worst", "horrible",
    "disappointed", "frustrating", "annoying", "broken", "useless", "slow", "delay",
    "delayed", "unacceptable", "failure", "failed", "defective", "damaged", "wrong",
    "error", "bug", "crash", "unresponsive", "rude", "unprofessional", "waste", "refund",
    "complaint", "complain", "difficult", "confusing", "misleading", "expensive", "overpriced",
    "lacking", "missing", "incomplete", "unreliable", "inconsistent", "negative", "never",
    "nowhere", "unfortunately", "regret", "dissatisfied", "unhappy", "angry", "furious",
    "pathetic", "disgusting", "ridiculous", "outrageous", "scam", "fraud", "stolen",
  ];

  let posScore = 0;
  let negScore = 0;

  positiveWords.forEach((word) => {
    const matches = text.match(new RegExp("\\b" + word + "\\b", "gi"));
    if (matches) posScore += matches.length;
  });

  negativeWords.forEach((word) => {
    const matches = text.match(new RegExp("\\b" + word + "\\b", "gi"));
    if (matches) negScore += matches.length;
  });

  // Check for negation patterns that flip sentiment
  const negationPatterns = ["not good", "not great", "not happy", "not satisfied", "don't like", "doesn't work", "didn't work", "can't use", "won't recommend"];
  negationPatterns.forEach((pattern) => {
    if (text.includes(pattern)) {
      posScore = Math.max(0, posScore - 2);
      negScore += 2;
    }
  });

  if (posScore > negScore) return "Positive";
  if (negScore > posScore) return "Negative";
  return "Neutral";
}

// Sentiment cache to avoid re-analyzing same text
const _sentimentCache = new Map();

async function getCachedSentiment(id, text) {
  if (_sentimentCache.has(id)) return _sentimentCache.get(id);
  const sentiment = await classifySentiment(text);
  _sentimentCache.set(id, sentiment);
  return sentiment;
}

// Make functions globally available
window.callOpenAI = callOpenAI;
window.classifySentiment = classifySentiment;
window.batchClassifySentiments = batchClassifySentiments;
window.fallbackSentiment = fallbackSentiment;
window.getCachedSentiment = getCachedSentiment;
window._sentimentCache = _sentimentCache;

console.log("✅ AI Config module loaded — using model:", AI_CONFIG.model);
