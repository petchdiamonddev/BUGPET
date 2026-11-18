import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '8h';
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30d';

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
    return req.cookies.accessToken || req.cookies.token;
  }
  return null;
};

export const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, username: user.username, typ: 'access' }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, username: user.username, typ: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

/**
 * Resolves the JWT payload into a fresh DB user. This keeps role changes and
 * banned accounts effective immediately instead of waiting for token expiry,
 * and lets controllers always read up-to-date points.
 *
 * Returns `{ user }` on success, `{ error: 'unauthorized' | 'banned' }` otherwise.
 */
export const resolveUser = async (payload) => {
  if (!payload?.id) return { error: 'unauthorized' };

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      points: true,
      isBanned: true,
      createdAt: true,
    },
  });

  if (!user) return { error: 'unauthorized' };
  if (user.isBanned) return { error: 'banned', user };
  return { user };
};

export const authenticate = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.typ === 'refresh') {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
    }

    const { user, error } = await resolveUser(payload);
    if (error === 'banned') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_BANNED',
        message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
    }

    req.user = user; // { id, username, email, role, points, createdAt }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    });
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.typ !== 'refresh') {
      const { user } = await resolveUser(payload);
      if (user) req.user = user;
    }
  } catch (err) {
    // ignore invalid token in optional auth
  }
  next();
};
