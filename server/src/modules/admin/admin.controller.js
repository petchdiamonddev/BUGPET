import { prisma } from '../../config/prisma.js';
import { labsService } from '../labs/labs.service.js';
import { logger } from '../../config/logger.js';
import { notFound, badRequest } from '../../utils/errors.js';

class AdminController {
  async getDashboardStats(req, res) {
    const [totalUsers, bannedUsers, totalLabs, activeLabs, totalSolves] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isBanned: true } }),
        prisma.lab.count(),
        prisma.lab.count({ where: { isActive: true } }),
        prisma.solve.count(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        bannedUsers,
        totalLabs,
        activeLabs,
        totalSolves,
      },
    });
  }

  async getAllUsers(req, res) {
    const { search, role, page = 1, limit = 50 } = req.validQuery ?? {};

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users, labCount] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          points: true,
          isBanned: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { solves: true } },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lab.count({ where: { isActive: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        points: u.points,
        isBanned: u.isBanned,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        solvesCount: u._count.solves,
        progress: labCount > 0 ? Math.round((u._count.solves / labCount) * 100) : 0,
      })),
      meta: { total, page, pages: Math.max(1, Math.ceil(total / limit)), labCount },
    });
  }

  async updateUser(req, res) {
    const id = Number(req.params.id);
    const { role, isBanned } = req.body;

    // ความปลอดภัย: ป้องกันไม่ให้ Admin เปลี่ยนสิทธิ์หรือสั่งแบนตัวเอง
    if (id === req.user.id && (role || isBanned !== undefined)) {
      throw badRequest('ไม่สามารถเปลี่ยนสิทธิ์หรือระงับบัญชีของตัวเองได้', 'SELF_MODIFICATION');
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound('ไม่พบผู้ใช้งานรายนี้');

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isBanned === 'boolean' ? { isBanned } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        points: true,
      },
    });

    // หากสั่งแบน ให้ทำการ Revoke Token ของ User คนนั้นใน DB ทันที
    if (isBanned === true) {
      await prisma.user.update({
        where: { id },
        data: { refreshtoken: null },
      });
    }

    logger.info({
      msg: 'Admin updated user',
      adminId: req.user.id,
      targetId: updatedUser.id,
      role: updatedUser.role,
      isBanned: updatedUser.isBanned,
    });

    res.status(200).json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      data: updatedUser,
    });
  }

  async listLabs(req, res) {
    const labs = await labsService.adminListLabs(req.validQuery ?? {});
    res.status(200).json({ success: true, data: labs });
  }

  async getLab(req, res) {
    const lab = await labsService.adminGetLab(Number(req.params.id));
    res.status(200).json({ success: true, data: lab });
  }

  async getLabSolvers(req, res) {
    const labId = Number(req.params.id);
    const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { id: true } });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บนี้');

    const solves = await prisma.solve.findMany({
      where: { labId },
      select: {
        solvedAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { solvedAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: solves.map((s, i) => ({ order: i + 1, solvedAt: s.solvedAt, user: s.user })),
    });
  }

  async resetLab(req, res) {
    const result = await labsService.resetLabSolves(Number(req.params.id));
    res.status(200).json({ success: true, message: result.message, data: result });
  }
}

export default new AdminController();
