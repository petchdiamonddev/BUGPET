import { Router } from 'express';
import { z } from 'zod';
import authController from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

const updateProfileSchema = {
  body: z.object({
    bio: z.string().max(280, 'คำอธิบาย Bio ต้องไม่เกิน 280 ตัวอักษร').nullable().optional(),
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: z.string().min(8, 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร'),
  }),
};

// Public Routes พร้อม Rate Limiter
router.post('/register', registerLimiter, (req, res) => authController.register(req, res));
router.post('/login', loginLimiter, (req, res) => authController.login(req, res));
router.post('/refresh', refreshLimiter, (req, res) => authController.refreshToken(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected Routes (ต้องยืนยันตัวตน)
router.get('/me', authenticate, (req, res) => authController.me(req, res));
router.patch('/me', authenticate, validate(updateProfileSchema), (req, res) =>
  authController.updateProfile(req, res)
);
router.post('/me/password', authenticate, validate(changePasswordSchema), (req, res) =>
  authController.changePassword(req, res)
);

export default router;
