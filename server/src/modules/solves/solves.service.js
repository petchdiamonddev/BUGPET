import { prisma } from '../../config/prisma.js';
import { badgesService } from '../badges/badges.service.js';
import { dockerService } from '../../services/docker.service.js';
import { logger } from '../../config/logger.js';
import { badRequest, notFound } from '../../utils/errors.js';

/**
 * Flag wrapper accepted by the platform, e.g. BUGPET{...}.
 * The brand was renamed from PETBUG, so flags authored under the old name
 * still resolve — players should not lose a solve because of a rebrand.
 */
const FLAG_FORMAT = process.env.FLAG_FORMAT || 'BUGPET';
const LEGACY_FLAG_FORMATS = (process.env.LEGACY_FLAG_FORMATS || 'PETBUG')
  .split(',')
  .map((f) => f.trim().toUpperCase())
  .filter(Boolean);

const flagBody = (value) => {
  const match = /^([A-Za-z0-9_-]+)\{(.*)\}$/s.exec(value ?? '');
  return match ? { format: match[1].toUpperCase(), body: match[2] } : null;
};

class SolvesService {
  /**
   * Validates a submitted flag. Wrong flags are a normal outcome (400 with
   * `isCorrect: false`), not an exception the UI has to parse out of a
   * generic error message.
   */
  async submitFlag(user, labId, submittedFlag) {
    const lab = await prisma.lab.findUnique({ where: { id: labId } });

    if (!lab || !lab.isActive) throw notFound('ไม่พบด่านนี้ หรือด่านถูกปิดใช้งานอยู่');

    const existingSolve = await prisma.solve.findUnique({
      where: { userId_labId: { userId: user.id, labId } },
    });
    if (existingSolve) {
      throw badRequest('คุณเคยพิชิตด่านนี้ไปแล้ว', 'ALREADY_SOLVED', { solvedAt: existingSolve.solvedAt });
    }

    // Accept the stored flag verbatim, or the same inner value wrapped in the
    // current brand format (and legacy formats, e.g. PETBUG{...}).
    const submitted = submittedFlag.trim();
    const submittedParts = flagBody(submitted);
    const storedParts = flagBody(lab.flag.trim());
    const acceptedFormats = [FLAG_FORMAT, ...LEGACY_FLAG_FORMATS].map((f) => f.toUpperCase());

    const isCorrect =
      submitted === lab.flag.trim() ||
      Boolean(
        storedParts &&
          submittedParts &&
          submittedParts.body === storedParts.body &&
          acceptedFormats.includes(submittedParts.format)
      );

    if (!isCorrect) {
      return {
        success: false,
        isCorrect: false,
        code: 'WRONG_FLAG',
        message: 'Flag ไม่ถูกต้อง ลองตรวจสอบ payload หรือ encoding ของคุณอีกครั้ง',
      };
    }

    const [solveRecord, updatedUser] = await prisma.$transaction([
      prisma.solve.create({ data: { userId: user.id, labId }, select: { solvedAt: true } }),
      prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: lab.points } },
        select: { id: true, username: true, points: true },
      }),
    ]);

    logger.info({ msg: 'Lab solved', userId: user.id, labId, pointsAwarded: lab.points });

    const newBadges = await badgesService.checkAndAwardBadges(user.id);
    const bonusPoints = newBadges.reduce((sum, b) => sum + (b.points ?? 0), 0);

    const freshUser =
      bonusPoints > 0
        ? await prisma.user.findUnique({ where: { id: user.id }, select: { points: true } })
        : updatedUser;

    const solverCount = await prisma.solve.count({ where: { labId } });

    return {
      success: true,
      isCorrect: true,
      code: 'SOLVED',
      message: 'ยินดีด้วย! คุณพิชิตด่านนี้สำเร็จ',
      earnedPoints: lab.points,
      bonusPoints,
      totalPoints: freshUser?.points ?? updatedUser.points,
      solvedAt: solveRecord.solvedAt,
      solverCount,
      isFirstBlood: solverCount === 1,
      newBadges,
      user: { id: user.id, username: user.username },
      // The player's container is no longer needed. Detached from the response:
      // stopping waits on Docker, and a player should see their reward at once.
      _cleanup: async () => {
        try {
          const activeInstance = await prisma.labInstance.findFirst({
            where: { userId: user.id, labId, status: { in: ['STARTING', 'RUNNING'] } },
          });
          if (!activeInstance) return;
          await dockerService.stopAndRemoveContainer(activeInstance.containerId);
          await prisma.labInstance.update({
            where: { id: activeInstance.id },
            data: { status: 'STOPPED', stoppedAt: new Date(), stopReason: 'SOLVED' },
          });
        } catch (e) {
          logger.warn(`Could not auto-stop instance after solve: ${e.message}`);
        }
      },
    };
  }

  async getUserSolves(userId) {
    const solves = await prisma.solve.findMany({
      where: { userId },
      select: {
        solvedAt: true,
        lab: { select: { id: true, title: true, difficulty: true, points: true, tags: true } },
      },
      orderBy: { solvedAt: 'desc' },
    });

    return solves.map((s) => ({
      labId: s.lab.id,
      title: s.lab.title,
      difficulty: s.lab.difficulty,
      points: s.lab.points,
      tags: s.lab.tags,
      solvedAt: s.solvedAt,
    }));
  }
}

export const solvesService = new SolvesService();
