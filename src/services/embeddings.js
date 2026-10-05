/**
 * Embedding Service
 * Converts text → float vectors for ChromaDB
 * Supports: Gemini | OpenAI | Ollama
 */
import { config } from '../config/env.js';

function generateFallbackEmbedding(text, dim = 384) {
  const vec = new Array(dim).fill(0);
  const words = (text || '').toLowerCase().match(/\w+/g) || [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let h = 0;
    for (let c = 0; c < w.length; c++) {
      h = (h << 5) - h + w.charCodeAt(c);
      h |= 0;
    }
    const idx = Math.abs(h) % dim;
    vec[idx] += 1;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return vec.map(v => v / norm);
}

// ── Gemini Embeddings ─────────────────────────────────
async function embedGemini(texts) {
  if (!config.GEMINI_API_KEY) {
    return texts.map(t => generateFallbackEmbedding(t));
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${config.GEMINI_API_KEY}`;

  const requests = texts.map(text => ({
    model: 'models/text-embedding-004',
    content: { parts: [{ text }] },
  }));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`⚠️ Gemini embedding failed (${err.error?.message || res.statusText}). Using local embedding fallback.`);
      return texts.map(t => generateFallbackEmbedding(t));
    }
    const data = await res.json();
    return data.embeddings.map(e => e.values);
  } catch (err) {
    console.warn(`⚠️ Gemini embedding error: ${err.message}. Using local embedding fallback.`);
    return texts.map(t => generateFallbackEmbedding(t));
  }
}

// ── OpenAI Embeddings ─────────────────────────────────
async function embedOpenAI(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI embed error: ${err.error?.message}`);
  }
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// ── Ollama Embeddings ─────────────────────────────────
async function embedOllama(texts) {
  const embeddings = [];
  for (const text of texts) {
    const res = await fetch(`${config.OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.OLLAMA_MODEL, prompt: text }),
    });
    if (!res.ok) throw new Error(`Ollama embed error: ${res.statusText}`);
    const data = await res.json();
    embeddings.push(data.embedding);
  }
  return embeddings;
}

// ── Public API ────────────────────────────────────────
/**
 * Embed an array of texts → array of float arrays
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embed(texts) {
  if (!texts || texts.length === 0) return [];
  switch (config.EMBED_PROVIDER) {
    case 'gemini': return embedGemini(texts);
    case 'openai': return embedOpenAI(texts);
    case 'ollama': return embedOllama(texts);
    default: throw new Error(`Unknown EMBED_PROVIDER: ${config.EMBED_PROVIDER}`);
  }
}

/**
 * Embed a single text → float array
 */
export async function embedOne(text) {
  const results = await embed([text]);
  return results[0];
}
