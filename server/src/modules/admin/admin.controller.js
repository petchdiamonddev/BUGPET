import { prisma } from '../../config/prisma.js';
import { instancesService } from '../instances/instances.service.js';
import { docker, checkDockerHealth } from '../../config/docker.js';
import { labsService } from '../labs/labs.service.js';
import { serializeInstance } from '../../utils/format.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';

const DAY = 24 * 60 * 60 * 1000;

/** Counts rows created in [from, to) for a sparkline. */
const dailySeries = async (model, field, days = 14) => {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma[model].findMany({
    where: { [field]: { gte: since } },
    select: { [field]: true },
  });

  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY);
    return { date: date.toISOString().slice(0, 10), count: 0 };
  });
  const indexOf = (d) => Math.floor((new Date(d).getTime() - since.getTime()) / DAY);

  for (const row of rows) {
    const idx = indexOf(row[field]);
    if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
  }
  return buckets;
};

class AdminController {
  async getDashboardStats(req, res) {
    const weekAgo = new Date(Date.now() - 7 * DAY);

    const [
      totalUsers,
      totalLabs,
      activeLabs,
      totalSolves,
      activeInstances,
      solvesThisWeek,
      usersThisWeek,
      runningInstances,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lab.count(),
      prisma.lab.count({ where: { isActive: true } }),
      prisma.solve.count(),
      prisma.labInstance.count({ where: { status: { in: ['STARTING', 'RUNNING'] } } }),
      prisma.solve.count({ where: { solvedAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.labInstance.findMany({
        where: { status: 'RUNNING' },
        select: { labId: true },
      }),
    ]);

    const dockerHealthy = await checkDockerHealth();

    const containerLoad = new Map();
    for (const inst of runningInstances) containerLoad.set(inst.labId, (containerLoad.get(inst.labId) ?? 0) + 1);

    const [solveSeries, userSeries] = await Promise.all([
      dailySeries('solve', 'solvedAt', 14),
      dailySeries('user', 'createdAt', 14),
    ]);

    const difficultyBreakdown = await prisma.lab.groupBy({ by: ['difficulty'], _count: { _all: true } });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          labs: totalLabs,
          activeLabs,
          solves: totalSolves,
          activeInstances,
          usersThisWeek,
          solvesThisWeek,
        },
        system: {
          dockerHealthy,
          nodeEnv: process.env.NODE_ENV ?? 'development',
          baseDomain: process.env.BASE_LAB_DOMAIN ?? '127.0.0.1.nip.io',
          uptimeSec: Math.round(process.uptime()),
          memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        sparklines: { solves: solveSeries, users: userSeries },
        difficultyBreakdown: difficultyBreakdown.map((d) => ({ difficulty: d.difficulty, count: d._count._all })),
        containerLoad: [...containerLoad.entries()].map(([labId, count]) => ({ labId, count })),
      },
    });
  }

  async getActiveInstances(req, res) {
    const [active, recent] = await Promise.all([
      prisma.labInstance.findMany({
        where: { status: { in: ['STARTING', 'RUNNING'] } },
        include: {
          user: { select: { id: true, username: true } },
          lab: { select: { id: true, title: true, dockerImage: true, difficulty: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.labInstance.findMany({
        where: { status: { in: ['STOPPED', 'ERROR'] } },
        include: {
          user: { select: { id: true, username: true } },
          lab: { select: { id: true, title: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: active.map((inst) => ({
        ...serializeInstance(inst, { includeLab: true, isAdmin: true }),
        user: inst.user,
        dockerImage: inst.lab.dockerImage,
      })),
      meta: {
        recent: recent.map((inst) => ({ ...serializeInstance(inst, { includeLab: true, isAdmin: true }), user: inst.user })),
      },
    });
  }

  async getDockerContainers(req, res) {
    try {
      const containers = await docker.listContainers({ all: true, filters: { label: ['petbug.managed=true'] } });
      res.status(200).json({
        success: true,
        data: containers.map((c) => ({
          id: c.Id,
          shortId: c.Id.slice(0, 12),
          name: (c.Names?.[0] ?? '').replace(/^\//, ''),
          image: c.Image,
          state: c.State,
          status: c.Status,
          subdomain: c.Labels?.['petbug.subdomain'],
          createdAt: c.Created * 1000,
        })),
      });
    } catch (err) {
      // Docker unreachable: report as "no containers" rather than a 500 so the
      // panel can still render the rest of its data.
      logger.warn({ msg: 'Could not list docker containers', error: err.message });
      res.status(200).json({ success: true, data: [], meta: { dockerHealthy: false } });
    }
  }

  async terminateInstance(req, res) {
    const instance = await prisma.labInstance.findUnique({ where: { id: req.params.id } });
    if (!instance) throw notFound('ไม่พบ instance นี้');
    const result = await instancesService.stopLabInstance(req.user.id, instance.id, true);
    res.status(200).json({ success: true, message: 'สั่งยุติ container เรียบร้อยแล้ว', data: result.instance });
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
          _count: { select: { solves: true, labInstances: true } },
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
        ...u,
        solvesCount: u._count.solves,
        instancesCount: u._count.labInstances,
        progress: labCount > 0 ? Math.round((u._count.solves / labCount) * 100) : 0,
      })),
      meta: { total, page, pages: Math.max(1, Math.ceil(total / limit)), labCount },
    });
  }

  async updateUser(req, res) {
    const id = req.params.id;
    const { role, isBanned } = req.body;

    if (Number(id) === req.user.id && (role || isBanned)) {
      throw badRequest('ไม่สามารถเปลี่ยนสิทธิ์หรือระงับบัญชีของตัวเองได้', 'SELF_MODIFICATION');
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound('ไม่พบผู้ใช้นี้');

    const user = await prisma.user.update({
      where: { id },
      data: { ...(role ? { role } : {}), ...(typeof isBanned === 'boolean' ? { isBanned } : {}) },
      select: { id: true, username: true, email: true, role: true, isBanned: true, points: true },
    });

    logger.info({ msg: 'Admin updated user', by: req.user.id, target: user.id, role: user.role, isBanned: user.isBanned });
    res.status(200).json({ success: true, message: 'อัปเดตผู้ใช้แล้ว', data: user });
  }

  // Lab management (includes inactive labs + flags, unlike the public catalog)
  async listLabs(req, res) {
    const labs = await labsService.adminListLabs(req.validQuery ?? {});

    const activeRows = await prisma.labInstance.groupBy({
      where: { status: { in: ['STARTING', 'RUNNING'] } },
      by: ['labId'],
      _count: { _all: true },
    });
    const activeByLab = new Map(activeRows.map((r) => [r.labId, r._count._all]));

    res.status(200).json({
      success: true,
      data: labs.map((lab) => ({ ...lab, activeInstances: activeByLab.get(lab.id) ?? 0 })),
    });
  }

  async getLab(req, res) {
    const lab = await labsService.adminGetLab(req.params.id);
    res.status(200).json({ success: true, data: lab });
  }

  async getLabSolvers(req, res) {
    const lab = await prisma.lab.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!lab) throw notFound('ไม่พบด่านนี้');
    const solves = await prisma.solve.findMany({
      where: { labId: lab.id },
      select: { solvedAt: true, user: { select: { id: true, username: true, email: true } } },
      orderBy: { solvedAt: 'asc' },
    });
    res.status(200).json({
      success: true,
      data: solves.map((s, i) => ({ order: i + 1, solvedAt: s.solvedAt, user: s.user })),
    });
  }

  async resetLab(req, res) {
    const result = await labsService.resetLabSolves(req.params.id);
    res.status(200).json({ success: true, message: result.message, data: result });
  }
}

export default new AdminController();
