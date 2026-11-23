import authService from './auth.service.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
});

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      const newUser = await authService.register({ username, email, password });
      return res.status(201).json({
        success: true,
        message: 'สมัครสมาชิกสำเร็จ',
        data: newUser,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { identifier, username, email, password } = req.body;
      const iden = identifier || username || email;
      const { user, accessToken, refreshToken } = await authService.login({
        identifier: iden,
        password,
      });

      // ตั้งค่า HttpOnly Cookie สำหรับ Refresh Token
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

      return res.status(200).json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 401).json({
        success: false,
        message: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      const result = await authService.refreshToken(refreshToken);

      // ออก Refresh Token ใบใหม่ (Refresh Token Rotation)
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

      return res.status(200).json({
        success: true,
        message: 'ต่ออายุเซสชันสำเร็จ',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      // หากเกิดข้อผิดพลาดในการ Refresh ให้ล้าง Cookie เพื่อความปลอดภัย
      res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions(), maxAge: undefined });
      return res.status(error.statusCode || 401).json({
        success: false,
        message: error.message,
      });
    }
  }

  async logout(req, res) {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      await authService.logout({
        userId: req.user?.id,
        refreshToken,
      });

      // ล้าง Cookie ออกจากเบราว์เซอร์
      res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions(), maxAge: undefined });

      return res.status(200).json({
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      });
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions(), maxAge: undefined });
      return res.status(200).json({
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      });
    }
  }

  async me(req, res) {
    try {
      const user = await authService.getMe(req.user.id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new AuthController();
