import { prisma } from '../../config/prisma.js';
import { badgesService } from '../badges/badges.service.js';
import { instancesService } from '../instances/instances.service.js';
import { logger } from '../../config/logger.js';

class SolvesService {
  async submitFlag(userId, labId, submittedFlag) {
    if (!submittedFlag || typeof submittedFlag !== 'string') {
      const err = new Error('กรุณาระบุ Flag ที่ถูกต้อง');
      err.status = 400;
      throw err;
    }

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
    });

    if (!lab || !lab.isActive) {
      const err = new Error('ไม่พบข้อมูล Lab หรือ Lab ไม่ได้เปิดใช้งาน');
      err.status = 404;
      throw err;
    }

    // Check if user already solved this lab
    const existingSolve = await prisma.solve.findUnique({
      where: {
        userId_labId: {
          userId,
          labId,
        },
      },
    });

    if (existingSolve) {
      const err = new Error('คุณเคยพิชิต Lab นี้และได้รับคะแนนไปแล้ว');
      err.status = 400;
      throw err;
    }

    // Compare flag
    const isCorrect = submittedFlag.trim() === lab.flag.trim();
    if (!isCorrect) {
      return {
        success: false,
        isCorrect: false,
        message: '❌ Flag ไม่ถูกต้อง! กรุณาตรวจสอบและลองใหม่อีกครั้ง',
      };
    }

    // Correct flag: record solve and add points in transaction
    const [solveRecord, updatedUser] = await prisma.$transaction([
      prisma.solve.create({
        data: {
          userId,
          labId,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          points: { increment: lab.points },
        },
        select: {
          id: true,
          username: true,
          points: true,
        },
      }),
    ]);

    logger.info({ msg: 'Lab solved successfully', userId, labId, pointsAwarded: lab.points });

    // Check and award badges
    const newBadges = await badgesService.checkAndAwardBadges(userId, labId);

    // If user has an active instance for this lab, stop it gracefully
    try {
      const activeInstance = await prisma.labInstance.findFirst({
        where: {
          userId,
          labId,
          status: { in: ['STARTING', 'RUNNING'] },
        },
      });
      if (activeInstance) {
        await instancesService.stopLabInstance(userId, activeInstance.id, false);
      }
    } catch (e) {
      logger.warn(`Could not auto-stop instance after solve: ${e.message}`);
    }

    return {
      success: true,
      isCorrect: true,
      message: '🎉 ยินดีด้วย! คุณพิชิต Lab นี้สำเร็จแล้ว',
      earnedPoints: lab.points,
      totalPoints: updatedUser.points,
      newBadges,
    };
  }

  async getUserSolves(userId) {
    const solves = await prisma.solve.findMany({
      where: { userId },
      include: {
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
    });

    return solves.map((s) => ({
      labId: s.lab.id,
      title: s.lab.title,
      difficulty: s.lab.difficulty,
      points: s.lab.points,
      solvedAt: s.solvedAt,
    }));
  }
}

export const solvesService = new SolvesService();
