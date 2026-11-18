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
    // Directory where Traefik reads dynamic routing configs (shared volume in
    // the Docker deployment, ../traefik/dynamic when running on the host).
    this.traefikDynamicDir = process.env.TRAEFIK_DYNAMIC_DIR
      ? path.resolve(process.env.TRAEFIK_DYNAMIC_DIR)
      : path.resolve(__dirname, '../../../traefik/dynamic');
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
      // Traefik and API share this network, so the host "connected" check is
      // only a warning: in Docker the network is created by compose.
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
      if (exists) return;
      if (process.env.LAB_ALLOW_PULL === 'false') {
        throw new Error('image not present locally and LAB_ALLOW_PULL=false');
      }

      logger.info(`Pulling Docker image: ${imageName}...`);
      await new Promise((resolve, reject) => {
        docker.pull(imageName, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
        });
      });
      logger.info(`Image pulled successfully: ${imageName}`);
    } catch (err) {
      logger.error({ msg: `Failed to ensure image: ${imageName}`, error: err.message });
      throw new Error(`ไม่สามารถโหลด Docker Image (${imageName}) ได้: ${err.message}`);
    }
  }

  writeTraefikRouteConfig(subdomain, containerName, port) {
    const base = process.env.BASE_LAB_DOMAIN || '127.0.0.1.nip.io';
    const domains = [
      `${subdomain}.${base}`,
      `${subdomain}.127.0.0.1.nip.io`,
      `${subdomain}.localtest.me`,
      `${subdomain}.localhost`,
    ];
    const uniqueDomains = Array.from(new Set(domains));
    // Traefik matches Host() case-insensitively and ignores the port, so a
    // plain Host() per candidate domain is all that is needed. One bad route
    // file makes Traefik reject the whole dynamic config, so keep it simple
    // and avoid escapes.
    const hostRule = uniqueDomains.map((d) => `Host(\`${d}\`)`).join(' || ');
    const routerName = `lab-${subdomain}`;
    const configPath = path.join(this.traefikDynamicDir, `lab-${subdomain}.yaml`);

    // With TLS enabled the lab gets an HTTP router that redirects to HTTPS plus
    // an HTTPS router that terminates with the wildcard cert from ACME.
    const tls = String(process.env.TLS_ENABLED).toLowerCase() === 'true';
    const routers = tls
      ? `    ${routerName}:
      rule: "${hostRule}"
      entryPoints:
        - web
      middlewares:
        - lab-redirect-https
      service: ${routerName}
    ${routerName}-tls:
      rule: "${hostRule}"
      entryPoints:
        - websecure
      service: ${routerName}
      tls:
        certResolver: le
`
      : `    ${routerName}:
      rule: "${hostRule}"
      entryPoints:
        - web
      service: ${routerName}
`;

    const yamlContent = `http:
  routers:
${routers}  services:
    ${routerName}:
      loadBalancer:
        servers:
          - url: "http://${containerName}:${port}"
`;

    fs.writeFileSync(configPath, yamlContent, 'utf8');
    logger.info({ msg: 'Wrote Traefik dynamic route config', configPath, hostRule, tls, target: `http://${containerName}:${port}` });
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

  /**
   * Route reload strategy.
   *
   * Traefik's file provider watches the dynamic directory, but that watcher is
   * unreliable for bind mounts on Docker Desktop (Windows/macOS) and needs a
   * configurable "force reload" elsewhere. Modes (TRAEFIK_RELOAD):
   *   restart    – `docker restart` the Traefik container (always works)
   *   signal     – send SIGHUP to Traefik (Traefik ≥ 3.3 reloads config)
   *   watch      – do nothing, rely on the provider watcher (Linux dev)
   *
   * Restarts are coalesced so a burst of lab starts causes a single reload.
   * TRAEFIK_CONTAINER can pin the container name (needed in production where
   * the API runs *inside* Docker and must address the Traefik container).
   */
  scheduleTraefikReload(reason = 'route changed') {
    const mode = (process.env.TRAEFIK_RELOAD || 'restart').toLowerCase();
    if (mode === 'watch' || mode === 'none') return;

    clearTimeout(this._traefikReloadTimer);
    this._traefikReloadTimer = setTimeout(async () => {
      if (!this.traefikContainer) {
        this.traefikContainer = process.env.TRAEFIK_CONTAINER || null;
        if (!this.traefikContainer) {
          try {
            const containers = await docker.listContainers();
            const traefik = containers.find((c) => (c.Names ?? []).some((n) => /traefik/.test(n)));
            this.traefikContainer = traefik?.Names?.[0]?.replace(/^\//, '') ?? null;
          } catch (err) {
            logger.warn({ msg: 'Could not locate Traefik container', error: err.message });
            return;
          }
        }
      }
      if (!this.traefikContainer) return;

      try {
        logger.info({ msg: 'Reloading Traefik routes', mode, reason, container: this.traefikContainer });
        const container = docker.getContainer(this.traefikContainer);
        if (mode === 'signal') {
          await container.kill({ signal: 'SIGHUP' });
        } else {
          await container.restart({ t: 2 });
        }
      } catch (err) {
        logger.warn({ msg: 'Traefik reload failed', mode, error: err.message });
      }
    }, Number(process.env.TRAEFIK_RELOAD_DEBOUNCE_MS || 600));
    this._traefikReloadTimer.unref?.();
  }

  /**
   * Deletes route files whose lab container no longer exists. Called on boot
   * so a server restart (or crash) never leaves dangling hostnames behind.
   */
  async pruneStaleRouteConfigs() {
    try {
      const files = fs.readdirSync(this.traefikDynamicDir).filter((f) => f.startsWith('lab-') && f.endsWith('.yaml'));
      if (files.length === 0) return;

      const containers = await docker.listContainers({ all: true });
      const liveNames = new Set(containers.flatMap((c) => (c.Names ?? []).map((n) => n.replace(/^\//, ''))));
      const liveSubdomains = new Set(
        containers.map((c) => c.Labels?.['petbug.subdomain']).filter(Boolean)
      );

      let removed = 0;
      for (const file of files) {
        const subdomain = file.replace(/^lab-/, '').replace(/\.yaml$/, '');
        if (liveSubdomains.has(subdomain) || liveNames.has(`petbug-lab-${subdomain}`)) continue;
        fs.unlinkSync(path.join(this.traefikDynamicDir, file));
        removed += 1;
      }
      if (removed > 0) logger.info({ msg: 'Pruned stale Traefik route configs', removed });
    } catch (err) {
      logger.warn({ msg: 'Could not prune Traefik configs', error: err.message });
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
        PidsLimit: 256,            // ยับยั้ง fork bomb จาก target ที่มีช่องโหว่
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges:true'],
        // ลบคอนเทนเนอร์อัตโนมัติเมื่อ OOM/ตายไปเอง จะได้ไม่ค้างในระบบ
        AutoRemove: false,
      },
    };

    logger.info({ msg: 'Creating lab container', subdomain, image: dockerImage, domain, targetPort });
    const container = await docker.createContainer(containerConfig);

    // Register the route before starting so the first request after "running"
    // does not race the Traefik reload.
    this.writeTraefikRouteConfig(subdomain, containerName, targetPort);
    this.scheduleTraefikReload(`start ${subdomain}`);

    try {
      await container.start();
    } catch (err) {
      this.removeTraefikRouteConfig(subdomain);
      this.scheduleTraefikReload(`cleanup ${subdomain}`);
      await container.remove({ force: true }).catch(() => {});
      throw err;
    }

    return {
      containerId: container.id,
      subdomain,
      url: `http://${domain}`,
    };
  }

  async stopAndRemoveContainer(containerId, { attempts = 3 } = {}) {
    if (!containerId) return;

    const container = docker.getContainer(containerId);

    try {
      const inspection = await container.inspect();

      // Look for subdomain from container labels to clean up config file
      const subdomain = inspection.Config?.Labels?.['petbug.subdomain'];
      if (subdomain) {
        this.removeTraefikRouteConfig(subdomain);
        this.scheduleTraefikReload(`stop ${subdomain}`);
      }

      if (inspection.State.Running) {
        logger.info(`Stopping container: ${containerId}`);
        await container.stop({ t: 5 });
      }
    } catch (err) {
      if (err.statusCode === 404) {
        logger.warn(`Container already removed or not found: ${containerId}`);
        return;
      }
      logger.error({ msg: `Error stopping container ${containerId}`, error: err.message });
      throw err;
    }

    // Removing a container that another job is already removing returns 409;
    // retry briefly instead of failing the stop job.
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        logger.info(`Removing container: ${containerId}`);
        await container.remove({ force: true });
        return;
      } catch (err) {
        if (err.statusCode === 404) return;
        if (err.statusCode === 409 && attempt < attempts) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw err;
      }
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
