import { Router } from 'express';
import leaderboardController from './leaderboard.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', leaderboardController.getLeaderboard);
router.get('/badges', leaderboardController.getAllBadges);
router.get('/profile/:userId', leaderboardController.getUserProfile);
router.get('/me', authenticate, leaderboardController.getUserProfile);

export default router;
