// Safe logger that censors sensitive fields (passwords, tokens, flags)
const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'flag',
  'token',
  'refreshtoken',
  'authorization',
]);

const sanitize = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

export const logger = {
  info: (obj) => console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), ...sanitize(obj) })),
  warn: (obj) => console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), ...sanitize(obj) })),
  error: (obj) => console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), ...sanitize(obj) })),
};
