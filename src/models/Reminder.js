import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:   { type: String, required: true },
  date:    { type: Date, required: true },
  type:    { type: String, enum: ['exam', 'study', 'revision'], default: 'study' },
  subject: String,
  fired:   { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Reminder', reminderSchema);
