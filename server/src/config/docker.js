import Docker from 'dockerode';
import os from 'os';
import { logger } from './logger.js';

let dockerOptions = {};

if (process.env.DOCKER_HOST) {
  try {
    const url = new URL(process.env.DOCKER_HOST);
    dockerOptions = {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 2375,
    };
  } catch (e) {
    logger.warn(`Invalid DOCKER_HOST: ${process.env.DOCKER_HOST}`);
  }
} else if (os.platform() === 'win32') {
  dockerOptions = {
    socketPath: '//./pipe/docker_engine',
  };
} else {
  dockerOptions = {
    socketPath: '/var/run/docker.sock',
  };
}

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
