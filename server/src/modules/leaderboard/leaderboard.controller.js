import { leaderboardService } from './leaderboard.service.js';

class LeaderboardController {
  async getLeaderboard(req, res) {
    const data = await leaderboardService.getTopUsers(req.validQuery);
    res.status(200).json({ success: true, data });
  }

  async getAllBadges(req, res) {
    const data = await leaderboardService.getAllBadges();
    res.status(200).json({ success: true, data });
  }

  async getActivity(req, res) {
    const data = await leaderboardService.getActivity(req.validQuery);
    res.status(200).json({ success: true, data });
  }

  async getStats(req, res) {
    const data = await leaderboardService.getStats();
    res.status(200).json({ success: true, data });
  }

  async getUserProfile(req, res) {
    const data = await leaderboardService.getUserProfile(Number(req.params.userId));
    res.status(200).json({ success: true, data });
  }

  async getMe(req, res) {
    const data = await leaderboardService.getUserProfile(req.user.id);
    res.status(200).json({ success: true, data });
  }
}

export default new LeaderboardController();
