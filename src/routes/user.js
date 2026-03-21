import express from 'express';
import { protect } from '../middleware/auth.js';
import User     from '../models/User.js';
import Reminder from '../models/Reminder.js';

const router = express.Router();
router.use(protect);

// ── Profile ────────────────────────────────────────────

// GET /api/user/profile
router.get('/profile', (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/user/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const allowed = ['name', 'course', 'semester', 'cgpa', 'targetCgpa', 'subjects', 'examName', 'examDate'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
});

// ── Notes ──────────────────────────────────────────────
// Notes are stored inline on the User document as a simple array

// GET /api/user/notes
router.get('/notes', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notes');
    res.json({ notes: user.notes || [] });
  } catch (err) { next(err); }
});

// POST /api/user/notes
router.post('/notes', async (req, res, next) => {
  try {
    const { title, body, subject } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const note = { title, body: body || '', subject: subject || '', createdAt: new Date() };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { notes: { $each: [note], $position: 0 } },
    });

    res.status(201).json({ note });
  } catch (err) { next(err); }
});

// DELETE /api/user/notes/:index
router.delete('/notes/:index', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notes');
    const idx  = parseInt(req.params.index);
    if (idx < 0 || idx >= (user.notes || []).length) {
      return res.status(404).json({ error: 'Note not found' });
    }
    user.notes.splice(idx, 1);
    await user.save();
    res.json({ message: 'Note deleted' });
  } catch (err) { next(err); }
});

// ── Tasks (Study Plan task state) ─────────────────────

// PATCH /api/user/tasks
router.patch('/tasks', async (req, res, next) => {
  try {
    const { tasks } = req.body; // full tasks object { Monday: [...], ... }
    await User.findByIdAndUpdate(req.user._id, { tasks });
    res.json({ message: 'Tasks saved' });
  } catch (err) { next(err); }
});

// ── Reminders ──────────────────────────────────────────

// GET /api/user/reminders
router.get('/reminders', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id }).sort({ date: 1 });
    res.json({ reminders });
  } catch (err) { next(err); }
});

// POST /api/user/reminders
router.post('/reminders', async (req, res, next) => {
  try {
    const { title, date, type, subject } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date required' });

    const reminder = await Reminder.create({
      userId: req.user._id, title, date, type: type || 'study', subject,
    });
    res.status(201).json({ reminder });
  } catch (err) { next(err); }
});

// DELETE /api/user/reminders/:id
router.delete('/reminders/:id', async (req, res, next) => {
  try {
    await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Reminder deleted' });
  } catch (err) { next(err); }
});

export default router;
