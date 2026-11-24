import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { badgesService } from '../badges/badges.service.js';
import { logger } from '../../config/logger.js';
import { badRequest, notFound } from '../../utils/errors.js';

class SolvesService {
  /**
   * ตรวจสอบ Flag แบบป้องกัน Timing Attack (Constant-time comparison)
   */
  async submitFlag(user, labId, submittedFlag) {
    const lab = await prisma.lab.findUnique({ where: { id: labId } });

    if (!lab || !lab.isActive) {
      throw notFound('ไม่พบโจทย์แล็บนี้ หรือโจทย์ถูกปิดใช้งานอยู่');
    }

    const existingSolve = await prisma.solve.findUnique({
      where: { userId_labId: { userId: user.id, labId } },
    });
    if (existingSolve) {
      throw badRequest('คุณเคยพิชิตโจทย์แล็บนี้ไปแล้ว', 'ALREADY_SOLVED', {
        solvedAt: existingSolve.solvedAt,
      });
    }

    // ป้องกัน Timing Attack ด้วย crypto.timingSafeEqual
    const submittedBuf = Buffer.from(String(submittedFlag ?? '').trim());
    const expectedBuf = Buffer.from(lab.flag.trim());
    const isCorrect =
      submittedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(submittedBuf, expectedBuf);

    if (!isCorrect) {
      return {
        success: false,
        isCorrect: false,
        code: 'WRONG_FLAG',
        message: 'Flag ไม่ถูกต้อง กรุณาตรวจสอบคำตอบอีกครั้ง',
      };
    }

    // บันทึกผลการแก้โจทย์และเพิ่มคะแนนแบบ Atomic Transaction
    const [solveRecord, updatedUser] = await prisma.$transaction([
      prisma.solve.create({
        data: { userId: user.id, labId },
        select: { solvedAt: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: lab.points } },
        select: { id: true, username: true, points: true },
      }),
    ]);

    logger.info({ msg: 'Lab solved', userId: user.id, labId, pointsAwarded: lab.points });

    // ตรวจสอบและมอบเหรียญรางวัล (Badges)
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
      message: 'ยินดีด้วย! คุณพิชิตโจทย์แล็บนี้สำเร็จ',
      earnedPoints: lab.points,
      bonusPoints,
      totalPoints: freshUser?.points ?? updatedUser.points,
      solvedAt: solveRecord.solvedAt,
      solverCount,
      isFirstBlood: solverCount === 1,
      newBadges,
      user: { id: user.id, username: user.username },
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
