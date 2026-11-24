const DEFAULT_BASE_DOMAIN = process.env.BASE_LAB_DOMAIN || '127.0.0.1.nip.io';

export const instanceUrl = (subdomain, baseDomain = DEFAULT_BASE_DOMAIN) => {
  const scheme = process.env.LAB_URL_SCHEME || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${scheme}://${subdomain}.${baseDomain}`;
};

export const serializeLab = (lab, { userId = null, isAdmin = false, includeFlag = false } = {}) => {
  const solves = lab.solves ?? [];
  const isSolved = Boolean(userId && solves.length > 0);
  const solvedAt = isSolved ? solves[0]?.solvedAt ?? null : null;

  return {
    id: lab.id,
    title: lab.title,
    description: lab.description,
    shortDescription:
      lab.description && lab.description.length > 160
        ? `${lab.description.slice(0, 157).trimEnd()}…`
        : lab.description,
    difficulty: lab.difficulty,
    dockerImage: isAdmin ? lab.dockerImage : undefined,
    points: lab.points,
    timeoutMin: lab.timeoutMin,
    tags: lab.tags ?? [],
    isActive: lab.isActive,
    createdAt: lab.createdAt,
    updatedAt: lab.updatedAt,
    solvesCount: lab._count?.solves ?? 0,
    isSolved,
    solvedAt,
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
