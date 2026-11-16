import { prisma } from '../../config/prisma.js';

class LabsService {
  async getAllLabs(userId = null, { difficulty, search } = {}) {
    const where = {
      isActive: true,
      ...(difficulty ? { difficulty } : {}),
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
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        dockerImage: true,
        points: true,
        timeoutMin: true,
        tags: true,
        createdAt: true,
        _count: {
          select: { solves: true },
        },
        solves: userId
          ? {
              where: { userId },
              select: { id: true, solvedAt: true },
            }
          : false,
      },
      orderBy: { id: 'asc' },
    });

    return labs.map((lab) => {
      const isSolved = userId ? (lab.solves && lab.solves.length > 0) : false;
      const solvesCount = lab._count?.solves || 0;
      const { _count, solves, ...rest } = lab;
      return {
        ...rest,
        isSolved,
        solvesCount,
      };
    });
  }

  async getLabById(labId, userId = null, isAdmin = false) {
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        _count: { select: { solves: true } },
        solves: userId
          ? {
              where: { userId },
              select: { solvedAt: true },
            }
          : false,
      },
    });

    if (!lab) {
      throw new Error('ไม่พบข้อมูล Lab ที่ระบุ');
    }

    let activeInstance = null;
    if (userId) {
      activeInstance = await prisma.labInstance.findFirst({
        where: {
          userId,
          labId,
          status: { in: ['STARTING', 'RUNNING'] },
        },
      });
    }

    const isSolved = userId ? (lab.solves && lab.solves.length > 0) : false;
    const baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';

    const safeLab = {
      ...lab,
      flag: isAdmin ? lab.flag : undefined, // Hide flag from regular users
      isSolved,
      solvesCount: lab._count.solves,
      activeInstance: activeInstance
        ? {
            id: activeInstance.id,
            status: activeInstance.status,
            subdomain: activeInstance.subdomain,
            url: `http://${activeInstance.subdomain}.${baseDomain}`,
            expiresAt: activeInstance.expiresAt,
            startedAt: activeInstance.startedAt,
          }
        : null,
    };

    delete safeLab._count;
    delete safeLab.solves;

    return safeLab;
  }

  async createLab(data) {
    const lab = await prisma.lab.create({
      data,
    });
    return lab;
  }

  async updateLab(id, data) {
    const existing = await prisma.lab.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('ไม่พบ Lab ที่ต้องการแก้ไข');
    }
    const lab = await prisma.lab.update({
      where: { id },
      data,
    });
    return lab;
  }

  async deleteLab(id) {
    const existing = await prisma.lab.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('ไม่พบ Lab ที่ต้องการลบ');
    }
    await prisma.lab.delete({ where: { id } });
    return { success: true, message: 'ลบ Lab เรียบร้อยแล้ว' };
  }
}

export const labsService = new LabsService();
