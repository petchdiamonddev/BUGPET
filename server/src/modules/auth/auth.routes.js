import { Router } from 'express';
import { z } from 'zod';
import authController from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

const credentialsSchema = {
  body: z.object({
    username: z.string().min(3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'),
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
  }),
};

const loginSchema = {
  body: z.object({
    identifier: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1, 'ต้องระบุรหัสผ่าน'),
  }),
};

router.post('/register', registerLimiter, validate(credentialsSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.me);
router.patch(
  '/me',
  authenticate,
  validate({ body: z.object({ bio: z.string().max(280).nullable().optional() }) }),
  authController.updateProfile
);
router.post(
  '/me/password',
  authenticate,
  validate({
    body: z.object({
      currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
      newPassword: z.string().min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'),
    }),
  }),
  authController.changePassword
);

export default router;
