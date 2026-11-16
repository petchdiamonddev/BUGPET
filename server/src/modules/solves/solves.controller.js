import { solvesService } from './solves.service.js';

class SolvesController {
  async submitFlag(req, res, next) {
    try {
      const labId = parseInt(req.params.labId, 10);
      const userId = req.user.id;
      const { flag } = req.body;

      const result = await solvesService.submitFlag(userId, labId, flag);

      if (!result.isCorrect) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  async getMySolves(req, res, next) {
    try {
      const userId = req.user.id;
      const solves = await solvesService.getUserSolves(userId);
      res.status(200).json({
        success: true,
        data: solves,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SolvesController();
