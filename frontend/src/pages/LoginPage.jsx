import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/labs';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="fb-box">
        <div className="fb-box-header text-sm">เข้าสู่ระบบ PETBUG</div>
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded-[2px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                ชื่อผู้ใช้ (Username) หรือ อีเมล:
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="เช่น admin หรือ hunter_x"
                className="w-full border border-[#ccd0d5] px-2.5 py-1.5 rounded-[2px] outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                รหัสผ่าน (Password):
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#ccd0d5] px-2.5 py-1.5 rounded-[2px] outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="fb-btn text-xs py-1.5 px-4"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>

              <Link to="/register" className="text-[#385898] hover:underline">
                ยังไม่มีบัญชี? สมัครที่นี่
              </Link>
            </div>
          </form>

          <div className="p-2 bg-[#f7f7f7] border border-[#d8dfea] text-[11px] text-gray-600 rounded-[2px]">
            <b>บัญชีทดสอบเริ่มต้น:</b><br />
            - ผู้ดูแลระบบ: <code>admin</code> / <code>Admin@123456</code><br />
            - ผู้เล่นทดสอบ: <code>hunter_x</code> / <code>Player@123456</code>
          </div>
        </div>
      </div>
    </div>
  );
}
