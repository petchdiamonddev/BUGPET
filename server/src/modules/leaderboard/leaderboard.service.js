import { prisma } from '../../config/prisma.js';
import { notFound } from '../../utils/errors.js';

const badgeSelect = {
  id: true,
  name: true,
  icon: true,
  tier: true,
  points: true,
  description: true,
};

class LeaderboardService {
  async getTopUsers({ limit = 25, page = 1, period = 'all' } = {}) {
    const since = period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null;

    if (since) {
      const solves = await prisma.solve.findMany({
        where: { solvedAt: { gte: since }, user: { isBanned: false } },
        select: {
          solvedAt: true,
          lab: { select: { points: true } },
          user: {
            select: {
              id: true,
              username: true,
              points: true,
              badges: { select: { earnedAt: true, badge: { select: badgeSelect } } },
            },
          },
        },
      });

      const byUser = new Map();
      for (const solve of solves) {
        const entry = byUser.get(solve.user.id) ?? {
          user: solve.user,
          weeklyPoints: 0,
          weeklySolves: 0,
          lastSolveAt: null,
        };
        entry.weeklyPoints += solve.lab.points;
        entry.weeklySolves += 1;
        if (!entry.lastSolveAt || solve.solvedAt > entry.lastSolveAt) entry.lastSolveAt = solve.solvedAt;
        byUser.set(solve.user.id, entry);
      }

      const ranked = [...byUser.values()]
        .sort((a, b) => b.weeklyPoints - a.weeklyPoints || a.user.id - b.user.id)
        .map((entry, idx) => ({
          rank: idx + 1,
          id: entry.user.id,
          username: entry.user.username,
          points: entry.weeklyPoints,
          totalPoints: entry.user.points,
          solvesCount: entry.weeklySolves,
          badges: entry.user.badges.filter((b) => b.earnedAt >= since).map((b) => b.badge),
          lastSolveAt: entry.lastSolveAt,
        }));

      return {
        items: ranked.slice((page - 1) * limit, page * limit),
        total: ranked.length,
        page,
        pages: Math.max(1, Math.ceil(ranked.length / limit)),
        period,
      };
    }

    const where = { points: { gt: 0 }, isBanned: false };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          points: true,
          createdAt: true,
          _count: { select: { solves: true } },
          badges: { select: { badge: { select: badgeSelect } } },
          solves: { select: { solvedAt: true }, orderBy: { solvedAt: 'desc' }, take: 1 },
        },
        orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: users.map((u, idx) => ({
        rank: (page - 1) * limit + idx + 1,
        id: u.id,
        username: u.username,
        points: u.points,
        solvesCount: u._count.solves,
        badges: u.badges.map((b) => b.badge),
        lastSolveAt: u.solves[0]?.solvedAt ?? null,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      period,
    };
  }

  async getAllBadges() {
    return prisma.badge.findMany({ orderBy: [{ id: 'asc' }] });
  }

  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        points: true,
        bio: true,
        isBanned: true,
        createdAt: true,
        lastLoginAt: true,
        badges: { select: { earnedAt: true, badge: true } },
        solves: {
          select: {
            solvedAt: true,
            lab: { select: { id: true, title: true, difficulty: true, points: true, tags: true } },
          },
          orderBy: { solvedAt: 'desc' },
        },
      },
    });

    if (!user || user.isBanned) throw notFound('ไม่พบข้อมูลผู้ใช้');

    const [higherRankCount, totalPlayers, totalSolvedLabs] = await Promise.all([
      prisma.user.count({ where: { points: { gt: user.points }, isBanned: false } }),
      prisma.user.count({ where: { isBanned: false } }),
      prisma.lab.count({ where: { isActive: true } }),
    ]);

    const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const solve of user.solves) byDifficulty[solve.lab.difficulty] += 1;

    return {
      id: user.id,
      username: user.username,
      points: user.points,
      bio: user.bio,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      rank: higherRankCount + 1,
      totalPlayers,
      solvesCount: user.solves.length,
      badgesCount: user.badges.length,
      progress: totalSolvedLabs > 0 ? Math.round((user.solves.length / totalSolvedLabs) * 100) : 0,
      byDifficulty,
      badges: user.badges.map((b) => ({ ...b.badge, earnedAt: b.earnedAt })),
      recentSolves: user.solves.slice(0, 5).map((s) => ({
        labId: s.lab.id,
        title: s.lab.title,
        difficulty: s.lab.difficulty,
        points: s.lab.points,
        solvedAt: s.solvedAt,
      })),
    };
  }

  async getActivity({ limit = 8 } = {}) {
    const [solves, badges] = await Promise.all([
      prisma.solve.findMany({
        take: limit,
        orderBy: { solvedAt: 'desc' },
        select: {
          solvedAt: true,
          user: { select: { id: true, username: true } },
          lab: { select: { id: true, title: true, difficulty: true, points: true } },
        },
      }),
      prisma.userBadge.findMany({
        take: limit,
        orderBy: { earnedAt: 'desc' },
        select: {
          earnedAt: true,
          user: { select: { id: true, username: true } },
          badge: { select: badgeSelect },
        },
      }),
    ]);

    const events = [
      ...solves.map((s) => ({
        type: 'SOLVE',
        timestamp: s.solvedAt,
        user: s.user,
        data: s.lab,
      })),
      ...badges.map((b) => ({
        type: 'BADGE',
        timestamp: b.earnedAt,
        user: b.user,
        data: b.badge,
      })),
    ];

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events.slice(0, limit);
  }

  async getStats() {
    const [usersCount, labsCount, solvesCount] = await Promise.all([
      prisma.user.count({ where: { isBanned: false } }),
      prisma.lab.count({ where: { isActive: true } }),
      prisma.solve.count(),
    ]);

    return {
      totalUsers: usersCount,
      totalLabs: labsCount,
      totalSolves: solvesCount,
    };
  }
}

export const leaderboardService = new LeaderboardService();
