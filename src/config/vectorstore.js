import { ChromaClient } from 'chromadb';
import { config } from './env.js';

let client = null;
let collection = null;

function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

class EmbeddedVectorCollection {
  constructor(name) {
    this.name = name;
    this.items = []; // array of { id, embedding, document, metadata }
  }

  async upsert({ ids = [], embeddings = [], documents = [], metadatas = [] }) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const entry = {
        id,
        embedding: embeddings[i] || [],
        document: documents[i] || '',
        metadata: metadatas[i] || {},
      };
      const idx = this.items.findIndex(item => item.id === id);
      if (idx >= 0) {
        this.items[idx] = entry;
      } else {
        this.items.push(entry);
      }
    }
  }

  async query({ queryEmbeddings = [[]], nResults = 5, where = {} }) {
    const targetVec = queryEmbeddings[0] || [];
    let candidates = this.items;

    if (where && Object.keys(where).length > 0) {
      candidates = candidates.filter(item => {
        for (const [key, expected] of Object.entries(where)) {
          const expectedVal = expected && typeof expected === 'object' && '$eq' in expected ? expected.$eq : expected;
          if (expectedVal !== undefined && item.metadata[key] !== expectedVal) {
            return false;
          }
        }
        return true;
      });
    }

    const scored = candidates.map(item => {
      const sim = cosineSimilarity(targetVec, item.embedding);
      return {
        id: item.id,
        document: item.document,
        metadata: item.metadata,
        distance: Math.max(0, 1 - sim),
      };
    });

    scored.sort((a, b) => a.distance - b.distance);
    const top = scored.slice(0, nResults);

    return {
      ids: [top.map(t => t.id)],
      documents: [top.map(t => t.document)],
      metadatas: [top.map(t => t.metadata)],
      distances: [top.map(t => t.distance)],
    };
  }

  async delete({ ids = [], where = {} }) {
    if (ids && ids.length > 0) {
      const idSet = new Set(ids);
      this.items = this.items.filter(item => !idSet.has(item.id));
    }
    if (where && Object.keys(where).length > 0) {
      this.items = this.items.filter(item => {
        for (const [key, expected] of Object.entries(where)) {
          const expectedVal = expected && typeof expected === 'object' && '$eq' in expected ? expected.$eq : expected;
          if (expectedVal !== undefined && item.metadata[key] === expectedVal) {
            return false;
          }
        }
        return true;
      });
    }
  }
}

export async function initVectorStore() {
  try {
    client = new ChromaClient({ path: config.CHROMA_URL });
    await client.heartbeat();
    collection = await client.getOrCreateCollection({
      name: config.CHROMA_COLLECTION,
      metadata: { description: 'EduMind student document embeddings' },
    });
    console.log(`✅ ChromaDB connected — collection: "${config.CHROMA_COLLECTION}"`);
    return collection;
  } catch (err) {
    console.warn(`⚠️ ChromaDB not reachable at ${config.CHROMA_URL} (${err.message}).`);
    console.log(`📦 Using embedded in-memory vector store for collection: "${config.CHROMA_COLLECTION}"`);
    collection = new EmbeddedVectorCollection(config.CHROMA_COLLECTION);
    return collection;
  }
}

export function getCollection() {
  if (!collection) throw new Error('Vector store not initialized. Call initVectorStore() first.');
  return collection;
}

export function getClient() {
  return client;
}

