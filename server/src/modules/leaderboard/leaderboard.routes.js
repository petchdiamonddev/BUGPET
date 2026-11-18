import { Router } from 'express';
import { z } from 'zod';
import leaderboardController from './leaderboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalEnum, optionalInt } from '../../utils/query.js';

const router = Router();

const listQuery = {
  query: z.object({
    limit: optionalInt(1, 100, 25, 'จำนวนรายการ'),
    page: optionalInt(1, 10000, 1, 'หน้า'),
    period: optionalEnum(['all', 'week'], 'ช่วงเวลา'),
  }),
};

router.get('/', validate(listQuery), leaderboardController.getLeaderboard);
router.get('/badges', leaderboardController.getAllBadges);
router.get(
  '/activity',
  validate({ query: z.object({ limit: optionalInt(1, 30, 8, 'จำนวนรายการ') }) }),
  leaderboardController.getActivity
);
router.get('/stats', leaderboardController.getStats);
router.get('/me', authenticate, leaderboardController.getMe);
router.get(
  '/profile/:userId',
  validate({ params: z.object({ userId: z.coerce.number().int().positive('ไม่พบผู้ใช้นี้') }) }),
  leaderboardController.getUserProfile
);

export default router;
