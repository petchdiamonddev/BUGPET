import { prisma } from '../../config/prisma.js';
import bcrypt from 'bcrypt';
import { badRequest, unauthorized, forbidden } from '../../utils/errors.js';
import { signAccessToken, signRefreshToken } from '../../middlewares/auth.middleware.js';

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  points: user.points,
  bio: user.bio,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

class AuthService {
  async register({ username, email, password }) {
    const cleanUsername = String(username ?? '').trim();
    const cleanEmail = String(email ?? '').trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password) {
      throw badRequest('กรุณากรอกข้อมูลให้ครบถ้วน', 'MISSING_FIELDS');
    }
    if (!USERNAME_RE.test(cleanUsername)) {
      throw badRequest('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, _ . - และยาว 3–24 ตัวอักษร', 'INVALID_USERNAME');
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      throw badRequest('รูปแบบอีเมลไม่ถูกต้อง', 'INVALID_EMAIL');
    }
    if (String(password).length < 8) {
      throw badRequest('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'WEAK_PASSWORD');
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: cleanEmail }, { username: { equals: cleanUsername, mode: 'insensitive' } }] },
      select: { email: true, username: true },
    });

    if (existing) {
      if (existing.email === cleanEmail) throw badRequest('อีเมลนี้ถูกใช้งานแล้ว', 'EMAIL_TAKEN');
      throw badRequest('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', 'USERNAME_TAKEN');
    }

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: await bcrypt.hash(String(password), 10),
      },
    });

    return safeUser(user);
  }

  async login({ identifier, password }) {
    const cleanIdentifier = String(identifier ?? '').trim();
    if (!cleanIdentifier || !password) {
      throw badRequest('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน', 'MISSING_FIELDS');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanIdentifier }, { email: cleanIdentifier.toLowerCase() }],
      },
    });

    // Same message for unknown user and wrong password (no user enumeration).
    if (!user) throw unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS');

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) throw unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS');

    if (user.isBanned) throw forbidden('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ', 'ACCOUNT_BANNED');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      user: safeUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }

  /**
   * Silent renewal used by the SPA on boot and when an access token expires.
   * The refresh token lives in an HttpOnly cookie so a stolen localStorage
   * value can never mint new sessions.
   */
  async refresh(refreshToken) {
    if (!refreshToken) throw unauthorized('ไม่พบเซสชันการเข้าสู่ระบบ', 'NO_REFRESH_TOKEN');

    const { verify } = await import('jsonwebtoken');
    let payload;
    try {
      payload = verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      throw unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'REFRESH_EXPIRED');
    }
    if (payload.typ && payload.typ !== 'refresh') {
      throw unauthorized('Refresh token ไม่ถูกต้อง', 'INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw unauthorized('ไม่พบข้อมูลผู้ใช้', 'USER_NOT_FOUND');
    if (user.isBanned) throw forbidden('บัญชีนี้ถูกระงับการใช้งาน', 'ACCOUNT_BANNED');

    return {
      user: safeUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }

  async getMe(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized('ไม่พบข้อมูลผู้ใช้', 'USER_NOT_FOUND');

    const [solves, badges] = await Promise.all([
      prisma.solve.count({ where: { userId } }),
      prisma.userBadge.count({ where: { userId } }),
    ]);

    return { ...safeUser(user), solvesCount: solves, badgesCount: badges };
  }

  async updateProfile(userId, { bio }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { bio: bio?.slice(0, 280) ?? null },
    });
    return safeUser(user);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!newPassword || String(newPassword).length < 8) {
      throw badRequest('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร', 'WEAK_PASSWORD');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized('ไม่พบข้อมูลผู้ใช้');

    const isMatch = await bcrypt.compare(String(currentPassword ?? ''), user.password);
    if (!isMatch) throw badRequest('รหัสผ่านปัจจุบันไม่ถูกต้อง', 'INVALID_CURRENT_PASSWORD');

    await prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(String(newPassword), 10) },
    });
    return { message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
  }
}

export default new AuthService();
