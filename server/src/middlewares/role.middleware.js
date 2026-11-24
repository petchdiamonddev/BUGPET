export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้',
      });
    }
    next();
  };
};
