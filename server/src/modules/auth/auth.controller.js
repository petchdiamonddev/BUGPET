import authService from './auth.service.js';

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
      return res.status(400).json({
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

      // ตั้งค่า HttpOnly Cookie สำหรับ Refresh Token เพื่อความปลอดภัย
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
      });

      return res.status(200).json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshToken(refreshToken);
      return res.status(200).json({
        success: true,
        message: 'ออก Token ใหม่สำเร็จ',
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  async logout(req, res) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.status(200).json({
      success: true,
      message: 'ออกจากระบบสำเร็จ',
    });
  }

  async me(req, res) {
    try {
      const user = await authService.getMe(req.user.id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new AuthController();
