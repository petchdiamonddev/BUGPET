import { Router } from 'express';
import { z } from 'zod';
import leaderboardController from './leaderboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalEnum, optionalInt } from '../../utils/query.js';
import { apiLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

const listQuery = {
  query: z.object({
    limit: optionalInt(1, 100, 25, 'จำนวนรายการ'),
    page: optionalInt(1, 10000, 1, 'หน้า'),
    period: optionalEnum(['all', 'week'], 'ช่วงเวลา'),
  }),
};

router.get('/', apiLimiter, validate(listQuery), (req, res) =>
  leaderboardController.getLeaderboard(req, res)
);
router.get('/badges', apiLimiter, (req, res) => leaderboardController.getAllBadges(req, res));
router.get(
  '/activity',
  apiLimiter,
  validate({ query: z.object({ limit: optionalInt(1, 30, 8, 'จำนวนรายการ') }) }),
  (req, res) => leaderboardController.getActivity(req, res)
);
router.get('/stats', apiLimiter, (req, res) => leaderboardController.getStats(req, res));
router.get('/me', authenticate, (req, res) => leaderboardController.getMe(req, res));
router.get(
  '/profile/:userId',
  apiLimiter,
  validate({ params: z.object({ userId: z.coerce.number().int().positive('ไม่พบผู้ใช้นี้') }) }),
  (req, res) => leaderboardController.getUserProfile(req, res)
);

export default router;
