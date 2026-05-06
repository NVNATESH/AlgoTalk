import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    logger.info({ uri: env.MONGO_URI.replace(/\/\/[^@]*@/, '//***@') }, 'mongo connected');
  } catch (err) {
    logger.error({ err }, 'mongo connection failed');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongo error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
}
