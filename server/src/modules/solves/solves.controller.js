import { solvesService } from './solves.service.js';
import { prisma } from '../../config/prisma.js';

class SolvesController {
  async submitFlag(req, res) {
    const { flag } = req.body;
    const result = await solvesService.submitFlag(req.user, req.params.labId, flag);

    // A fresh badge is a "reward moment" for the client; refresh the user
    // snapshot so the navbar points count is never stale.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, points: true, role: true, email: true, createdAt: true },
    });

    // Fire-and-forget teardown of the solved lab's container so the player
    // sees the reward immediately instead of waiting for a Docker stop.
    const cleanup = result._cleanup;
    delete result._cleanup;
    if (cleanup) cleanup();

    if (!result.isCorrect) {
      return res.status(400).json({ ...result, user });
    }

    res.status(200).json({ ...result, user });
  }

  async getMySolves(req, res) {
    const solves = await solvesService.getUserSolves(req.user.id);
    res.status(200).json({ success: true, data: solves });
  }
}

export default new SolvesController();
