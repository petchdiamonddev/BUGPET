import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

export const INITIAL_BADGES = [
  {
    name: 'First Blood',
    description: 'ปลดล็อกเมื่อพิชิต Lab แรกได้สำเร็จ',
    icon: '🩸',
    condition: 'FIRST_BLOOD',
  },
  {
    name: 'Bug Hunter Apprentice',
    description: 'พิชิต Lab ครบ 3 ด่าน',
    icon: '🥉',
    condition: 'SOLVE_3',
  },
  {
    name: 'Master Hacker',
    description: 'พิชิต Lab ครบ 5 ด่าน',
    icon: '🥈',
    condition: 'SOLVE_5',
  },
  {
    name: 'Cyber Legend',
    description: 'พิชิต Lab ครบ 10 ด่าน',
    icon: '🥇',
    condition: 'SOLVE_10',
  },
  {
    name: 'Hardcore Infiltrator',
    description: 'พิชิต Lab ระดับ HARD สำเร็จอย่างน้อย 1 ด่าน',
    icon: '💀',
    condition: 'SOLVE_HARD',
  },
];

class BadgesService {
  async ensureBadgesExist() {
    for (const badge of INITIAL_BADGES) {
      await prisma.badge.upsert({
        where: { name: badge.name },
        update: {},
        create: badge,
      });
    }
  }

  async checkAndAwardBadges(userId, newlySolvedLabId) {
    try {
      await this.ensureBadgesExist();

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          solves: { include: { lab: true } },
          badges: true,
        },
      });

      if (!user) return [];

      const ownedBadgeIds = new Set(user.badges.map((b) => b.badgeId));
      const allBadges = await prisma.badge.findMany();
      const newlyAwarded = [];

      const solveCount = user.solves.length;
      const hasHardSolve = user.solves.some((s) => s.lab.difficulty === 'HARD');

      for (const badge of allBadges) {
        if (ownedBadgeIds.has(badge.id)) continue;

        let eligible = false;
        if (badge.condition === 'FIRST_BLOOD' && solveCount >= 1) {
          eligible = true;
        } else if (badge.condition === 'SOLVE_3' && solveCount >= 3) {
          eligible = true;
        } else if (badge.condition === 'SOLVE_5' && solveCount >= 5) {
          eligible = true;
        } else if (badge.condition === 'SOLVE_10' && solveCount >= 10) {
          eligible = true;
        } else if (badge.condition === 'SOLVE_HARD' && hasHardSolve) {
          eligible = true;
        }

        if (eligible) {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
            },
          });
          newlyAwarded.push(badge);
          logger.info({ msg: `Awarded badge "${badge.name}" to user ${userId}` });
        }
      }

      return newlyAwarded;
    } catch (err) {
      logger.error({ msg: 'Error awarding badges', error: err.message });
      return [];
    }
  }
}

export const badgesService = new BadgesService();
