import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
export const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

export const signAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      typ: 'access',
      jti: crypto.randomUUID(), // มาตรฐาน RFC 7519 jti เพื่อให้ Token มีความไม่ซ้ำกันเสมอ
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      typ: 'refresh',
      jti: crypto.randomUUID(), // ป้องกัน Token ซ้ำในวินาทีเดียวกัน และรองรับ Token Rotation ที่สมบูรณ์
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
    return req.cookies.accessToken || req.cookies.token;
  }
  return null;
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
    const payload = jwt.verify(token, ACCESS_SECRET);

    // ป้องกันการนำ Refresh Token มาใช้แทน Access Token
    if (payload.typ && payload.typ !== 'access') {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_TYPE',
        message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
    }

    // ตรวจสอบสถานะ User จากฐานข้อมูลล่าสุด
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'ไม่พบบัญชีผู้ใช้งานในระบบ',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired
        ? 'เซสชันหมดอายุ กรุณาต่ออายุเซสชันหรือเข้าสู่ระบบใหม่'
        : 'Token ไม่ถูกต้องหรือไม่สามารถยืนยันตัวตนได้',
    });
  }
};
