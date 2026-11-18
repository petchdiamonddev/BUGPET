import { prisma } from '../../config/prisma.js';
import { dockerService } from '../../services/docker.service.js';
import { logger } from '../../config/logger.js';
import { conflict, notFound } from '../../utils/errors.js';
import { serializeLab, serializeInstance } from '../../utils/format.js';

const DIFFICULTY_ORDER = { EASY: 0, MEDIUM: 1, HARD: 2 };

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
  /**
   * Player-facing lab catalog with filters. `search`/`difficulty`/`tag` are
   * applied in SQL; `status` (solved / unsolved) is applied after the join
   * with the caller's solves because it depends on `userId`.
   */
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
    }[sort] ?? {};

    const labs = await prisma.lab.findMany({
      where,
      select: {
        ...labSummarySelect,
        _count: { select: { solves: true, instances: true } },
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
        _count: { select: { solves: true, instances: true } },
        solves: userId
          ? {
              where: { userId },
              select: { id: true, solvedAt: true },
            }
          : false,
      },
    });

    if (!lab) {
      throw notFound('ไม่พบด่านที่ระบุ');
    }
    if (!lab.isActive) {
      throw notFound('ด่านนี้ถูกปิดการใช้งานอยู่');
    }

    const activeInstance = userId
      ? await prisma.labInstance.findFirst({
          where: { userId, labId, status: { in: ['STARTING', 'RUNNING'] } },
        })
      : null;

    // Recent solvers give the detail page social proof + a "who solved first" pulse.
    const recentSolvers = await prisma.solve.findMany({
      where: { labId },
      select: { solvedAt: true, user: { select: { id: true, username: true } } },
      orderBy: { solvedAt: 'desc' },
      take: 5,
    });

    // First blood: the earliest solver of this lab.
    const firstSolve = await prisma.solve.findFirst({
      where: { labId },
      select: { solvedAt: true, user: { select: { id: true, username: true } } },
      orderBy: { solvedAt: 'asc' },
    });

    const totalInstances = await prisma.labInstance.count({
      where: { labId, status: { in: ['RUNNING', 'STOPPED'] } },
    });

    return {
      ...serializeLab(lab, { userId }),
      activeInstance: serializeInstance(activeInstance),
      recentSolvers: recentSolvers.map((s) => ({ username: s.user.username, solvedAt: s.solvedAt, userId: s.user.id })),
      firstBlood: firstSolve
        ? { username: firstSolve.user.username, solvedAt: firstSolve.solvedAt, userId: firstSolve.user.id }
        : null,
      attemptsCount: lab._count.instances,
      successRate: totalInstances > 0 ? Math.round((lab._count.solves / totalInstances) * 100) : null,
    };
  }

  async getRelatedLabs(labId, difficulty, take = 3) {
    const labs = await prisma.lab.findMany({
      where: { isActive: true, id: { not: labId }, difficulty },
      select: { ...labSummarySelect, _count: { select: { solves: true } } },
      orderBy: { solves: { _count: 'desc' } },
      take,
    });
    return labs.map((lab) => serializeLab(lab));
  }

  /* ------------------------------- Admin API ------------------------------ */

  async adminListLabs(query = {}) {
    const { search, difficulty, active = 'all' } = query;
    const labs = await prisma.lab.findMany({
      where: {
        ...(difficulty ? { difficulty } : {}),
        ...(active === 'active' ? { isActive: true } : active === 'inactive' ? { isActive: false } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { dockerImage: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        ...labSummarySelect,
        dockerImage: true,
        flag: true,
        _count: { select: { solves: true, instances: true } },
      },
      orderBy: [{ isActive: 'desc' }, { id: 'asc' }],
    });

    return labs.map((lab) => ({
      ...serializeLab(lab, { isAdmin: true, includeFlag: true }),
      activeInstances: 0,
    }));
  }

  async adminGetLab(labId) {
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        _count: { select: { solves: true, instances: true } },
      },
    });
    if (!lab) throw notFound('ไม่พบด่านที่ระบุ');
    return serializeLab(lab, { isAdmin: true, includeFlag: true });
  }

  async createLab(data) {
    const duplicate = await prisma.lab.findFirst({
      where: { title: { equals: data.title, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) {
      throw conflict('มีด่านชื่อนี้อยู่แล้ว', 'LAB_TITLE_EXISTS');
    }

    const lab = await prisma.lab.create({
      data: { ...data, tags: [...new Set(data.tags ?? [])] },
    });
    logger.info({ msg: 'Lab created', labId: lab.id, title: lab.title });
    return serializeLab({ ...lab, _count: { solves: 0, instances: 0 } }, { isAdmin: true, includeFlag: true });
  }

  async updateLab(id, data) {
    const existing = await prisma.lab.findUnique({ where: { id } });
    if (!existing) throw notFound('ไม่พบด่านที่ต้องการแก้ไข');

    if (data.title) {
      const duplicate = await prisma.lab.findFirst({
        where: { id: { not: id }, title: { equals: data.title, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) throw conflict('มีด่านชื่อนี้อยู่แล้ว', 'LAB_TITLE_EXISTS');
    }

    const lab = await prisma.lab.update({
      where: { id },
      data: {
        ...data,
        ...(data.tags ? { tags: [...new Set(data.tags)] } : {}),
      },
    });
    logger.info({ msg: 'Lab updated', labId: id });
    return serializeLab({ ...lab, _count: { solves: 0, instances: 0 } }, { isAdmin: true, includeFlag: true });
  }

  async toggleLabActive(id) {
    const existing = await prisma.lab.findUnique({ where: { id }, select: { isActive: true } });
    if (!existing) throw notFound('ไม่พบด่านที่ระบุ');
    const lab = await prisma.lab.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { _count: { select: { solves: true, instances: true } } },
    });
    return serializeLab(lab, { isAdmin: true, includeFlag: true });
  }

  /**
   * Deleting a lab cascades its solves and instances. Points that were
   * already awarded stay with the players, which is the least surprising
   * behaviour for a leaderboard. Active containers are stopped first so no
   * orphaned Docker container is left behind.
   */
  async deleteLab(id) {
    const existing = await prisma.lab.findUnique({
      where: { id },
      include: {
        instances: { where: { status: { in: ['STARTING', 'RUNNING'] } } },
        _count: { select: { solves: true } },
      },
    });
    if (!existing) throw notFound('ไม่พบด่านที่ต้องการลบ');

    for (const instance of existing.instances) {
      await dockerService.stopAndRemoveContainer(instance.containerId);
      if (instance.subdomain) dockerService.removeTraefikRouteConfig(instance.subdomain);
    }

    await prisma.lab.delete({ where: { id } });
    logger.info({ msg: 'Lab deleted', labId: id, solvesRemoved: existing._count.solves });
    return { id, message: 'ลบด่านเรียบร้อยแล้ว', solvesRemoved: existing._count.solves };
  }

  /**
   * Wipes solves of a lab and recalculates every affected user's points so
   * the leaderboard stays consistent (used when a lab is reset/redeployed).
   */
  async resetLabSolves(id) {
    const lab = await prisma.lab.findUnique({
      where: { id },
      include: { solves: { select: { userId: true } } },
    });
    if (!lab) throw notFound('ไม่พบด่านที่ระบุ');

    const affectedUserIds = [...new Set(lab.solves.map((s) => s.userId))];

    await prisma.solve.deleteMany({ where: { labId: id } });

    for (const userId of affectedUserIds) {
      const remaining = await prisma.solve.findMany({
        where: { userId },
        select: { lab: { select: { points: true } } },
      });
      const total = remaining.reduce((sum, s) => sum + (s.lab?.points ?? 0), 0);
      await prisma.user.update({ where: { id: userId }, data: { points: total } });
    }

    logger.info({ msg: 'Lab solves reset', labId: id, affectedUsers: affectedUserIds.length });
    return { id, message: 'รีเซ็ตผลการแก้ด่านแล้ว', affectedUsers: affectedUserIds.length };
  }
}

export const labsService = new LabsService();
export { DIFFICULTY_ORDER };
