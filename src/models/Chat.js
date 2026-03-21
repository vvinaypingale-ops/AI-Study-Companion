import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [String],   // doc chunk IDs retrieved via RAG
}, { timestamps: true, _id: false });

const chatSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic:   String,              // active subject topic
  messages:[messageSchema],
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
