import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

/**
 * Badge catalog. `condition` is evaluated against the player's solve
 * history; `points` is a one-off bonus added to the profile total so
 * badges feel like real progression and not just decoration.
 */
export const INITIAL_BADGES = [
  {
    name: 'First Blood',
    description: 'พิชิตด่านแรกได้สำเร็จ',
    icon: 'droplet',
    condition: 'FIRST_BLOOD',
    tier: 'BRONZE',
    points: 50,
  },
  {
    name: 'Bug Hunter Apprentice',
    description: 'พิชิตด่านสะสมครบ 3 ด่าน',
    icon: 'bug',
    condition: 'SOLVE_3',
    tier: 'BRONZE',
    points: 75,
  },
  {
    name: 'Master Hacker',
    description: 'พิชิตด่านสะสมครบ 5 ด่าน',
    icon: 'terminal',
    condition: 'SOLVE_5',
    tier: 'SILVER',
    points: 150,
  },
  {
    name: 'Cyber Legend',
    description: 'พิชิตด่านสะสมครบ 10 ด่าน',
    icon: 'crown',
    condition: 'SOLVE_10',
    tier: 'GOLD',
    points: 300,
  },
  {
    name: 'Hardcore Infiltrator',
    description: 'พิชิตด่านระดับ HARD อย่างน้อย 1 ด่าน',
    icon: 'skull',
    condition: 'SOLVE_HARD',
    tier: 'SILVER',
    points: 200,
  },
  {
    name: 'Full Spectrum',
    description: 'พิชิตด่านครบทุกระดับความยาก (EASY / MEDIUM / HARD)',
    icon: 'layers',
    condition: 'SOLVE_ALL_DIFFICULTY',
    tier: 'GOLD',
    points: 250,
  },
  {
    name: 'Deep Diver',
    description: 'พิชิตด่านระดับ HARD ครบ 3 ด่าน',
    icon: 'flame',
    condition: 'SOLVE_HARD_3',
    tier: 'GOLD',
    points: 400,
  },
];

const isEligible = (condition, stats) => {
  switch (condition) {
    case 'FIRST_BLOOD':
      return stats.solveCount >= 1;
    case 'SOLVE_3':
      return stats.solveCount >= 3;
    case 'SOLVE_5':
      return stats.solveCount >= 5;
    case 'SOLVE_10':
      return stats.solveCount >= 10;
    case 'SOLVE_HARD':
      return stats.hardCount >= 1;
    case 'SOLVE_HARD_3':
      return stats.hardCount >= 3;
    case 'SOLVE_ALL_DIFFICULTY':
      return stats.easyCount >= 1 && stats.mediumCount >= 1 && stats.hardCount >= 1;
    default:
      return false;
  }
};

class BadgesService {
  async ensureBadgesExist() {
    for (const badge of INITIAL_BADGES) {
      await prisma.badge.upsert({
        where: { name: badge.name },
        update: { description: badge.description, icon: badge.icon, condition: badge.condition, tier: badge.tier, points: badge.points },
        create: badge,
      });
    }
  }

  /**
   * Re-evaluates every badge against the player's solves and awards the
   * missing ones (with their points bonus) atomically.
   *
   * @returns {Promise<Array>} newly awarded badges
   */
  async checkAndAwardBadges(userId) {
    try {
      await this.ensureBadgesExist();

      const [solves, owned, allBadges] = await Promise.all([
        prisma.solve.findMany({
          where: { userId },
          select: { lab: { select: { difficulty: true } } },
        }),
        prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
        prisma.badge.findMany({ orderBy: { id: 'asc' } }),
      ]);

      const stats = {
        solveCount: solves.length,
        easyCount: solves.filter((s) => s.lab.difficulty === 'EASY').length,
        mediumCount: solves.filter((s) => s.lab.difficulty === 'MEDIUM').length,
        hardCount: solves.filter((s) => s.lab.difficulty === 'HARD').length,
      };

      const ownedIds = new Set(owned.map((b) => b.badgeId));
      const newlyAwarded = allBadges.filter((b) => !ownedIds.has(b.id) && isEligible(b.condition, stats));

      if (newlyAwarded.length === 0) return [];

      const bonus = newlyAwarded.reduce((sum, b) => sum + b.points, 0);

      await prisma.$transaction([
        prisma.userBadge.createMany({
          data: newlyAwarded.map((b) => ({ userId, badgeId: b.id })),
          skipDuplicates: true,
        }),
        prisma.user.update({
          where: { id: userId },
          data: { points: { increment: bonus } },
        }),
      ]);

      logger.info({ msg: 'Badges awarded', userId, badges: newlyAwarded.map((b) => b.name), bonus });
      return newlyAwarded;
    } catch (err) {
      logger.error({ msg: 'Error awarding badges', error: err.message });
      return [];
    }
  }
}

export const badgesService = new BadgesService();
