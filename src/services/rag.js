/**
 * RAG Service
 * ─────────────────────────────────────────────────────
 * Handles:
 *  1. Document chunking
 *  2. Embedding + storing in ChromaDB
 *  3. Semantic retrieval for chat/quiz
 */
import { v4 as uuid } from 'uuid';
import { getCollection } from '../config/vectorstore.js';
import { embed, embedOne } from './embeddings.js';

// ── 1. Chunking ───────────────────────────────────────
const CHUNK_SIZE    = 500;   // characters per chunk
const CHUNK_OVERLAP = 80;    // overlap between chunks

/**
 * Split text into overlapping chunks
 */
export function chunkText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 50); // skip tiny fragments
}

// ── 2. Ingest Document ────────────────────────────────
/**
 * Ingest a document into ChromaDB
 * @param {Object} opts
 * @param {string}   opts.text       - Full extracted text
 * @param {string}   opts.userId     - Owner
 * @param {string}   opts.subject    - e.g. "DBMS"
 * @param {string}   opts.docId      - MongoDB Document._id
 * @param {string}   opts.filename
 * @returns {string[]} chunkIds stored in Chroma
 */
export async function ingestDocument({ text, userId, subject, docId, filename }) {
  const collection = getCollection();
  const chunks     = chunkText(text);

  if (chunks.length === 0) throw new Error('No text content to ingest');

  // Batch embed all chunks
  const embeddings = await embed(chunks);

  const ids       = chunks.map(() => uuid());
  const metadatas = chunks.map((_, i) => ({
    userId,
    subject,
    docId,
    filename,
    chunkIndex: i,
  }));

  // Upsert into ChromaDB
  await collection.upsert({
    ids,
    embeddings,
    documents: chunks,
    metadatas,
  });

  console.log(`📥 Ingested ${chunks.length} chunks for doc "${filename}" (${subject})`);
  return ids;
}

// ── 3. Retrieve Relevant Chunks ───────────────────────
/**
 * Retrieve top-k relevant chunks for a query
 * @param {Object} opts
 * @param {string}   opts.query       - User question or topic
 * @param {string}   opts.userId      - Filter to this user only
 * @param {string}   [opts.subject]   - Optional subject filter
 * @param {number}   [opts.topK=5]    - How many chunks to return
 * @returns {{ text: string, metadata: object, distance: number }[]}
 */
export async function retrieve({ query, userId, subject, topK = 5 }) {
  const collection = getCollection();

  // Build where filter
  const where = { userId: { $eq: userId } };
  if (subject) where.subject = { $eq: subject };

  const queryEmbedding = await embedOne(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    where,
    include: ['documents', 'metadatas', 'distances'],
  });

  if (!results.documents?.[0]?.length) return [];

  return results.documents[0].map((doc, i) => ({
    text:     doc,
    metadata: results.metadatas[0][i],
    distance: results.distances[0][i],
  }));
}

// ── 4. Build Context String ───────────────────────────
/**
 * Format retrieved chunks into a context block for the LLM prompt
 */
export function buildContext(chunks) {
  if (!chunks.length) return '';
  return chunks
    .map((c, i) => `[Source ${i + 1} — ${c.metadata.filename}, ${c.metadata.subject}]\n${c.text}`)
    .join('\n\n---\n\n');
}

// ── 5. Delete by Document ─────────────────────────────
/**
 * Remove all chunks belonging to a document
 */
export async function deleteDocChunks(chunkIds) {
  if (!chunkIds?.length) return;
  const collection = getCollection();
  await collection.delete({ ids: chunkIds });
  console.log(`🗑️  Deleted ${chunkIds.length} chunks`);
}
