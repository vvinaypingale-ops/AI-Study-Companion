import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(config.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ MongoDB connected:', mongoose.connection.host);
}
