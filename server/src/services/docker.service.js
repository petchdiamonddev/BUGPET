import { docker } from '../config/docker.js';
import { logger } from '../config/logger.js';

class DockerService {
  constructor() {
    this.networkName = process.env.TRAEFIK_NETWORK || 'petbug_net';
    this.baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';
  }

  async ensureNetworkExists() {
    try {
      const networks = await docker.listNetworks();
      const exists = networks.some((n) => n.Name === this.networkName);
      if (!exists) {
        logger.info(`Creating Docker network: ${this.networkName}`);
        await docker.createNetwork({
          Name: this.networkName,
          Driver: 'bridge',
          CheckDuplicate: true,
        });
      }
    } catch (err) {
      logger.warn({ msg: 'Ensure network error', error: err.message });
    }
  }

  async ensureImageExists(imageName) {
    try {
      const images = await docker.listImages();
      const exists = images.some((img) =>
        (img.RepoTags || []).some((tag) => tag === imageName || tag.startsWith(`${imageName}:`))
      );
      if (!exists) {
        logger.info(`Pulling Docker image: ${imageName}...`);
        await new Promise((resolve, reject) => {
          docker.pull(imageName, (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err, res) => {
              if (err) return reject(err);
              resolve(res);
            });
          });
        });
        logger.info(`Image pulled successfully: ${imageName}`);
      }
    } catch (err) {
      logger.error({ msg: `Failed to ensure image: ${imageName}`, error: err.message });
      throw new Error(`ไม่สามารถโหลด Docker Image (${imageName}) ได้: ${err.message}`);
    }
  }

  async createLabContainer({ subdomain, dockerImage, flag, containerPort = 80 }) {
    await this.ensureNetworkExists();
    await this.ensureImageExists(dockerImage);

    const routerName = `lab-${subdomain}`;
    const domain = `${subdomain}.${this.baseDomain}`;

    const labels = {
      'traefik.enable': 'true',
      [`traefik.http.routers.${routerName}.rule`]: `Host(\`${domain}\`)`,
      [`traefik.http.routers.${routerName}.entrypoints`]: 'web',
      [`traefik.http.services.${routerName}.loadbalancer.server.port`]: String(containerPort),
      'petbug.managed': 'true',
      'petbug.subdomain': subdomain,
    };

    const containerConfig = {
      Image: dockerImage,
      name: `petbug-lab-${subdomain}`,
      Env: [`FLAG=${flag}`, `SUBDOMAIN=${subdomain}`, `NODE_ENV=production`],
      Labels: labels,
      HostConfig: {
        NetworkMode: this.networkName,
        Memory: 256 * 1024 * 1024, // 256 MB Limit
        NanoCpus: 1000000000,      // 1.0 CPU Limit
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges:true'],
      },
    };

    logger.info({ msg: 'Creating lab container', subdomain, image: dockerImage, domain });
    const container = await docker.createContainer(containerConfig);
    await container.start();

    return {
      containerId: container.id,
      subdomain,
      url: `http://${domain}`,
    };
  }

  async stopAndRemoveContainer(containerId) {
    if (!containerId) return;

    try {
      const container = docker.getContainer(containerId);
      const inspection = await container.inspect();

      if (inspection.State.Running) {
        logger.info(`Stopping container: ${containerId}`);
        await container.stop({ t: 5 });
      }

      logger.info(`Removing container: ${containerId}`);
      await container.remove({ force: true });
    } catch (err) {
      // 404 means container is already gone
      if (err.statusCode === 404) {
        logger.warn(`Container already removed or not found: ${containerId}`);
        return;
      }
      logger.error({ msg: `Error stopping/removing container ${containerId}`, error: err.message });
      throw err;
    }
  }

  async getContainerHealth(containerId) {
    if (!containerId) return null;
    try {
      const container = docker.getContainer(containerId);
      const info = await container.inspect();
      return {
        id: info.Id,
        status: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
      };
    } catch (err) {
      return null;
    }
  }
}

export const dockerService = new DockerService();
