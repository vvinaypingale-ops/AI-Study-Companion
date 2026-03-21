import express from 'express';
import { protect }    from '../middleware/auth.js';
import { chat }       from '../services/llm.js';
import { retrieve, buildContext } from '../services/rag.js';
import Chat    from '../models/Chat.js';
import Mistake from '../models/Mistake.js';
import User    from '../models/User.js';

const router = express.Router();
router.use(protect);

// ── POST /api/chat ────────────────────────────────────
// Send a message, get AI tutor response (with RAG context)
router.post('/', async (req, res, next) => {
  try {
    const { message, topic, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const user = req.user;

    // 1. Retrieve relevant document chunks (RAG)
    const chunks = await retrieve({
      query:   message,
      userId:  user._id.toString(),
      subject: topic || undefined,
      topK:    5,
    });
    const context = buildContext(chunks);

    // 2. Get recent mistakes for personalization
    const recentMistakes = await Mistake.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('question correct subject topic');
    const mistakeCtx = recentMistakes.length
      ? recentMistakes.map(m => `- [${m.subject}] "${m.question}" → Correct: "${m.correct}"`).join('\n')
      : 'None yet.';

    // 3. Load or create chat session
    let session = sessionId
      ? await Chat.findOne({ _id: sessionId, userId: user._id })
      : null;
    if (!session) {
      session = await Chat.create({ userId: user._id, topic, messages: [] });
    }

    // 4. Build system prompt
    const weak = (user.performance || [])
      .filter(p => (p.scores.slice(-1)[0] || 0) < 55)
      .map(p => p.subject);

    const systemPrompt = `You are EduMind Pro, an expert AI tutor for ${user.name}, a ${user.course} student (Semester ${user.semester}).

STUDENT PROFILE:
- Subjects: ${user.subjects.join(', ')}
- Current CGPA: ${user.cgpa} → Target: ${user.targetCgpa}
- Weak subjects (below 55%): ${weak.join(', ') || 'none'}
- Upcoming exam: ${user.examName || 'not set'} on ${user.examDate ? new Date(user.examDate).toDateString() : 'not set'}
- Current topic: ${topic || 'general'}

STUDENT'S RECENT MISTAKES:
${mistakeCtx}

${context ? `RELEVANT CONTENT FROM STUDENT'S UPLOADED NOTES:\n${context}\n\nUse the above content to answer accurately. Cite sources when relevant.` : ''}

INSTRUCTIONS:
- Be a warm, expert tutor. Use the student's first name occasionally.
- Give numbered step-by-step explanations for problems.
- Use **bold** for key terms. Use code blocks for code.
- Focus extra attention on weak subjects.
- Under 300 words unless solving a detailed problem.
- Always end with encouragement or a follow-up question.`;

    // 5. Build message history (last 12)
    const history = session.messages.slice(-12).map(m => ({
      role: m.role, content: m.content,
    }));
    history.push({ role: 'user', content: message });

    // 6. Call LLM
    const reply = await chat(history, systemPrompt, 1500);

    // 7. Save to session
    session.messages.push({ role: 'user',      content: message, sources: [] });
    session.messages.push({ role: 'assistant', content: reply,   sources: chunks.map(c => c.metadata.docId) });
    if (topic) session.topic = topic;
    await session.save();

    res.json({
      reply,
      sessionId: session._id,
      sourcesUsed: chunks.length,
      sources: chunks.map(c => ({ filename: c.metadata.filename, subject: c.metadata.subject })),
    });
  } catch (err) { next(err); }
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const session = await Chat.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ messages: session.messages });
  } catch (err) { next(err); }
});

// GET /api/chat/sessions
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await Chat.find({ userId: req.user._id })
      .select('topic createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ sessions });
  } catch (err) { next(err); }
});

export default router;
