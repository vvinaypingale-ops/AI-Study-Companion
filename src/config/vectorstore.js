import { ChromaClient } from 'chromadb';
import { config } from './env.js';

let client = null;
let collection = null;

export async function initVectorStore() {
  client = new ChromaClient({ path: config.CHROMA_URL });

  // Heartbeat check
  await client.heartbeat();

  // Get or create the collection
  collection = await client.getOrCreateCollection({
    name: config.CHROMA_COLLECTION,
    metadata: { description: 'EduMind student document embeddings' },
  });

  console.log(`✅ ChromaDB connected — collection: "${config.CHROMA_COLLECTION}"`);
  return collection;
}

export function getCollection() {
  if (!collection) throw new Error('Vector store not initialized. Call initVectorStore() first.');
  return collection;
}

export function getClient() {
  if (!client) throw new Error('ChromaDB client not initialized.');
  return client;
}
