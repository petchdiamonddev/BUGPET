import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { labQueue } from '../../config/queue.js';
import { logger } from '../../config/logger.js';

class InstancesService {
  async startLabInstance(userId, labId) {
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
    });

    if (!lab || !lab.isActive) {
      const err = new Error('ไม่พบ Lab นี้หรือ Lab ยังไม่เปิดใช้งาน');
      err.status = 404;
      throw err;
    }

    // Constraint: 1 user = 1 container only
    const existingActive = await prisma.labInstance.findFirst({
      where: {
        userId,
        status: { in: ['STARTING', 'RUNNING'] },
      },
      include: { lab: true },
    });

    if (existingActive) {
      const err = new Error(
        `คุณมี Lab "${existingActive.lab.title}" กำลังทำงานอยู่แล้ว กรุณากดหยุด Lab เดิมก่อนเริ่ม Lab ใหม่`
      );
      err.status = 409;
      err.activeInstanceId = existingActive.id;
      throw err;
    }

    // Generate unique random subdomain token
    const subdomain = crypto.randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + lab.timeoutMin * 60 * 1000);

    const instance = await prisma.labInstance.create({
      data: {
        userId,
        labId,
        subdomain,
        status: 'STARTING',
        expiresAt,
      },
      include: {
        lab: {
          select: { title: true, difficulty: true, points: true, timeoutMin: true },
        },
      },
    });

    // Enqueue BullMQ job to create and run the container
    await labQueue.add('start-lab', { instanceId: instance.id });

    const baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';
    const url = `http://${subdomain}.${baseDomain}`;

    logger.info({ msg: 'Enqueued start-lab job', instanceId: instance.id, subdomain, url });

    return {
      id: instance.id,
      labId: instance.labId,
      labTitle: instance.lab.title,
      subdomain: instance.subdomain,
      url,
      status: instance.status,
      startedAt: instance.startedAt,
      expiresAt: instance.expiresAt,
    };
  }

  async stopLabInstance(userId, instanceId, isAdmin = false) {
    const instance = await prisma.labInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      const err = new Error('ไม่พบข้อมูล Lab Instance');
      err.status = 404;
      throw err;
    }

    if (!isAdmin && instance.userId !== userId) {
      const err = new Error('คุณไม่มีสิทธิ์หยุด Lab ของผู้อื่น');
      err.status = 403;
      throw err;
    }

    if (instance.status === 'STOPPED') {
      return { message: 'Lab นี้หยุดการทำงานไปแล้ว', status: 'STOPPED' };
    }

    // Remove scheduled timeout job if exists
    try {
      const timeoutJob = await labQueue.getJob(`timeout-${instance.id}`);
      if (timeoutJob) {
        await timeoutJob.remove();
      }
    } catch (e) {
      logger.warn(`Could not remove timeout job: ${e.message}`);
    }

    // Enqueue immediate stop job
    await labQueue.add('stop-lab', {
      instanceId: instance.id,
      reason: isAdmin ? 'ADMIN_STOPPED' : 'USER_STOPPED',
    });

    return {
      id: instance.id,
      message: 'กำลังหยุดการทำงานของ Lab Instance',
      status: 'STOPPED',
    };
  }

  async getActiveInstance(userId) {
    const instance = await prisma.labInstance.findFirst({
      where: {
        userId,
        status: { in: ['STARTING', 'RUNNING'] },
      },
      include: {
        lab: {
          select: { id: true, title: true, difficulty: true, points: true },
        },
      },
    });

    if (!instance) return null;

    const baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';
    return {
      id: instance.id,
      labId: instance.labId,
      labTitle: instance.lab.title,
      subdomain: instance.subdomain,
      url: `http://${instance.subdomain}.${baseDomain}`,
      status: instance.status,
      startedAt: instance.startedAt,
      expiresAt: instance.expiresAt,
    };
  }

  async getInstanceStatus(instanceId, userId, isAdmin = false) {
    const instance = await prisma.labInstance.findUnique({
      where: { id: instanceId },
      include: { lab: true },
    });

    if (!instance) {
      const err = new Error('ไม่พบข้อมูล Lab Instance');
      err.status = 404;
      throw err;
    }

    if (!isAdmin && instance.userId !== userId) {
      const err = new Error('คุณไม่มีสิทธิ์เข้าถึงข้อมูล Instance นี้');
      err.status = 403;
      throw err;
    }

    const baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';
    return {
      id: instance.id,
      labId: instance.labId,
      labTitle: instance.lab.title,
      subdomain: instance.subdomain,
      url: `http://${instance.subdomain}.${baseDomain}`,
      status: instance.status,
      startedAt: instance.startedAt,
      expiresAt: instance.expiresAt,
      stoppedAt: instance.stoppedAt,
      error: instance.error,
    };
  }
}

export const instancesService = new InstancesService();
