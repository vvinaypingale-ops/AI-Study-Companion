import express from 'express';
import { protect }    from '../middleware/auth.js';
import { complete, parseJSON } from '../services/llm.js';
import { retrieve, buildContext } from '../services/rag.js';
import Quiz    from '../models/Quiz.js';
import Mistake from '../models/Mistake.js';
import User    from '../models/User.js';

const router = express.Router();
router.use(protect);

// ── POST /api/quiz/generate ───────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const { subject, difficulty = 'medium', count = 5, focus = 'general' } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject is required' });

    const user = req.user;

    // 1. RAG — retrieve document chunks for this subject
    const ragQuery = `${subject} key concepts questions exam`;
    const chunks   = await retrieve({
      query:   ragQuery,
      userId:  user._id.toString(),
      subject,
      topK:    6,
    });
    const context = buildContext(chunks);

    // 2. Build focus context
    let focusCtx = '';
    if (focus === 'weak') {
      const mistakes = await Mistake.find({ userId: user._id, subject })
        .sort({ createdAt: -1 }).limit(8).select('topic question');
      if (mistakes.length) {
        focusCtx = `The student previously got these wrong — focus on these topics: ${mistakes.map(m => m.topic || m.question.slice(0, 60)).join(' | ')}`;
      }
    } else if (focus === 'exam') {
      focusCtx = `Focus on high-probability exam questions for ${user.examName || 'upcoming exam'}.`;
    } else if (focus === 'document') {
      focusCtx = 'Generate questions ONLY from the provided document content below.';
    }

    // 3. Build prompt
    const prompt = `Create a ${count}-question ${difficulty} multiple choice quiz on "${subject}" for a ${user.course} student (Semester ${user.semester}).

${focusCtx}

${context ? `STUDENT'S UPLOADED NOTES (use this content for questions):\n${context}\n` : ''}

Return ONLY a valid JSON object, no markdown fences:
{"questions":[{"q":"full question","options":["A","B","C","D"],"answer":0,"explanation":"why this is correct","topic":"subtopic name"}]}

Rules:
- "answer" is the index (0–3) of the correct option
- All 4 options must be plausible
- Test real understanding, not just memory
- Explanation must be clear and educational`;

    const raw     = await complete(prompt, '', 2000);
    const parsed  = parseJSON(raw);
    const questions = parsed.questions || [];

    if (!questions.length) throw new Error('AI returned no questions');

    // 4. Save quiz to DB
    const quiz = await Quiz.create({
      userId:       user._id,
      subject,
      difficulty,
      focus,
      questions,
      sourceDocIds: chunks.map(c => c.metadata.docId),
    });

    res.json({ quizId: quiz._id, questions, sourcesUsed: chunks.length });
  } catch (err) { next(err); }
});

// ── POST /api/quiz/:id/submit ─────────────────────────
router.post('/:id/submit', async (req, res, next) => {
  try {
    const { answers } = req.body;  // [{ questionIndex, selectedOption }]
    if (!answers) return res.status(400).json({ error: 'answers are required' });

    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.submitted) return res.status(400).json({ error: 'Quiz already submitted' });

    let correct = 0;
    const mistakes = [];

    answers.forEach(({ questionIndex, selectedOption }) => {
      const q = quiz.questions[questionIndex];
      if (!q) return;
      q.userAnswer = selectedOption;
      if (selectedOption === q.answer) {
        q.correct = true;
        correct++;
      } else {
        q.correct = false;
        mistakes.push({
          userId:     req.user._id,
          quizId:     quiz._id,
          question:   q.q,
          userAnswer: q.options[selectedOption] || '—',
          correct:    q.options[q.answer],
          subject:    quiz.subject,
          topic:      q.topic,
          difficulty: quiz.difficulty,
        });
      }
    });

    const pct = Math.round((correct / answers.length) * 100);
    quiz.score     = pct;
    quiz.submitted = true;
    await quiz.save();

    // Save mistakes
    if (mistakes.length) await Mistake.insertMany(mistakes);

    // Update user performance
    const user = await User.findById(req.user._id);
    let perfEntry = user.performance.find(p => p.subject === quiz.subject);
    if (perfEntry) {
      perfEntry.scores.push(pct);
    } else {
      user.performance.push({ subject: quiz.subject, scores: [pct] });
    }
    user.quizCount = (user.quizCount || 0) + 1;

    // Streak update
    const today = new Date().toDateString();
    if (user.lastActiveDate !== today) {
      user.streakDays = user.streakDays || [];
      if (user.streakDays.length >= 30) user.streakDays.shift();
      user.streakDays.push(true);
      user.streak = user.streakDays.filter(Boolean).length;
      user.lastActiveDate = today;
    }
    await user.save();

    res.json({
      score:      pct,
      correct,
      total:      answers.length,
      mistakes:   mistakes.length,
      questions:  quiz.questions,
    });
  } catch (err) { next(err); }
});

// GET /api/quiz/history
router.get('/history', async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user._id, submitted: true })
      .select('subject difficulty score createdAt')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ quizzes });
  } catch (err) { next(err); }
});

// GET /api/quiz/:id
router.get('/:id', async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (err) { next(err); }
});

export default router;
