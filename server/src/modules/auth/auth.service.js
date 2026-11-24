import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import {
  REFRESH_SECRET,
  signAccessToken,
  signRefreshToken,
} from '../../middlewares/auth.middleware.js';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// รหัสผ่านอย่างน้อย 8 ตัวอักษร ต้องมีทั้งตัวอักษรและตัวเลข
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const safeUser = (user) => {
  const { password, refreshtoken, ...safe } = user;
  return safe;
};

// เข้ารหัส Refresh Token แบบ SHA-256 ก่อนเก็บลงฐานข้อมูล เพื่อป้องกัน Token รั่วไหลหาก DB ถูกโจมตี
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

class AuthService {
  async register({ username, email, password }) {
    const cleanUsername = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password) {
      const err = new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
      err.statusCode = 400;
      throw err;
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      const err = new Error('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ . - และมีความยาว 3-24 ตัวอักษร');
      err.statusCode = 400;
      throw err;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      const err = new Error('รูปแบบอีเมลไม่ถูกต้อง');
      err.statusCode = 400;
      throw err;
    }

    if (!PASSWORD_REGEX.test(String(password))) {
      const err = new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และต้องประกอบด้วยทั้งตัวอักษรและตัวเลข');
      err.statusCode = 400;
      throw err;
    }

    // ตรวจสอบชื่อผู้ใช้และอีเมลซ้ำ
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      const err = new Error(
        existing.email === cleanEmail
          ? 'อีเมลนี้ถูกใช้งานไปแล้ว'
          : 'ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว'
      );
      err.statusCode = 409;
      throw err;
    }

    // เข้ารหัสผ่านด้วย bcrypt (Cost factor = 12)
    const hashedPassword = await bcrypt.hash(String(password), 12);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
      },
    });

    return safeUser(newUser);
  }

  async login({ identifier, password }) {
    const cleanIdentifier = String(identifier || '').trim();
    if (!cleanIdentifier || !password) {
      const err = new Error('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { email: cleanIdentifier.toLowerCase() },
        ],
      },
    });

    // ป้องกัน User Enumeration Attack โดยใช้ข้อความเดียวกันเสมอ
    if (!user) {
      const err = new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      err.statusCode = 401;
      throw err;
    }

    if (user.isBanned) {
      const err = new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      const err = new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      err.statusCode = 401;
      throw err;
    }

    // บันทึกเวลาเข้าใช้งานล่าสุด
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // ออก Access Token และ Refresh Token
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // ทำ Token Storage: บันทึก Hash ของ Refresh Token ลงฐานข้อมูล
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshtoken: hashToken(refreshToken),
      },
    });

    return {
      user: safeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh Token Rotation (RTR) & Reuse Detection
   * หากพบว่า Refresh Token ถูกใช้ซ้ำหรือไม่ตรงกับใน DB จะทำการล้าง Token ของผู้ใช้ทันที (Revoke All Sessions)
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      const err = new Error('ไม่พบ Refresh Token ในระบบ');
      err.statusCode = 401;
      throw err;
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (jwtErr) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      const err = new Error(
        isExpired
          ? 'Refresh Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
          : 'Refresh Token ไม่ถูกต้อง'
      );
      err.statusCode = 401;
      throw err;
    }

    if (payload.typ && payload.typ !== 'refresh') {
      const err = new Error('ประเภท Token ไม่ถูกต้อง');
      err.statusCode = 401;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      const err = new Error('ไม่พบข้อมูลผู้ใช้ในระบบ');
      err.statusCode = 401;
      throw err;
    }

    if (user.isBanned) {
      const err = new Error('บัญชีนี้ถูกระงับการใช้งาน');
      err.statusCode = 403;
      throw err;
    }

    const incomingHash = hashToken(refreshToken);

    // ตรวจสอบ Reuse Detection / Revocation
    if (!user.refreshtoken || user.refreshtoken !== incomingHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshtoken: null },
      });

      const err = new Error('ตรวจพบความผิดปกติของเซสชัน กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      err.statusCode = 401;
      throw err;
    }

    // Token Rotation: ออก Token ชุดใหม่ทั้ง Access Token และ Refresh Token
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    // อัปเดต Hash ของ Refresh Token ใบใหม่ลง DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshtoken: hashToken(newRefreshToken),
      },
    });

    return {
      user: safeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout({ userId, refreshToken }) {
    let targetUserId = userId;

    if (!targetUserId && refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        targetUserId = payload.id;
      } catch {
        // ignore
      }
    }

    if (targetUserId) {
      await prisma.user
        .update({
          where: { id: targetUserId },
          data: { refreshtoken: null },
        })
        .catch(() => {});
    }

    return true;
  }

  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      const err = new Error('ไม่พบข้อมูลผู้ใช้');
      err.statusCode = 404;
      throw err;
    }
    return safeUser(user);
  }

  async updateProfile(userId, { bio }) {
    const cleanBio = bio !== undefined ? (bio ? String(bio).slice(0, 280) : null) : undefined;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(cleanBio !== undefined ? { bio: cleanBio } : {}),
      },
    });
    return safeUser(user);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!newPassword || !PASSWORD_REGEX.test(String(newPassword))) {
      const err = new Error(
        'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร และต้องประกอบด้วยทั้งตัวอักษรและตัวเลข'
      );
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error('ไม่พบข้อมูลผู้ใช้');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(String(currentPassword || ''), user.password);
    if (!isMatch) {
      const err = new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);

    // ยกระดับความปลอดภัย: เมื่อเปลี่ยนรหัสผ่าน ให้ยกเลิก session เก่าทั้งหมดในระบบทันที
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshtoken: null,
      },
    });

    return { message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
  }
}

export default new AuthService();
