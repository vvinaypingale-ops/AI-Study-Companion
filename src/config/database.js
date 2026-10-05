import mongoose from 'mongoose';
import { config } from './env.js';

let mongodInstance = null;

export async function connectDB() {
  mongoose.set('strictQuery', false);

  try {
    // Try connecting to configured MongoDB (e.g. local or Atlas)
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log('✅ MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.warn(`⚠️ Could not connect to MongoDB at ${config.MONGO_URI} (${err.message}).`);
    console.log('🚀 Starting embedded In-Memory MongoDB server for zero-config local run...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log('✅ Embedded In-Memory MongoDB connected successfully at:', memoryUri);
    } catch (memErr) {
      console.error('❌ Failed to start embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
}

