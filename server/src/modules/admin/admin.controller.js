import { prisma } from '../../config/prisma.js';
import { instancesService } from '../instances/instances.service.js';
import { checkDockerHealth } from '../../config/docker.js';

class AdminController {
  async getDashboardStats(req, res, next) {
    try {
      const [totalUsers, totalLabs, totalSolves, activeInstances] = await Promise.all([
        prisma.user.count(),
        prisma.lab.count(),
        prisma.solve.count(),
        prisma.labInstance.count({
          where: { status: { in: ['STARTING', 'RUNNING'] } },
        }),
      ]);

      const dockerHealthy = await checkDockerHealth();

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalLabs,
          totalSolves,
          activeInstances,
          systemStatus: {
            dockerHealthy,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveInstances(req, res, next) {
    try {
      const instances = await prisma.labInstance.findMany({
        where: {
          status: { in: ['STARTING', 'RUNNING'] },
        },
        include: {
          user: { select: { id: true, username: true, email: true } },
          lab: { select: { id: true, title: true, dockerImage: true } },
        },
        orderBy: { startedAt: 'desc' },
      });

      const baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';

      res.status(200).json({
        success: true,
        data: instances.map((inst) => ({
          id: inst.id,
          user: inst.user,
          lab: inst.lab,
          containerId: inst.containerId,
          subdomain: inst.subdomain,
          url: `http://${inst.subdomain}.${baseDomain}`,
          status: inst.status,
          startedAt: inst.startedAt,
          expiresAt: inst.expiresAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async terminateInstance(req, res, next) {
    try {
      const instanceId = req.params.id;
      const result = await instancesService.stopLabInstance(req.user.id, instanceId, true);
      res.status(200).json({
        success: true,
        message: 'สั่งยุติการทำงานของ Container เรียบร้อยแล้ว',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          points: true,
          createdAt: true,
          _count: {
            select: { solves: true },
          },
        },
        orderBy: { id: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: users.map((u) => ({
          ...u,
          solvesCount: u._count.solves,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
