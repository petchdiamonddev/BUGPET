import rateLimit from 'express-rate-limit';

// จำกัดการล็อกอิน: ไม่เกิน 5 ครั้งต่อ 15 นาที
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'พยายามเข้าสู่ระบบถี่เกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง',
  },
});

// จำกัดการสมัครสมาชิก: ไม่เกิน 5 บัญชีต่อ 1 ชั่วโมง
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'มีการสมัครสมาชิกถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
  },
});

// จำกัดการ Refresh Token: ไม่เกิน 30 ครั้งต่อ 15 นาที
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'ส่งคำขอต่ออายุเซสชันบ่อยเกินไป กรุณารอสักครู่',
  },
});

// ป้องกัน Brute-forcing Flag: ส่ง Flag ได้ไม่เกิน 10 ครั้งต่อ 1 นาที
export const submitFlagLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FLAG_SUBMIT_LIMIT',
    message: 'ส่งคำตอบบ่อยเกินไป กรุณารอ 1 นาทีก่อนส่งใหม่อีกครั้ง',
  },
});

// ทั่วไปสำหรับ Public API: ป้องกัน DoS / Scraper
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'คำขอถี่เกินไป กรุณารอสักครู่',
  },
});
