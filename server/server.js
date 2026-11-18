import 'dotenv/config';
import app from './app.js';
import { logger } from './src/config/logger.js';
import { startLabWorker } from './src/workers/labWorker.js';
import { badgesService } from './src/modules/badges/badges.service.js';
import { checkDockerHealth } from './src/config/docker.js';
import { dockerService } from './src/services/docker.service.js';

const PORT = Number.parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    const isDockerReady = await checkDockerHealth();
    if (isDockerReady) {
      logger.info('Docker daemon is connected');
    } else {
      logger.warn('Docker daemon is unreachable — labs will fail to start until Docker Desktop is running');
    }

    try {
      await badgesService.ensureBadgesExist();
      logger.info('Default badges verified');
    } catch (e) {
      logger.warn(`Could not sync badges to DB yet: ${e.message}`);
    }

    // Route files left behind by a previous run point at containers that no
    // longer exist — clear them before anything else touches Traefik.
    if (isDockerReady) {
      await dockerService.pruneStaleRouteConfigs();
    }

    let worker;
    try {
      worker = startLabWorker();
      logger.info('BullMQ lab lifecycle worker started');
    } catch (e) {
      logger.warn(`Could not start BullMQ worker: ${e.message}`);
    }

    const server = app.listen(PORT, () => {
      logger.info(`PETBUG API listening on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down…`);
      try {
        await worker?.close();
      } catch (e) {
        logger.warn(`Worker close failed: ${e.message}`);
      }
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 5000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error({ msg: 'Bootstrap failed', error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
