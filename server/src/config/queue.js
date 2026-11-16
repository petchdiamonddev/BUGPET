import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';
import { logger } from './logger.js';

export const LAB_QUEUE_NAME = 'lab-lifecycle';

export const labQueue = new Queue(LAB_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});

labQueue.on('error', (err) => {
  logger.warn({ msg: 'BullMQ Queue connection warning', error: err.message });
});
