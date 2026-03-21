import express from 'express';
import { protect }          from '../middleware/auth.js';
import { complete, parseJSON } from '../services/llm.js';
import User from '../models/User.js';

const router = express.Router();
router.use(protect);

// ── POST /api/plan/generate ───────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const user = req.user;

    const weak = (user.performance || [])
      .filter(p => (p.scores.slice(-1)[0] || 0) < 55)
      .map(p => p.subject);

    const scores = (user.performance || []).map(p => {
      const last = p.scores.slice(-1)[0] || 0;
      return `${p.subject}: ${last}%`;
    }).join(', ') || 'No quizzes taken yet';

    const examDate = user.examDate
      ? new Date(user.examDate).toDateString()
      : 'not set';

    const prompt = `Create a detailed 7-day study plan for ${user.name}, a ${user.course} student (Semester ${user.semester}).

Subject performance: ${scores}
Weak subjects (below 55%): ${weak.join(', ') || 'none'}
Upcoming exam: ${user.examName || 'Semester Exam'} on ${examDate}
All subjects: ${user.subjects.join(', ')}

Rules:
- Distribute weak subjects across MORE days
- Include revision sessions before exam
- Make tasks specific and actionable
- Include breaks and self-care tips

Return ONLY valid JSON, no markdown fences:
{
  "days": [
    {
      "day": "Monday",
      "focus": "primary subject for the day",
      "tasks": [
        { "text": "specific task description", "duration": "45 min", "priority": "high" }
      ],
      "tip": "one motivational or study tip for the day"
    }
  ]
}

Generate exactly 7 days (Monday through Sunday). 3–4 tasks per day.`;

    const raw  = await complete(prompt, '', 2000);
    const plan = parseJSON(raw);

    if (!plan.days || plan.days.length === 0) {
      throw new Error('AI returned an empty study plan');
    }

    res.json({ plan });
  } catch (err) { next(err); }
});

// ── POST /api/plan/recommendations ───────────────────
router.post('/recommendations', async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.quizCount || user.quizCount === 0) {
      return res.json({ recommendations: [] });
    }

    const weak = (user.performance || [])
      .filter(p => (p.scores.slice(-1)[0] || 0) < 55)
      .map(p => p.subject);

    const scores = (user.performance || []).map(p => {
      return `${p.subject}: ${(p.scores.slice(-1)[0] || 0)}%`;
    }).join(', ');

    const prompt = `Student: ${user.name}, ${user.course}, Sem ${user.semester}.
Scores: ${scores}
Weak subjects: ${weak.join(', ') || 'none'}
Exam: ${user.examName} on ${user.examDate ? new Date(user.examDate).toDateString() : 'not set'}
Quizzes taken: ${user.quizCount}

Give 4 specific, actionable study recommendations.
Return ONLY valid JSON:
{"recommendations":[{"icon":"emoji","text":"recommendation text","priority":"high or medium or low"}]}`;

    const raw  = await complete(prompt, '', 600);
    const data = parseJSON(raw);

    res.json({ recommendations: data.recommendations || [] });
  } catch (err) { next(err); }
});

export default router;
