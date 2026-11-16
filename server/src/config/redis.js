import Redis from 'ioredis';
import { logger } from './logger.js';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis({
  ...redisConnection,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info(`Redis connected to ${redisHost}:${redisPort}`);
});

redisClient.on('error', (err) => {
  logger.warn({ msg: 'Redis error occurred', error: err.message });
});
