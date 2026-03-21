import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const subjectPerfSchema = new mongoose.Schema({
  subject: String,
  scores:  [Number],   // quiz scores over time
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },

  // Academic profile
  course:    { type: String, default: 'Student' },
  semester:  { type: String, default: '1' },
  cgpa:      { type: Number, default: 0 },
  targetCgpa:{ type: Number, default: 9 },
  subjects:  [String],

  // Exam
  examName: String,
  examDate: Date,

  // Performance
  performance: [subjectPerfSchema],

  // Streak
  streak:         { type: Number, default: 0 },
  streakDays:     [Boolean],
  lastActiveDate: String,

  // Pomodoro stats
  pomSessions: { type: Number, default: 0 },
  pomFocus:    { type: Number, default: 0 },
  pomBreaks:   { type: Number, default: 0 },

  // Counts
  quizCount:  { type: Number, default: 0 },

}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

// Strip password from JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
