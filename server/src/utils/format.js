const DEFAULT_BASE_DOMAIN = process.env.BASE_LAB_DOMAIN || '127.0.0.1.nip.io';

/**
 * Public URL of a lab instance. In production `BASE_LAB_DOMAIN` should be
 * something like `lab.domain.com` and the scheme switches to https.
 */
export const instanceUrl = (subdomain, baseDomain = DEFAULT_BASE_DOMAIN) => {
  const scheme = process.env.LAB_URL_SCHEME || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${scheme}://${subdomain}.${baseDomain}`;
};

export const publicBaseDomain = () => DEFAULT_BASE_DOMAIN;

/**
 * Shapes a Prisma LabInstance (+ optional relations) into the public API
 * representation shared by /instances, /labs/:id and /admin endpoints.
 */
export const serializeInstance = (instance, { includeLab = false, isAdmin = false } = {}) => {
  if (!instance) return null;
  const base = {
    id: instance.id,
    labId: instance.labId,
    subdomain: instance.subdomain,
    url: instanceUrl(instance.subdomain),
    status: instance.status,
    startedAt: instance.startedAt,
    expiresAt: instance.expiresAt,
    stoppedAt: instance.stoppedAt ?? null,
    stopReason: instance.stopReason ?? null,
    remainingMs: instance.expiresAt ? Math.max(0, new Date(instance.expiresAt).getTime() - Date.now()) : 0,
    containerId: isAdmin ? instance.containerId : undefined,
    error: instance.error ?? null,
  };

  if (includeLab && instance.lab) {
    base.lab = {
      id: instance.lab.id,
      title: instance.lab.title,
      difficulty: instance.lab.difficulty,
      points: instance.lab.points,
      tags: instance.lab.tags ?? [],
    };
  }

  return base;
};

/**
 * Public lab representation. The static flag is never exposed to players,
 * only to admins inside the admin API.
 */
export const serializeLab = (lab, { userId = null, isAdmin = false, includeFlag = false } = {}) => {
  const solves = lab.solves ?? [];
  const isSolved = Boolean(userId && solves.length > 0);
  const solvedAt = isSolved ? solves[0]?.solvedAt ?? null : null;

  return {
    id: lab.id,
    title: lab.title,
    description: lab.description,
    shortDescription: lab.description.length > 160 ? `${lab.description.slice(0, 157).trimEnd()}…` : lab.description,
    difficulty: lab.difficulty,
    dockerImage: isAdmin ? lab.dockerImage : undefined,
    points: lab.points,
    timeoutMin: lab.timeoutMin,
    tags: lab.tags ?? [],
    isActive: lab.isActive,
    createdAt: lab.createdAt,
    updatedAt: lab.updatedAt,
    solvesCount: lab._count?.solves ?? 0,
    attemptsCount: lab._count?.instances ?? undefined,
    isSolved,
    solvedAt,
    isFlagged: isAdmin && includeFlag ? Boolean(lab.flag) : undefined,
    flag: isAdmin && includeFlag ? lab.flag : undefined,
  };
};

export const parseId = (value, label = 'id') => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error(`${label} ไม่ถูกต้อง`);
    err.status = 400;
    err.code = 'INVALID_ID';
    throw err;
  }
  return id;
};
