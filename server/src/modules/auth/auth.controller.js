import authService from './auth.service.js';

const REFRESH_COOKIE = 'petbug_rt';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  path: '/',
  maxAge: REFRESH_MAX_AGE,
});

class AuthController {
  async register(req, res) {
    const { username, email, password } = req.body;
    const user = await authService.register({ username, email, password });
    res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ', data: user });
  }

  async login(req, res) {
    const { identifier, username, email, password } = req.body;
    const result = await authService.login({ identifier: identifier || username || email, password });

    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());

    res.status(200).json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: { user: result.user, accessToken: result.accessToken },
    });
  }

  async refresh(req, res) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const result = await authService.refresh(refreshToken);

    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());

    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  }

  async logout(req, res) {
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.status(200).json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  }

  async me(req, res) {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ success: true, data: user });
  }

  async updateProfile(req, res) {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({ success: true, message: 'อัปเดตโปรไฟล์แล้ว', data: user });
  }

  async changePassword(req, res) {
    const result = await authService.changePassword(req.user.id, req.body);
    res.status(200).json({ success: true, ...result });
  }
}

export default new AuthController();
