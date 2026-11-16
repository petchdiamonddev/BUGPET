import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { LAB_QUEUE_NAME, labQueue } from '../config/queue.js';
import { prisma } from '../config/prisma.js';
import { dockerService } from '../services/docker.service.js';
import { logger } from '../config/logger.js';

export const startLabWorker = () => {
  const worker = new Worker(
    LAB_QUEUE_NAME,
    async (job) => {
      logger.info({ msg: `Processing job ${job.name}`, jobId: job.id, data: job.data });

      if (job.name === 'start-lab') {
        const { instanceId } = job.data;

        const instance = await prisma.labInstance.findUnique({
          where: { id: instanceId },
          include: { lab: true },
        });

        if (!instance) {
          throw new Error(`LabInstance not found: ${instanceId}`);
        }

        if (instance.status === 'STOPPED') {
          logger.info(`Instance ${instanceId} was stopped before starting, skipping.`);
          return;
        }

        try {
          const { containerId } = await dockerService.createLabContainer({
            subdomain: instance.subdomain,
            dockerImage: instance.lab.dockerImage,
            flag: instance.lab.flag,
          });

          const timeoutMs = instance.lab.timeoutMin * 60 * 1000;
          const expiresAt = new Date(Date.now() + timeoutMs);

          await prisma.labInstance.update({
            where: { id: instanceId },
            data: {
              status: 'RUNNING',
              containerId,
              expiresAt,
            },
          });

          // Schedule auto-stop when lab times out
          await labQueue.add(
            'stop-lab',
            { instanceId, reason: 'TIMEOUT' },
            {
              delay: timeoutMs,
              jobId: `timeout-${instanceId}`,
            }
          );

          logger.info({ msg: `Lab started successfully`, instanceId, containerId, expiresAt });
        } catch (err) {
          logger.error({ msg: `Failed to start lab instance ${instanceId}`, error: err.message });
          await prisma.labInstance.update({
            where: { id: instanceId },
            data: {
              status: 'ERROR',
              error: err.message,
            },
          });
          throw err;
        }
      }

      if (job.name === 'stop-lab') {
        const { instanceId, reason } = job.data;

        const instance = await prisma.labInstance.findUnique({
          where: { id: instanceId },
        });

        if (!instance) return;

        if (instance.status === 'STOPPED') {
          logger.info(`Instance ${instanceId} is already stopped.`);
          return;
        }

        try {
          if (instance.containerId) {
            await dockerService.stopAndRemoveContainer(instance.containerId);
          }

          await prisma.labInstance.update({
            where: { id: instanceId },
            data: {
              status: 'STOPPED',
              stoppedAt: new Date(),
            },
          });

          logger.info({ msg: `Lab instance stopped`, instanceId, reason });
        } catch (err) {
          logger.error({ msg: `Failed to stop lab instance ${instanceId}`, error: err.message });
          throw err;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error({ msg: `Job ${job?.id} failed`, error: err.message });
  });

  return worker;
};
