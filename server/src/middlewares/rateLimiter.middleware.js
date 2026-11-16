import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // สุ่มรหัสผ่านได้ไม่เกิน 5 ครั้ง ต่อ 15 นาที
  message: {
    success: false,
    message: 'ลองเข้าสู่ระบบถี่เกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
