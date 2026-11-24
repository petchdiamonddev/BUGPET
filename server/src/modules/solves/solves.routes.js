import { Router } from 'express';
import solvesController from './solves.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { submitFlagSchema } from '../labs/labs.validation.js';
import { submitFlagLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

// ส่ง Flag คำตอบ (จำกัด Rate Limit 10 ครั้ง/นาที ป้องกัน Brute-force)
router.post(
  '/labs/:labId/submit',
  submitFlagLimiter,
  validate(submitFlagSchema),
  (req, res) => solvesController.submitFlag(req, res)
);

// ดึงประวัติการแก้โจทย์ของผู้ใช้ที่ล็อกอินอยู่
router.get('/my', (req, res) => solvesController.getMySolves(req, res));

export default router;
