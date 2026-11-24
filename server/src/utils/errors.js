/**
 * Structured application error.
 */
export class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.extra = extra;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message, code = 'BAD_REQUEST', extra) =>
  new AppError(400, code, message, extra);

export const unauthorized = (message = 'กรุณาเข้าสู่ระบบก่อนใช้งาน', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้', code = 'FORBIDDEN') =>
  new AppError(403, code, message);

export const notFound = (message = 'ไม่พบข้อมูลที่ระบุ', code = 'NOT_FOUND') =>
  new AppError(404, code, message);

export const conflict = (message, code = 'CONFLICT', extra) =>
  new AppError(409, code, message, extra);

export const tooManyRequests = (message, code = 'RATE_LIMITED') =>
  new AppError(429, code, message);

export const serverError = (message = 'เกิดข้อผิดพลาดภายในระบบ', code = 'INTERNAL_ERROR') =>
  new AppError(500, code, message);

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
