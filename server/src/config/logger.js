import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Production logs are single-line JSON (what log collectors expect).
 * Development stays single-line too unless pino-pretty is installed, so the
 * API never fails to boot because a pretty-printer is missing.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  // Lab flags and credentials must never reach stdout.
  redact: {
    paths: ['req.headers.authorization', 'password', 'currentPassword', 'newPassword', 'flag', '*.flag', 'token', 'refreshToken'],
    censor: '[redacted]',
  },
  ...(!isProd && process.env.LOG_PRETTY === 'true'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});
