import { prisma } from '../../config/prisma.js';

class LeaderboardService {
  async getTopUsers(limit = 50) {
    const users = await prisma.user.findMany({
      where: {
        points: { gt: 0 },
      },
      select: {
        id: true,
        username: true,
        points: true,
        createdAt: true,
        _count: {
          select: { solves: true },
        },
        badges: {
          select: {
            badge: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
      orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return users.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      username: u.username,
      points: u.points,
      solvesCount: u._count.solves,
      badges: u.badges.map((b) => b.badge),
    }));
  }

  async getAllBadges() {
    return prisma.badge.findMany({
      orderBy: { id: 'asc' },
    });
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
        createdAt: true,
        badges: {
          select: {
            earnedAt: true,
            badge: true,
          },
        },
        solves: {
          select: {
            solvedAt: true,
            lab: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                points: true,
              },
            },
          },
          orderBy: { solvedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้');
    }

    // Calculate rank
    const higherRankCount = await prisma.user.count({
      where: {
        points: { gt: user.points },
      },
    });

    return {
      ...user,
      rank: user.points > 0 ? higherRankCount + 1 : '-',
      totalSolves: user.solves.length,
      badges: user.badges.map((b) => ({
        ...b.badge,
        earnedAt: b.earnedAt,
      })),
      solves: user.solves.map((s) => ({
        ...s.lab,
        solvedAt: s.solvedAt,
      })),
    };
  }
}

export const leaderboardService = new LeaderboardService();
