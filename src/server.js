import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { connectDB } from './config/database.js';
import { initVectorStore } from './config/vectorstore.js';

// Routes
import authRoutes     from './routes/auth.js';
import userRoutes     from './routes/user.js';
import chatRoutes     from './routes/chat.js';
import quizRoutes     from './routes/quiz.js';
import uploadRoutes   from './routes/upload.js';
import planRoutes     from './routes/plan.js';
import progressRoutes from './routes/progress.js';
import mistakeRoutes  from './routes/mistakes.js';

const app = express();

// ── Security & Middleware ────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please slow down.' }
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'AI rate limit hit, wait a moment.' }
});

app.use('/api/', limiter);
app.use('/api/chat', aiLimiter);
app.use('/api/quiz', aiLimiter);

// ── Health Check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/user',     userRoutes);
app.use('/api/chat',     chatRoutes);
app.use('/api/quiz',     quizRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/plan',     planRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/mistakes', mistakeRoutes);

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Boot ──────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    await initVectorStore();
    app.listen(config.PORT, () => {
      console.log(`\n🧠 EduMind Backend running on http://localhost:${config.PORT}`);
      console.log(`   ENV: ${config.NODE_ENV}`);
      console.log(`   DB:  MongoDB connected`);
      console.log(`   VDB: ChromaDB connected\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
