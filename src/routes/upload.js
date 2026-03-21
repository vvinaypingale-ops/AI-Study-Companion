import express from 'express';
import multer  from 'multer';
import path    from 'path';
import fs      from 'fs';
import { protect }          from '../middleware/auth.js';
import { extractText }      from '../services/parser.js';
import { ingestDocument, deleteDocChunks } from '../services/rag.js';
import Document from '../models/Document.js';
import { config } from '../config/env.js';

const router = express.Router();
router.use(protect);

// ── Multer config ─────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(config.UPLOAD_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, TXT and MD files are allowed'));
  },
});

// ── POST /api/upload ──────────────────────────────────
// Upload a study document → extract text → embed → store in ChromaDB
router.post('/', upload.single('file'), async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { subject } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    // 1. Create DB record (status: processing)
    const doc = await Document.create({
      userId:   req.user._id,
      filename: req.file.originalname,
      subject,
      mimetype: req.file.mimetype,
      size:     req.file.size,
      status:   'processing',
    });

    // 2. Extract text
    const text = await extractText(filePath, req.file.mimetype);
    if (!text || text.trim().length < 50) {
      await doc.deleteOne();
      return res.status(422).json({ error: 'Could not extract meaningful text from the file' });
    }

    // 3. Ingest into ChromaDB (chunk + embed + store)
    const chunkIds = await ingestDocument({
      text,
      userId:   req.user._id.toString(),
      subject,
      docId:    doc._id.toString(),
      filename: req.file.originalname,
    });

    // 4. Update doc record
    doc.chunkIds   = chunkIds;
    doc.chunkCount = chunkIds.length;
    doc.status     = 'ready';
    await doc.save();

    // 5. Clean up temp file
    fs.unlinkSync(filePath);

    res.status(201).json({
      message:    'Document uploaded and indexed successfully',
      documentId: doc._id,
      filename:   doc.filename,
      subject:    doc.subject,
      chunks:     chunkIds.length,
    });
  } catch (err) {
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(err);
  }
});

// ── GET /api/upload ───────────────────────────────────
// List all documents for the user
router.get('/', async (req, res, next) => {
  try {
    const docs = await Document.find({ userId: req.user._id })
      .select('filename subject size chunkCount status createdAt')
      .sort({ createdAt: -1 });
    res.json({ documents: docs });
  } catch (err) { next(err); }
});

// ── DELETE /api/upload/:id ────────────────────────────
// Delete a document and its vector chunks
router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Remove from ChromaDB
    await deleteDocChunks(doc.chunkIds);

    // Remove from MongoDB
    await doc.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) { next(err); }
});

export default router;
