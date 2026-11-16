import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-[#3b5998] border-b border-[#29447e] text-white">
      <div className="max-w-[1020px] mx-auto px-4 h-9 flex items-center justify-between text-xs">
        {/* Left: Brand Logo & Search */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold tracking-tighter text-white hover:underline flex items-baseline gap-1">
            <span>[petbug]</span>
          </Link>

          <div className="hidden sm:flex items-center bg-white rounded-[2px] px-2 py-0.5 text-black border border-[#2d4373]">
            <input
              type="text"
              placeholder="ค้นหาด่านทดสอบ..."
              className="outline-none text-[11px] w-36 placeholder-gray-400 bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  window.location.href = `/labs?search=${encodeURIComponent(e.currentTarget.value)}`;
                }
              }}
            />
            <span className="text-gray-400 text-[10px]">🔍</span>
          </div>
        </div>

        {/* Right: Classic Facebook Text Navigation in Thai */}
        <nav className="flex items-center space-x-1 sm:space-x-2 text-[11px]">
          <Link
            to="/labs"
            className={`px-2 py-1 rounded-[2px] hover:bg-[#2f477a] transition ${
              isActive('/labs') ? 'bg-[#2d4373] font-bold' : ''
            }`}
          >
            ด่านทดสอบ
          </Link>
          <Link
            to="/leaderboard"
            className={`px-2 py-1 rounded-[2px] hover:bg-[#2f477a] transition ${
              isActive('/leaderboard') ? 'bg-[#2d4373] font-bold' : ''
            }`}
          >
            ตารางคะแนน
          </Link>
          <Link
            to="/badges"
            className={`px-2 py-1 rounded-[2px] hover:bg-[#2f477a] transition ${
              isActive('/badges') ? 'bg-[#2d4373] font-bold' : ''
            }`}
          >
            เหรียญรางวัล
          </Link>

          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={`px-2 py-1 rounded-[2px] hover:bg-[#2f477a] text-yellow-300 font-bold ${
                isActive('/admin') ? 'bg-[#2d4373]' : ''
              }`}
            >
              จัดการระบบ
            </Link>
          )}

          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#4b6ea9]">
              <Link to="/profile" className="font-bold hover:underline flex items-center gap-1">
                <span className="bg-white text-[#3b5998] font-bold px-1 rounded-[2px] text-[10px]">
                  {user.points || 0} แต้ม
                </span>
                <span>{user.username}</span>
              </Link>
              <button
                onClick={logout}
                className="text-gray-200 hover:text-white hover:underline"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#4b6ea9]">
              <Link to="/login" className="hover:underline font-bold">
                เข้าสู่ระบบ
              </Link>
              <span>|</span>
              <Link to="/register" className="hover:underline font-bold">
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
