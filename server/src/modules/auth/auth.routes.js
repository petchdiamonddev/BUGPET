import { Router } from 'express';
import authController from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// Public Routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', loginLimiter, (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected Route (ต้องแนบ Bearer Token)
router.get('/me', authenticate, (req, res) => authController.me(req, res));

export default router;
