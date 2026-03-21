import mongoose from 'mongoose';

const mistakeSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question:   { type: String, required: true },
  userAnswer: { type: String, required: true },
  correct:    { type: String, required: true },
  subject:    { type: String, required: true },
  topic:      { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  quizId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  reviewed:   { type: Boolean, default: false },
}, { timestamps: true });

mistakeSchema.index({ userId: 1, subject: 1 });

export default mongoose.model('Mistake', mistakeSchema);
