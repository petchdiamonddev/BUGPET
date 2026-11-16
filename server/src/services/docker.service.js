import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { docker } from '../config/docker.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DockerService {
  constructor() {
    this.networkName = process.env.TRAEFIK_NETWORK || 'petbug_net';
    this.baseDomain = process.env.BASE_LAB_DOMAIN || 'lab.localhost';
    // Directory where Traefik reads dynamic routing configs
    this.traefikDynamicDir = path.resolve(__dirname, '../../../traefik/dynamic');
    if (!fs.existsSync(this.traefikDynamicDir)) {
      try {
        fs.mkdirSync(this.traefikDynamicDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
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

  writeTraefikRouteConfig(subdomain, containerName, port) {
    const domain = `${subdomain}.${this.baseDomain}`;
    const routerName = `lab-${subdomain}`;
    const configPath = path.join(this.traefikDynamicDir, `lab-${subdomain}.yaml`);

    const yamlContent = `http:
  routers:
    ${routerName}:
      rule: "Host(\`${domain}\`)"
      entryPoints:
        - web
      service: ${routerName}
  services:
    ${routerName}:
      loadBalancer:
        servers:
          - url: "http://${containerName}:${port}"
`;

    fs.writeFileSync(configPath, yamlContent, 'utf8');
    logger.info({ msg: 'Wrote Traefik dynamic route config', configPath, domain, target: `http://${containerName}:${port}` });
  }

  removeTraefikRouteConfig(subdomain) {
    const configPath = path.join(this.traefikDynamicDir, `lab-${subdomain}.yaml`);
    if (fs.existsSync(configPath)) {
      try {
        fs.unlinkSync(configPath);
        logger.info({ msg: 'Removed Traefik dynamic route config', configPath });
      } catch (err) {
        logger.warn({ msg: 'Could not remove Traefik config', error: err.message });
      }
    }
  }

  async createLabContainer({ subdomain, dockerImage, flag, containerPort = null }) {
    await this.ensureNetworkExists();
    await this.ensureImageExists(dockerImage);

    // Auto-detect exposed port from Docker image metadata if not explicitly provided
    let targetPort = containerPort;
    if (!targetPort) {
      try {
        const imageInfo = await docker.getImage(dockerImage).inspect();
        const exposed = Object.keys(imageInfo.Config?.ExposedPorts || {});
        if (exposed.length > 0) {
          targetPort = parseInt(exposed[0].split('/')[0], 10);
          logger.info(`Auto-detected port ${targetPort} for image ${dockerImage}`);
        } else {
          targetPort = 80;
        }
      } catch (e) {
        logger.warn(`Could not inspect image exposed ports, defaulting to 80: ${e.message}`);
        targetPort = 80;
      }
    }

    const containerName = `petbug-lab-${subdomain}`;
    const routerName = `lab-${subdomain}`;
    const domain = `${subdomain}.${this.baseDomain}`;

    const labels = {
      'traefik.enable': 'true',
      [`traefik.http.routers.${routerName}.rule`]: `Host(\`${domain}\`)`,
      [`traefik.http.routers.${routerName}.entrypoints`]: 'web',
      [`traefik.http.services.${routerName}.loadbalancer.server.port`]: String(targetPort),
      'petbug.managed': 'true',
      'petbug.subdomain': subdomain,
    };

    const containerConfig = {
      Image: dockerImage,
      name: containerName,
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

    logger.info({ msg: 'Creating lab container', subdomain, image: dockerImage, domain, targetPort });
    const container = await docker.createContainer(containerConfig);
    await container.start();

    // Write Traefik dynamic file route
    this.writeTraefikRouteConfig(subdomain, containerName, targetPort);

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

      // Look for subdomain from container labels to clean up config file
      const subdomain = inspection.Config?.Labels?.['petbug.subdomain'];
      if (subdomain) {
        this.removeTraefikRouteConfig(subdomain);
      }

      if (inspection.State.Running) {
        logger.info(`Stopping container: ${containerId}`);
        await container.stop({ t: 5 });
      }

      logger.info(`Removing container: ${containerId}`);
      await container.remove({ force: true });
    } catch (err) {
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
