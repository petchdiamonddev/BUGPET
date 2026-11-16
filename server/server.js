import 'dotenv/config';
import app from './app.js';
import { logger } from './src/config/logger.js';
import { startLabWorker } from './src/workers/labWorker.js';
import { badgesService } from './src/modules/badges/badges.service.js';
import { checkDockerHealth } from './src/config/docker.js';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Check Docker daemon availability
    const isDockerReady = await checkDockerHealth();
    if (isDockerReady) {
      logger.info('🐳 Docker daemon is connected and healthy');
    } else {
      logger.warn('⚠️ Docker daemon is currently unreachable. Make sure Docker Desktop / daemon is running.');
    }

    // 2. Ensure default badges exist in database
    try {
      await badgesService.ensureBadgesExist();
      logger.info('🏅 Default badges verified');
    } catch (e) {
      logger.warn(`Could not sync badges to DB yet: ${e.message}`);
    }

    // 3. Start BullMQ background worker
    let worker;
    try {
      worker = startLabWorker();
      logger.info('⚙️ BullMQ Lab Lifecycle worker started');
    } catch (e) {
      logger.warn(`Could not start BullMQ worker: ${e.message}`);
    }

    // 4. Start HTTP Server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 PETBUG Server is running on http://localhost:${PORT}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, gracefully shutting down...`);
      if (worker) {
        await worker.close();
      }
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error({ msg: 'Bootstrap failed', error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
