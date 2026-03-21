import express from 'express';
import { protect }          from '../middleware/auth.js';
import { chat }             from '../services/llm.js';
import { retrieve, buildContext } from '../services/rag.js';
import Mistake from '../models/Mistake.js';

const router = express.Router();
router.use(protect);

// GET /api/mistakes ────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { subject, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (subject && subject !== 'all') filter.subject = subject;

    const mistakes = await Mistake.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ mistakes, total: mistakes.length });
  } catch (err) { next(err); }
});

// PATCH /api/mistakes/:id/reviewed ────────────────────
router.patch('/:id/reviewed', async (req, res, next) => {
  try {
    const mistake = await Mistake.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { reviewed: true },
      { new: true }
    );
    if (!mistake) return res.status(404).json({ error: 'Mistake not found' });
    res.json({ mistake });
  } catch (err) { next(err); }
});

// DELETE /api/mistakes/:id ────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await Mistake.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Mistake deleted' });
  } catch (err) { next(err); }
});

// POST /api/mistakes/revise ───────────────────────────
// Ask AI to explain all recent mistakes (RAG-enhanced)
router.post('/revise', async (req, res, next) => {
  try {
    const { subject } = req.body;
    const user = req.user;

    const filter = { userId: user._id, reviewed: false };
    if (subject) filter.subject = subject;

    const mistakes = await Mistake.find(filter)
      .sort({ createdAt: -1 })
      .limit(6);

    if (!mistakes.length) {
      return res.json({ reply: "You haven't logged any mistakes yet! Take a quiz first." });
    }

    const mistakeText = mistakes.map((m, i) =>
      `${i + 1}. [${m.subject}${m.topic ? ' — ' + m.topic : ''}]\n   Q: "${m.question}"\n   Your answer: "${m.userAnswer}"\n   Correct: "${m.correct}"`
    ).join('\n\n');

    // RAG: retrieve relevant notes for context
    const chunks  = await retrieve({
      query:  mistakes.map(m => m.question).join(' '),
      userId: user._id.toString(),
      topK:   4,
    });
    const context = buildContext(chunks);

    const systemPrompt = `You are EduMind Pro, a patient expert tutor for ${user.name}, a ${user.course} student.
Your job: Explain WHY each answer was wrong and WHY the correct answer is right.
Be encouraging. Use **bold** for key terms. Give memory tips where possible.
${context ? `\nUse this content from the student's notes to support your explanations:\n${context}` : ''}`;

    const userMessage = `Please explain my recent mistakes clearly so I can understand and avoid them in the exam:\n\n${mistakeText}`;

    const reply = await chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      2000
    );

    // Mark as reviewed
    const ids = mistakes.map(m => m._id);
    await Mistake.updateMany({ _id: { $in: ids } }, { reviewed: true });

    res.json({ reply, count: mistakes.length });
  } catch (err) { next(err); }
});

export default router;
