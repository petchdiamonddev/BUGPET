import Docker from 'dockerode';
import os from 'os';
import fs from 'fs';
import { logger } from './logger.js';

let dockerOptions = {};

/**
 * Resolution order:
 *   1. DOCKER_SOCKET  – explicit socket path (inside the API container this is
 *                        `/var/run/docker.sock` mounted from the host).
 *   2. DOCKER_HOST    – a tcp:// URL (Docker Desktop "expose daemon").
 *   3. platform default.
 */
if (process.env.DOCKER_SOCKET && fs.existsSync(process.env.DOCKER_SOCKET)) {
  dockerOptions = { socketPath: process.env.DOCKER_SOCKET };
} else if (process.env.DOCKER_HOST && !process.env.DOCKER_HOST.startsWith('npipe')) {
  try {
    const url = new URL(process.env.DOCKER_HOST);
    dockerOptions = { host: url.hostname, port: url.port ? parseInt(url.port, 10) : 2375 };
  } catch (e) {
    logger.warn(`Invalid DOCKER_HOST: ${process.env.DOCKER_HOST}`);
  }
} else if (os.platform() === 'win32') {
  dockerOptions = { socketPath: '//./pipe/docker_engine' };
} else {
  dockerOptions = { socketPath: '/var/run/docker.sock' };
}

logger.info({ msg: 'Docker client configured', target: dockerOptions.socketPath ?? `${dockerOptions.host}:${dockerOptions.port}` });

export const docker = new Docker(dockerOptions);

export async function checkDockerHealth() {
  try {
    const ping = await docker.ping();
    return ping.toString() === 'OK';
  } catch (err) {
    logger.warn({ msg: 'Docker ping failed', error: err.message });
    return false;
  }
}
