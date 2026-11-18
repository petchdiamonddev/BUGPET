import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate limiters are in-memory per API process, which is correct for the
 * default single-container deployment. Behind several replicas a restart
 * resets lockouts; put Redis in front if you scale the API horizontally.
 */

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    code: 'RATE_LIMITED',
    message,
  });
};

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Behind Traefik every request arrives from the proxy, so key by the real
  // client address that `app.set('trust proxy', 1)` resolves. ipKeyGenerator
  // collapses an IPv6 /64 to its network so one host cannot rotate addresses.
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
};

// เข้าสู่ระบบผิดได้ไม่เกิน 10 ครั้ง / 15 นาที (นับเฉพาะครั้งที่ล้มเหลว)
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: jsonHandler('ลองเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});

// สมัครสมาชิก: กันสแปมบัญชี
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  handler: jsonHandler('สมัครสมาชิกถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});

// ส่ง flag: กันเดา flag รัว ๆ (คำตอบที่ถูกต้องไม่นับ)
export const submitFlagLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: jsonHandler('ส่ง Flag ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});

// เริ่ม/หยุด lab container
export const instanceActionLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 15,
  handler: jsonHandler('ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});

// API ทั่วไป (กัน scraping / bot)
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  handler: jsonHandler('คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'),
});
