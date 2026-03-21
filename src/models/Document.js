import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename:  { type: String, required: true },
  subject:   { type: String, required: true },
  mimetype:  String,
  size:      Number,          // bytes
  chunkIds:  [String],        // ChromaDB vector IDs
  chunkCount:{ type: Number, default: 0 },
  status:    { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  error:     String,
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
