import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';

import { swaggerDocument } from './src/config/swagger.js';
import authRoutes from './src/modules/auth/auth.routes.js';
import labsRoutes from './src/modules/labs/labs.routes.js';
import solvesRoutes from './src/modules/solves/solves.routes.js';
import leaderboardRoutes from './src/modules/leaderboard/leaderboard.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import { AppError } from './src/utils/errors.js';
import { logger } from './src/config/logger.js';

const app = express();

app.disable('x-powered-by');

// Allowed Origins สำหรับ CORS
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('ไม่อนุญาตโดยนโยบาย CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(cookieParser());

// Swagger UI สำหรับ Dev & API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'BUGPET API',
    version: '1.0.0',
    status: 'ok',
    docs: '/api-docs',
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptimeSec: Math.round(process.uptime()) });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/labs', labsRoutes);
app.use('/api/solves', solvesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'ไม่พบเส้นทาง API (404 Not Found)' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง',
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
