import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-full sm:w-[190px] flex-shrink-0 space-y-3 text-xs">
      {/* User Mini Profile Box */}
      <div className="fb-box p-3">
        <div className="w-full aspect-square bg-[#eceff5] border border-[#d8dfea] rounded-[2px] flex items-center justify-center text-3xl font-bold text-[#3b5998] mb-2">
          {user ? user.username.charAt(0).toUpperCase() : '?'}
        </div>

        {user ? (
          <div className="space-y-1">
            <Link to="/profile" className="font-bold text-[#385898] hover:underline block text-sm">
              {user.username}
            </Link>
            <div className="text-gray-500 text-[11px]">คะแนนสะสม: <b className="text-black">{user.points || 0} แต้ม</b></div>
            <div className="text-gray-500 text-[11px]">สถานะ: <span className="font-mono">{user.role}</span></div>
            <div className="pt-1.5 border-t border-[#e9e9e9] mt-1 text-[11px]">
              <Link to="/profile" className="text-[#385898] hover:underline block">ดูโปรไฟล์ส่วนตัว</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="font-bold text-gray-700">ผู้เยี่ยมชมทั่วไป</div>
            <p className="text-gray-500 text-[11px]">เข้าสู่ระบบเพื่อเริ่มทำโจทย์และเก็บคะแนน</p>
            <div className="pt-2">
              <Link to="/login" className="fb-btn text-[11px] w-full justify-center">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Menu in Thai */}
      <div className="fb-box">
        <div className="fb-box-header">เมนูหลัก</div>
        <div className="p-1 space-y-0.5">
          <Link
            to="/labs"
            className={`block px-2.5 py-1.5 rounded-[2px] ${
              isActive('/labs') ? 'bg-[#eceff5] font-bold text-[#3b5998]' : 'text-[#385898] hover:bg-[#eceff5]'
            }`}
          >
            🐛 ด่านทดสอบทั้งหมด
          </Link>
          <Link
            to="/leaderboard"
            className={`block px-2.5 py-1.5 rounded-[2px] ${
              isActive('/leaderboard') ? 'bg-[#eceff5] font-bold text-[#3b5998]' : 'text-[#385898] hover:bg-[#eceff5]'
            }`}
          >
            🏆 ตารางอันดับแฮกเกอร์
          </Link>
          <Link
            to="/badges"
            className={`block px-2.5 py-1.5 rounded-[2px] ${
              isActive('/badges') ? 'bg-[#eceff5] font-bold text-[#3b5998]' : 'text-[#385898] hover:bg-[#eceff5]'
            }`}
          >
            🎖️ เหรียญเกียรติยศ
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={`block px-2.5 py-1.5 rounded-[2px] text-amber-700 ${
                isActive('/admin') ? 'bg-[#eceff5] font-bold' : 'hover:bg-[#eceff5]'
              }`}
            >
              🛡️ แผงควบคุมระบบ (Admin)
            </Link>
          )}
        </div>
      </div>

      {/* Retro Information Box */}
      <div className="fb-box p-3 text-[11px] text-gray-600 space-y-1">
        <div className="font-bold text-[#3b5998]">เกี่ยวกับ PETBUG</div>
        <p>ระบบจำลองสภาพแวดล้อมฝึกเจาะระบบความปลอดภัยทางไซเบอร์แบบแยก Container เฉพาะบุคคล สไตล์เว็บคลาสสิกยุค 2000s</p>
        <div className="pt-2 text-gray-400 border-t border-[#e9e9e9]">
          PETBUG &copy; 2026
        </div>
      </div>
    </aside>
  );
}
