import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  q:           String,
  options:     [String],
  answer:      Number,   // index 0–3
  explanation: String,
  topic:       String,
  userAnswer:  { type: Number, default: null },
  correct:     { type: Boolean, default: null },
}, { _id: false });

const quizSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject:    { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  focus:      { type: String, enum: ['general', 'weak', 'exam', 'document'], default: 'general' },
  questions:  [questionSchema],
  score:      { type: Number },        // percentage after submit
  submitted:  { type: Boolean, default: false },
  sourceDocIds: [String],              // vector doc IDs used for RAG
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);
