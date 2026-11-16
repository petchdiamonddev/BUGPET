import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/labs');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="fb-box">
        <div className="fb-box-header text-sm">สมัครสมาชิก PETBUG</div>
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded-[2px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                ชื่อผู้ใช้งาน (Username):
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น hacker_pro"
                className="w-full border border-[#ccd0d5] px-2.5 py-1.5 rounded-[2px] outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                อีเมล (Email):
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น hacker@example.com"
                className="w-full border border-[#ccd0d5] px-2.5 py-1.5 rounded-[2px] outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                รหัสผ่าน (Password อย่างน้อย 6 ตัวอักษร):
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
                {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนผู้ใช้งาน'}
              </button>

              <Link to="/login" className="text-[#385898] hover:underline">
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
