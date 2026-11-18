import { leaderboardService } from './leaderboard.service.js';

class LeaderboardController {
  async getLeaderboard(req, res) {
    // Ranged by the query schema; defaults apply when omitted.
    const { limit = 25, page = 1, period = 'all' } = req.validQuery ?? {};
    const result = await leaderboardService.getTopUsers({ limit, page, period });
    res.status(200).json({ success: true, data: result.items, meta: result });
  }

  async getAllBadges(req, res) {
    const badges = await leaderboardService.getAllBadges();
    res.status(200).json({ success: true, data: badges });
  }

  async getUserProfile(req, res) {
    const profile = await leaderboardService.getUserProfile(req.params.userId);
    res.status(200).json({ success: true, data: profile });
  }

  async getMe(req, res) {
    const profile = await leaderboardService.getUserProfile(req.user.id);
    res.status(200).json({ success: true, data: profile });
  }

  async getActivity(req, res) {
    const { limit = 8 } = req.validQuery ?? {};
    const events = await leaderboardService.getActivityFeed(limit);
    res.status(200).json({ success: true, data: events });
  }

  async getStats(req, res) {
    const stats = await leaderboardService.getPublicStats();
    res.status(200).json({ success: true, data: stats });
  }
}

export default new LeaderboardController();
