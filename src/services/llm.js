/**
 * LLM Service
 * Supports: Gemini (free) | OpenAI | Ollama (local)
 * Switch via LLM_PROVIDER env var
 */
import { config } from '../config/env.js';

// ── Gemini ────────────────────────────────────────────
async function callGemini(prompt, systemPrompt = '', maxTokens = 1500) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: 'user',  parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini error: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

// ── Gemini Chat (multi-turn) ─────────────────────────
async function callGeminiChat(messages, systemPrompt = '', maxTokens = 1500) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: 'user',  parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }

  messages.forEach(m => {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini error: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

// ── OpenAI ────────────────────────────────────────────
async function callOpenAI(messages, systemPrompt = '', maxTokens = 1500) {
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
  allMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: allMessages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI error: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Ollama (local) ────────────────────────────────────
async function callOllama(messages, systemPrompt = '', maxTokens = 1500) {
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
  allMessages.push(...messages);

  const res = await fetch(`${config.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.OLLAMA_MODEL,
      messages: allMessages,
      stream: false,
      options: { num_predict: maxTokens },
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
  const data = await res.json();
  return data.message?.content || '';
}

// ── Public API ────────────────────────────────────────
/**
 * Generate a single completion (for quiz/plan/recommendations)
 */
export async function complete(prompt, systemPrompt = '', maxTokens = 1500) {
  switch (config.LLM_PROVIDER) {
    case 'gemini':
      return callGemini(prompt, systemPrompt, maxTokens);
    case 'openai':
      return callOpenAI([{ role: 'user', content: prompt }], systemPrompt, maxTokens);
    case 'ollama':
      return callOllama([{ role: 'user', content: prompt }], systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }
}

/**
 * Multi-turn chat completion
 * messages = [{ role: 'user'|'assistant', content: '...' }]
 */
export async function chat(messages, systemPrompt = '', maxTokens = 1500) {
  switch (config.LLM_PROVIDER) {
    case 'gemini':
      return callGeminiChat(messages, systemPrompt, maxTokens);
    case 'openai':
      return callOpenAI(messages, systemPrompt, maxTokens);
    case 'ollama':
      return callOllama(messages, systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }
}

/**
 * Parse JSON safely from LLM output (strips markdown fences)
 */
export function parseJSON(raw) {
  const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in LLM response');
  return JSON.parse(clean.slice(start, end + 1));
}
