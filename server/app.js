import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './src/modules/auth/auth.routes.js';
import labsRoutes from './src/modules/labs/labs.routes.js';
import instancesRoutes from './src/modules/instances/instances.routes.js';
import solvesRoutes from './src/modules/solves/solves.routes.js';
import leaderboardRoutes from './src/modules/leaderboard/leaderboard.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import { logger } from './src/config/logger.js';

const app = express();

// Security & Parsing Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
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

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'PETBUG API',
    version: '1.0.0',
    description: 'BugForge-like Web Security Training Platform API',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found (404)' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error({ msg: 'Unhandled error', error: err.message, stack: err.stack });
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'เกิดข้อผิดพลาดภายในระบบ',
  });
});

export default app;
