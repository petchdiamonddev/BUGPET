import { solvesService } from './solves.service.js';

class SolvesController {
  async submitFlag(req, res) {
    const result = await solvesService.submitFlag(req.user, req.params.labId, req.body.flag);
    const status = result.isCorrect ? 200 : 400;
    return res.status(status).json(result);
  }

  async getMySolves(req, res) {
    const solves = await solvesService.getUserSolves(req.user.id);
    return res.status(200).json({ success: true, data: solves });
  }
}

export default new SolvesController();
