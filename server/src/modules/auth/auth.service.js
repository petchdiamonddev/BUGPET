import { prisma } from '../../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthService {
  async register({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('อีเมลนี้มีอยู่ในระบบแล้ว');
      }
      if (existingUser.username === username) {
        throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  async login({ identifier, password }) {
    if (!identifier || !password) {
      throw new Error('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    // ป้องกัน User Enumeration Attack โดยใช้ Error Message เดียวกัน
    if (!user) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('ไม่มี Refresh Token ในระบบ');
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new Error('Refresh Token ไม่ถูกต้องหรือหมดอายุ');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้');
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return { accessToken: newAccessToken };
  }

  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้');
    }
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}

export default new AuthService();
