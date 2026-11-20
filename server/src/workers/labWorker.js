import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { LAB_QUEUE_NAME, labQueue } from '../config/queue.js';
import { prisma } from '../config/prisma.js';
import { dockerService } from '../services/docker.service.js';
import { logger } from '../config/logger.js';
import { instancesService } from '../modules/instances/instances.service.js';

const START_PULL_TIMEOUT_MS = 5 * 60 * 1000;

async function handleStartLab({ instanceId }) {
  const instance = await prisma.labInstance.findUnique({
    where: { id: instanceId },
    include: { lab: true },
  });

  if (!instance) {
    logger.warn({ msg: 'LabInstance not found, skipping start', instanceId });
    return;
  }

  // The user may have pressed Stop (or it expired / was terminated by an
  // admin) while the job was queued. Stop always wins.
  if (instance.status !== 'STARTING') {
    logger.info({ msg: 'Instance no longer STARTING, skipping', instanceId, status: instance.status });
    return;
  }

  let containerId = null;
  try {
    ({ containerId } = await dockerService.createLabContainer({
      subdomain: instance.subdomain,
      dockerImage: instance.lab.dockerImage,
      flag: instance.lab.flag,
    }));

    // Do not announce RUNNING until the target process and route have had a
    // chance to come up. This avoids handing the player a URL that still
    // returns a startup error.
    await dockerService.waitForContainerReady(containerId);

    // Re-check after the (potentially slow) image pull: if it was cancelled in
    // the meantime, tear the container down again instead of leaking it.
    const latest = await prisma.labInstance.findUnique({ where: { id: instanceId }, select: { status: true } });
    if (latest?.status !== 'STARTING') {
      logger.info({ msg: 'Instance cancelled during start, removing container', instanceId });
      await dockerService.stopAndRemoveContainer(containerId);
      return;
    }

    const timeoutMs = instance.lab.timeoutMin * 60 * 1000;
    await instancesService.markRunning(instanceId, containerId, instance.lab.timeoutMin);

    await labQueue.add(
      'stop-lab',
      { instanceId, reason: 'TIMEOUT' },
      { delay: timeoutMs, jobId: `timeout-${instanceId}`, removeOnComplete: true }
    );

    logger.info({ msg: 'Lab started successfully', instanceId, containerId, timeoutMin: instance.lab.timeoutMin });
  } catch (err) {
    logger.error({ msg: `Failed to start lab instance ${instanceId}`, error: err.message });
    // A readiness failure happens after Docker has already created the
    // container. Remove it (and its route) so a retry starts cleanly.
    if (containerId) {
      await dockerService.stopAndRemoveContainer(containerId).catch((cleanupError) =>
        logger.warn({ msg: 'Could not clean up failed lab container', instanceId, error: cleanupError.message })
      );
    }
    await prisma.labInstance.update({
      where: { id: instanceId },
      data: { status: 'ERROR', error: err.message, stoppedAt: new Date(), stopReason: 'START_FAILED' },
    });
    throw err;
  }
}

async function handleStopLab({ instanceId, reason = 'USER_STOPPED' }) {
  const instance = await prisma.labInstance.findUnique({ where: { id: instanceId } });
  if (!instance) return;

  if (instance.status === 'STOPPED') {
    logger.info({ msg: 'Instance already stopped', instanceId });
    return;
  }

  // A STARTING instance that is being stopped has no container yet; the
  // start job re-checks the status and will clean up after itself.
  if (instance.containerId) {
    try {
      await dockerService.stopAndRemoveContainer(instance.containerId);
    } catch (err) {
      logger.error({ msg: `Failed to stop container ${instanceId}`, error: err.message });
    }
  }
  dockerService.removeTraefikRouteConfig(instance.subdomain);

  await prisma.labInstance.update({
    where: { id: instanceId },
    data: { status: 'STOPPED', stoppedAt: new Date(), stopReason: reason },
  });

  logger.info({ msg: 'Lab instance stopped', instanceId, reason });
}

/**
 * Safety net for expired instances whose delayed job was lost (Redis
 * restart, worker downtime…). Runs on boot and then every 60 seconds.
 */
async function sweepExpiredInstances() {
  const expired = await prisma.labInstance.findMany({
    where: { status: { in: ['RUNNING', 'STARTING'] }, expiresAt: { lt: new Date() } },
    select: { id: true, status: true, startedAt: true, expiresAt: true },
    take: 50,
  });

  for (const instance of expired) {
    // STARTING instances get a grace period because the image may still be pulling.
    if (instance.status === 'STARTING' && Date.now() - instance.startedAt.getTime() < START_PULL_TIMEOUT_MS) {
      continue;
    }
    logger.warn({ msg: 'Sweeping expired instance', instanceId: instance.id, status: instance.status });
    await labQueue.add(
      'stop-lab',
      { instanceId: instance.id, reason: 'TIMEOUT' },
      { jobId: `sweep-${instance.id}-${Date.now()}` }
    );
  }
}

export const startLabWorker = () => {
  const worker = new Worker(
    LAB_QUEUE_NAME,
    async (job) => {
      logger.debug?.({ msg: `Processing job ${job.name}`, jobId: job.id });
      if (job.name === 'start-lab') return handleStartLab(job.data);
      if (job.name === 'stop-lab') return handleStopLab(job.data);
      logger.warn({ msg: 'Unknown job name', name: job.name });
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ msg: `Job ${job?.id} (${job?.name}) failed`, error: err.message });
  });

  sweepExpiredInstances().catch((e) => logger.warn(`Expired instance sweep failed: ${e.message}`));
  const sweeper = setInterval(() => {
    sweepExpiredInstances().catch((e) => logger.warn(`Expired instance sweep failed: ${e.message}`));
  }, 60 * 1000);
  sweeper.unref?.();

  worker.on('closing', () => clearInterval(sweeper));

  return worker;
};
