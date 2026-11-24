import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { notFound, conflict } from '../../utils/errors.js';
import { serializeLab } from '../../utils/format.js';

const labSummarySelect = {
  id: true,
  title: true,
  description: true,
  difficulty: true,
  points: true,
  timeoutMin: true,
  tags: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

class LabsService {
  async getAllLabs(user, query = {}) {
    const { difficulty, search, status, sort = 'default', tag } = query;
    const userId = user?.id ?? null;

    const where = {
      isActive: true,
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { tags: { has: search } },
            ],
          }
        : {}),
    };

    const orderBy = {
      default: [{ difficulty: 'asc' }, { points: 'asc' }, { id: 'asc' }],
      newest: [{ createdAt: 'desc' }],
      points: [{ points: 'desc' }],
      difficulty: [{ difficulty: 'desc' }, { points: 'desc' }],
    }[sort] ?? [{ id: 'asc' }];

    const labs = await prisma.lab.findMany({
      where,
      select: {
        ...labSummarySelect,
        _count: { select: { solves: true } },
        solves: userId ? { where: { userId }, select: { id: true, solvedAt: true } } : false,
      },
      orderBy,
    });

    const serialized = labs.map((lab) => serializeLab(lab, { userId }));
    const filtered =
      status === 'solved'
        ? serialized.filter((lab) => lab.isSolved)
        : status === 'unsolved'
        ? serialized.filter((lab) => !lab.isSolved)
        : serialized;

    const tagFrequency = new Map();
    for (const lab of serialized) {
      for (const t of lab.tags) tagFrequency.set(t, (tagFrequency.get(t) ?? 0) + 1);
    }
    const tags = [...tagFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 16)
      .map(([name, count]) => ({ name, count }));

    return {
      labs: filtered,
      tags,
      total: filtered.length,
      counts: {
        total: serialized.length,
        solved: serialized.filter((l) => l.isSolved).length,
        byDifficulty: {
          EASY: serialized.filter((l) => l.difficulty === 'EASY').length,
          MEDIUM: serialized.filter((l) => l.difficulty === 'MEDIUM').length,
          HARD: serialized.filter((l) => l.difficulty === 'HARD').length,
        },
      },
    };
  }

  async getLabById(labId, user) {
    const userId = user?.id ?? null;
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        _count: { select: { solves: true } },
        solves: userId
          ? {
              where: { userId },
              select: { id: true, solvedAt: true },
            }
          : false,
      },
    });

    if (!lab) {
      throw notFound('ไม่พบโจทย์แล็บที่ระบุ');
    }
    if (!lab.isActive) {
      throw notFound('โจทย์แล็บนี้ถูกปิดการใช้งานอยู่');
    }

    const recentSolvers = await prisma.solve.findMany({
      where: { labId },
      select: { solvedAt: true, user: { select: { id: true, username: true } } },
      orderBy: { solvedAt: 'desc' },
      take: 5,
    });

    const firstSolve = await prisma.solve.findFirst({
      where: { labId },
      select: { solvedAt: true, user: { select: { id: true, username: true } } },
      orderBy: { solvedAt: 'asc' },
    });

    return {
      ...serializeLab(lab, { userId }),
      recentSolvers: recentSolvers.map((s) => ({
        username: s.user.username,
        solvedAt: s.solvedAt,
        userId: s.user.id,
      })),
      firstBlood: firstSolve
        ? { username: firstSolve.user.username, solvedAt: firstSolve.solvedAt }
        : null,
    };
  }

  async createLab(data) {
    const existing = await prisma.lab.findFirst({
      where: { title: { equals: data.title, mode: 'insensitive' } },
    });
    if (existing) {
      throw conflict('ชื่อโจทย์แล็บนี้มีอยู่ในระบบแล้ว');
    }

    const lab = await prisma.lab.create({ data });
    logger.info({ msg: 'Lab created', labId: lab.id, title: lab.title });
    return serializeLab(lab, { isAdmin: true, includeFlag: true });
  }

  async updateLab(id, data) {
    const lab = await prisma.lab.findUnique({ where: { id } });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บที่ต้องการแก้ไข');

    if (data.title && data.title.toLowerCase() !== lab.title.toLowerCase()) {
      const existing = await prisma.lab.findFirst({
        where: { title: { equals: data.title, mode: 'insensitive' } },
      });
      if (existing) throw conflict('ชื่อโจทย์แล็บนี้มีอยู่ในระบบแล้ว');
    }

    const updated = await prisma.lab.update({ where: { id }, data });
    logger.info({ msg: 'Lab updated', labId: id });
    return serializeLab(updated, { isAdmin: true, includeFlag: true });
  }

  async toggleLabActive(id) {
    const lab = await prisma.lab.findUnique({ where: { id } });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บที่ต้องการแก้ไข');

    const updated = await prisma.lab.update({
      where: { id },
      data: { isActive: !lab.isActive },
    });
    logger.info({ msg: 'Lab visibility toggled', labId: id, isActive: updated.isActive });
    return serializeLab(updated, { isAdmin: true, includeFlag: true });
  }

  async deleteLab(id) {
    const lab = await prisma.lab.findUnique({ where: { id } });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บที่ต้องการลบ');

    await prisma.lab.delete({ where: { id } });
    logger.info({ msg: 'Lab deleted', labId: id });
    return { id, message: 'ลบโจทย์แล็บเรียบร้อยแล้ว' };
  }

  async resetLabSolves(id) {
    const lab = await prisma.lab.findUnique({
      where: { id },
      include: { solves: { select: { userId: true } } },
    });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บที่ระบุ');

    const affectedUserIds = [...new Set(lab.solves.map((s) => s.userId))];

    await prisma.solve.deleteMany({ where: { labId: id } });

    // Recalculate points for affected users
    for (const userId of affectedUserIds) {
      const remaining = await prisma.solve.findMany({
        where: { userId },
        select: { lab: { select: { points: true } } },
      });
      const total = remaining.reduce((sum, s) => sum + (s.lab?.points ?? 0), 0);
      await prisma.user.update({ where: { id: userId }, data: { points: total } });
    }

    logger.info({ msg: 'Lab solves reset', labId: id, affectedUsers: affectedUserIds.length });
    return { id, message: 'รีเซ็ตผลการแก้โจทย์แล็บสำเร็จ', affectedUsers: affectedUserIds.length };
  }

  async adminListLabs(query = {}) {
    const { search, difficulty, active } = query;
    const where = {
      ...(difficulty ? { difficulty } : {}),
      ...(active === 'active' ? { isActive: true } : active === 'inactive' ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const labs = await prisma.lab.findMany({
      where,
      include: {
        _count: { select: { solves: true } },
      },
      orderBy: [{ id: 'asc' }],
    });

    return labs.map((l) => serializeLab(l, { isAdmin: true, includeFlag: true }));
  }

  async adminGetLab(id) {
    const lab = await prisma.lab.findUnique({
      where: { id },
      include: {
        _count: { select: { solves: true } },
      },
    });
    if (!lab) throw notFound('ไม่พบโจทย์แล็บ');
    return serializeLab(lab, { isAdmin: true, includeFlag: true });
  }
}

export const labsService = new LabsService();
