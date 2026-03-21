import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV:    process.env.NODE_ENV     || 'development',
  PORT:        process.env.PORT         || 5000,
  CORS_ORIGIN: process.env.CORS_ORIGIN  || 'http://localhost:3000',

  // MongoDB
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/edumind',

  // JWT
  JWT_SECRET:  process.env.JWT_SECRET  || 'change-this-secret-in-production',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',

  // LLM — choose one: 'gemini' | 'openai' | 'ollama'
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_MODEL:    process.env.OLLAMA_MODEL    || 'llama3',

  // Embeddings
  EMBED_PROVIDER: process.env.EMBED_PROVIDER || 'gemini', // 'gemini' | 'openai' | 'ollama'

  // ChromaDB (Vector Store)
  CHROMA_URL:        process.env.CHROMA_URL        || 'http://localhost:8000',
  CHROMA_COLLECTION: process.env.CHROMA_COLLECTION || 'edumind_docs',

  // File Upload
  UPLOAD_DIR:      process.env.UPLOAD_DIR      || './uploads',
  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB || 20,
};

// Validate critical keys
const required = ['JWT_SECRET'];
required.forEach(key => {
  if (!config[key]) {
    console.warn(`⚠️  Missing env var: ${key}`);
  }
});
