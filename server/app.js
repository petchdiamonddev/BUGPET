import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';

import authRoutes from './src/modules/auth/auth.routes.js';
import labsRoutes from './src/modules/labs/labs.routes.js';
import instancesRoutes from './src/modules/instances/instances.routes.js';
import solvesRoutes from './src/modules/solves/solves.routes.js';
import leaderboardRoutes from './src/modules/leaderboard/leaderboard.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import { logger } from './src/config/logger.js';
import { AppError } from './src/utils/errors.js';
import { checkDockerHealth } from './src/config/docker.js';
import { prisma } from './src/config/prisma.js';
import { redisClient } from './src/config/redis.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

/**
 * In production the SPA and the API share one origin (Traefik), so CORS is
 * only needed when the frontend is hosted elsewhere. Reflect only the
 * configured origins — never `true`, which would let any site make credentialed
 * requests on a logged-in player's behalf.
 */
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin / curl / server-to-server requests have no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(cookieParser());

// Request logging (skips the noisy polling endpoints)
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path === '/api/health' || req.path === '/api/ready') return;
    logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - started });
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/labs', labsRoutes);
app.use('/api/instances', instancesRoutes);
app.use('/api/solves', solvesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

/**
 * Liveness (process is up) vs readiness (dependencies reachable).
 * The container healthcheck uses readiness; Traefik/UI use liveness.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptimeSec: Math.round(process.uptime()) });
});

app.get('/api/ready', async (req, res) => {
  const checks = { database: false, redis: false, docker: false };

  await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`.then(() => {
      checks.database = true;
    }),
    redisClient
      .ping()
      .then(() => {
        checks.redis = true;
      })
      .catch(() => {}),
    checkDockerHealth().then((healthy) => {
      checks.docker = healthy;
    }),
  ]);

  const ready = checks.database && checks.redis;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', checks });
});

app.get('/', (req, res) => {
  res.json({ name: 'PETBUG API', version: '1.1.0' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'ไม่พบ endpoint นี้' });
});

// Global error handler → stable JSON contract
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      ...err.extra,
    });
  }

  // Legacy errors that only set `status`
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      code: err.code || 'REQUEST_ERROR',
      message: err.message,
      ...(err.extra ?? {}),
    });
  }

  logger.error({ msg: 'Unhandled error', error: err.message, stack: err.stack, url: req.originalUrl });
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'เกิดข้อผิดพลาดภายในระบบ' : err.message,
  });
});

export default app;
