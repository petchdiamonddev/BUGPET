import { leaderboardService } from './leaderboard.service.js';

class LeaderboardController {
  async getLeaderboard(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const topUsers = await leaderboardService.getTopUsers(limit);
      res.status(200).json({
        success: true,
        data: topUsers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBadges(req, res, next) {
    try {
      const badges = await leaderboardService.getAllBadges();
      res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserProfile(req, res, next) {
    try {
      const userId = parseInt(req.params.userId || req.user.id, 10);
      const profile = await leaderboardService.getUserProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LeaderboardController();
