import express from 'express';
import { protect } from '../middleware/auth.js';
import User    from '../models/User.js';
import Quiz    from '../models/Quiz.js';
import Mistake from '../models/Mistake.js';

const router = express.Router();
router.use(protect);

// GET /api/progress ─────────────────────────────────
// Full progress summary for the dashboard
router.get('/', async (req, res, next) => {
  try {
    const user = req.user;

    // Subject performance
    const subjectStats = (user.performance || []).map(p => {
      const scores = p.scores || [];
      const latest = scores.slice(-1)[0] || 0;
      const avg    = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const trend  = scores.length > 1
        ? scores[scores.length - 1] - scores[scores.length - 2]
        : 0;
      return {
        subject: p.subject,
        scores,
        latest,
        avg,
        trend,
        status: latest < 50 ? 'weak' : latest < 75 ? 'improving' : 'strong',
      };
    });

    // Overall avg score
    const allScores = subjectStats.flatMap(s => s.scores);
    const overallAvg = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    // Mistake counts per subject
    const mistakeCounts = await Mistake.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
    ]);

    // Exam countdown
    let daysToExam = null;
    if (user.examDate) {
      daysToExam = Math.ceil((new Date(user.examDate) - new Date()) / 86400000);
    }

    res.json({
      subjectStats,
      overallAvg,
      quizCount:     user.quizCount   || 0,
      streak:        user.streak      || 0,
      streakDays:    user.streakDays  || [],
      mistakeTotal:  mistakeCounts.reduce((a, b) => a + b.count, 0),
      mistakeCounts: Object.fromEntries(mistakeCounts.map(m => [m._id, m.count])),
      pomSessions:   user.pomSessions || 0,
      pomFocus:      user.pomFocus    || 0,
      daysToExam,
      examName:      user.examName,
    });
  } catch (err) { next(err); }
});

// PATCH /api/progress/streak ──────────────────────────
// Mark today as active (called after completing a quiz)
router.patch('/streak', async (req, res, next) => {
  try {
    const user  = await User.findById(req.user._id);
    const today = new Date().toDateString();

    if (user.lastActiveDate !== today) {
      user.streakDays = user.streakDays || [];
      if (user.streakDays.length >= 30) user.streakDays.shift();
      user.streakDays.push(true);
      user.streak        = user.streakDays.filter(Boolean).length;
      user.lastActiveDate = today;
      await user.save();
    }

    res.json({ streak: user.streak, streakDays: user.streakDays });
  } catch (err) { next(err); }
});

// PATCH /api/progress/pomodoro ────────────────────────
// Save completed pomodoro session
router.patch('/pomodoro', async (req, res, next) => {
  try {
    const { type } = req.body; // 'focus' | 'break'
    const user = await User.findById(req.user._id);

    if (type === 'focus') {
      user.pomSessions = (user.pomSessions || 0) + 1;
      user.pomFocus    = (user.pomFocus    || 0) + 25;
    } else {
      user.pomBreaks = (user.pomBreaks || 0) + 1;
    }
    await user.save();

    res.json({
      pomSessions: user.pomSessions,
      pomFocus:    user.pomFocus,
      pomBreaks:   user.pomBreaks,
    });
  } catch (err) { next(err); }
});

export default router;
