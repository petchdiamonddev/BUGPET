import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { labQueue } from '../../config/queue.js';
import { logger } from '../../config/logger.js';
import { conflict, notFound, forbidden } from '../../utils/errors.js';
import { serializeInstance } from '../../utils/format.js';

const ACTIVE_STATUSES = ['STARTING', 'RUNNING'];

class InstancesService {
  /** The single active container of a user (1 user = 1 container). */
  async findActiveInstance(userId) {
    return prisma.labInstance.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      include: {
        lab: { select: { id: true, title: true, difficulty: true, points: true, timeoutMin: true, tags: true } },
      },
    });
  }

  async getActiveInstance(userId) {
    const instance = await this.findActiveInstance(userId);
    return serializeInstance(instance, { includeLab: true });
  }

  async startLabInstance(userId, labId) {
    const lab = await prisma.lab.findUnique({ where: { id: labId } });

    if (!lab || !lab.isActive) {
      throw notFound('ไม่พบด่านนี้ หรือด่านถูกปิดใช้งานอยู่');
    }

    const existingActive = await this.findActiveInstance(userId);
    if (existingActive) {
      // Re-starting the lab you already have running is idempotent, not an error.
      if (existingActive.labId === labId) {
        return { instance: serializeInstance(existingActive, { includeLab: true }), reused: true };
      }
      throw conflict(
        `คุณมีด่าน "${existingActive.lab.title}" ทำงานอยู่แล้ว — หยุดด่านเดิมก่อนเริ่มด่านใหม่`,
        'ACTIVE_INSTANCE_EXISTS',
        {
          activeInstance: serializeInstance(existingActive, { includeLab: true }),
        }
      );
    }

    // Generate unique random subdomain token (12 hex chars)
    const subdomain = crypto.randomBytes(6).toString('hex');
    // expiresAt is provisional; the worker resets it to now + timeoutMin once
    // the container is actually RUNNING, so image pulling never eats lab time.
    const expiresAt = new Date(Date.now() + lab.timeoutMin * 60 * 1000);

    // A previous instance for the same lab that errored should never block a
    // retry — the player fixed whatever was wrong (or the admin did).
    await prisma.labInstance.updateMany({
      where: { userId, labId, status: 'ERROR' },
      data: { stoppedAt: new Date(), stopReason: 'RETRIED' },
    });

    const instance = await prisma.labInstance.create({
      data: { userId, labId, subdomain, status: 'STARTING', expiresAt },
      include: {
        lab: { select: { id: true, title: true, difficulty: true, points: true, timeoutMin: true, tags: true } },
      },
    });

    try {
      await labQueue.add('start-lab', { instanceId: instance.id }, { jobId: `start-${instance.id}` });
    } catch (err) {
      await prisma.labInstance.update({
        where: { id: instance.id },
        data: { status: 'ERROR', error: `ไม่สามารถเข้าคิวสร้าง container ได้: ${err.message}` },
      });
      throw err;
    }

    logger.info({ msg: 'Enqueued start-lab job', instanceId: instance.id, subdomain });

    return { instance: serializeInstance(instance, { includeLab: true }), reused: false };
  }

  async stopLabInstance(userId, instanceId, isAdmin = false) {
    const instance = await prisma.labInstance.findUnique({ where: { id: instanceId } });

    if (!instance) throw notFound('ไม่พบข้อมูล Lab Instance');
    if (!isAdmin && instance.userId !== userId) throw forbidden('คุณไม่มีสิทธิ์หยุดด่านของผู้อื่น');

    if (instance.status === 'STOPPED') {
      return { message: 'ด่านนี้ถูกหยุดไปแล้ว', instance: serializeInstance(instance) };
    }

    // Removing the delayed timeout job keeps the queue clean.
    try {
      const timeoutJob = await labQueue.getJob(`timeout-${instance.id}`);
      if (timeoutJob) await timeoutJob.remove();
    } catch (e) {
      logger.warn(`Could not remove timeout job: ${e.message}`);
    }

    // Reflect the intent immediately so the UI can switch to "stopping" and
    // the polling loop sees the transition without waiting for the worker.
    if (instance.status === 'STARTING') {
      // Nothing running yet: stop inline, no container exists.
      await prisma.labInstance.update({
        where: { id: instance.id },
        data: {
          status: 'STOPPED',
          stoppedAt: new Date(),
          stopReason: isAdmin ? 'ADMIN_STOPPED' : 'USER_STOPPED',
        },
      });
      return { message: 'ยกเลิกการเริ่มด่านแล้ว', instance: serializeInstance({ ...instance, status: 'STOPPED' }) };
    }

    await labQueue.add(
      'stop-lab',
      { instanceId: instance.id, reason: isAdmin ? 'ADMIN_STOPPED' : 'USER_STOPPED' },
      { jobId: `stop-${instance.id}-${Date.now()}` }
    );

    return {
      message: 'กำลังหยุด container ของด่านนี้…',
      instance: serializeInstance({ ...instance, status: 'RUNNING' }),
    };
  }

  async getInstanceStatus(instanceId, userId, isAdmin = false) {
    const instance = await prisma.labInstance.findUnique({
      where: { id: instanceId },
      include: { lab: { select: { id: true, title: true, difficulty: true, points: true, timeoutMin: true } } },
    });

    if (!instance) throw notFound('ไม่พบข้อมูล Lab Instance');
    if (!isAdmin && instance.userId !== userId) throw forbidden('คุณไม่มีสิทธิ์เข้าถึง Instance นี้');

    return serializeInstance(instance, { includeLab: true, isAdmin });
  }

  /** Paginated personal history used by the profile page. */
  async getInstanceHistory(userId, { limit = 10, page = 1 } = {}) {
    const where = { userId, status: { in: ['STOPPED', 'ERROR'] } };
    const [items, total] = await Promise.all([
      prisma.labInstance.findMany({
        where,
        include: { lab: { select: { id: true, title: true, difficulty: true, points: true } } },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.labInstance.count({ where }),
    ]);

    return {
      items: items.map((i) => serializeInstance(i, { includeLab: true })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Called by the worker after a successful start. */
  async markRunning(instanceId, containerId, timeoutMin) {
    const expiresAt = new Date(Date.now() + timeoutMin * 60 * 1000);
    const instance = await prisma.labInstance.update({
      where: { id: instanceId },
      data: { status: 'RUNNING', containerId, startedAt: new Date(), expiresAt, error: null },
    });
    return instance;
  }
}

export const instancesService = new InstancesService();
export { ACTIVE_STATUSES };
