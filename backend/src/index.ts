import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env, isProd } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middleware/error.js';
import { generalLimiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';
import { startSyncScheduler, stopSyncScheduler } from './services/syncScheduler.js';
import { attachYjsServer } from './yjs/yjsServer.js';
import { attachVoiceServer } from './voice/voiceServer.js';
import { attachNotifyServer } from './notify/notifyServer.js';

async function bootstrap() {
  await connectDB();

  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');
  const allowedOrigins = new Set([normalizeOrigin(env.CLIENT_URL)]);

  const isAllowedOrigin = (origin?: string | null) => {
    if (!origin) return true; // non-browser clients (curl, server-to-server)
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.has(normalized)) return true;
    if (!isProd) {
      if (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:')) {
        return true;
      }
    }
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin ?? 'unknown'}`));
      },
      credentials: true,
    })
  );
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!isProd) app.use(morgan('dev'));
  app.use(generalLimiter);

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  // Wrap Express in our own http.Server so we can attach the Yjs WS upgrade handler
  const server = http.createServer(app);
  attachYjsServer(server);
  attachVoiceServer(server);
  attachNotifyServer(server);

  server.listen(env.PORT, () => {
    logger.info(`🚀 AlgoTalk API listening on http://localhost:${env.PORT}`);
    logger.info(`   CORS origin: ${env.CLIENT_URL}`);
    logger.info(`   Email driver: ${env.EMAIL_PROVIDER}`);
  });

  // Background extractor sync scheduler
  startSyncScheduler();
  process.on('SIGTERM', stopSyncScheduler);
  process.on('SIGINT', stopSyncScheduler);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'fatal bootstrap error');
  process.exit(1);
});
