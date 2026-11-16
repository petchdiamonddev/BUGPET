import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Lock, User, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#0f172a]/90 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#080c14] rounded-[14px] flex items-center justify-center">
              <Bug className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">สร้างบัญชีแฮกเกอร์</h2>
          <p className="text-xs text-slate-400">เริ่มต้นฝึกทักษะความปลอดภัยทางไซเบอร์ในวันนี้</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-xs">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cyber_hunter"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-xs">
              อีเมล (Email)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hunter@example.com"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-xs">
              รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>สมัครสมาชิก</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
