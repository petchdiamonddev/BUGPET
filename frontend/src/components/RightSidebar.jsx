import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function RightSidebar() {
  const { activeInstance } = useAuth();
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest('/leaderboard?limit=5');
        setTopUsers(res.data || []);
      } catch (e) {
        // ignore
      }
    }
    load();
  }, []);

  return (
    <aside className="w-full sm:w-[220px] flex-shrink-0 space-y-3 text-xs hidden lg:block">
      {/* Active Lab Widget if active */}
      {activeInstance && (
        <div className="fb-box">
          <div className="fb-box-header bg-[#fff9d7] text-[#333] border-b border-[#e2c822]">
            ⚡ ด่านของคุณที่กำลังทำงาน
          </div>
          <div className="p-3 space-y-2">
            <div className="font-bold text-[#385898]">{activeInstance.labTitle}</div>
            <div className="text-[11px] text-gray-500 font-mono break-all">{activeInstance.subdomain}</div>
            <div className="pt-1">
              <a
                href={activeInstance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fb-btn text-[11px] w-full justify-center"
              >
                เปิดหน้าเว็บเป้าหมาย &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Hackers Leaderboard Spotlight */}
      <div className="fb-box">
        <div className="fb-box-header">5 อันดับแฮกเกอร์สูงสุด</div>
        <div className="p-2 divide-y divide-[#eceff5]">
          {topUsers.length === 0 ? (
            <div className="p-2 text-gray-400 text-center">ยังไม่มีคะแนนสะสม</div>
          ) : (
            topUsers.map((u, i) => (
              <div key={u.id} className="py-1.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="font-bold text-gray-500 w-4">#{i + 1}</span>
                  <span className="font-semibold text-[#385898] hover:underline cursor-pointer truncate">
                    {u.username}
                  </span>
                </div>
                <span className="font-bold font-mono text-gray-700">{u.points} แต้ม</span>
              </div>
            ))
          )}
        </div>
        <div className="p-2 bg-[#f7f7f7] border-t border-[#d8dfea] text-center">
          <Link to="/leaderboard" className="text-[#385898] text-[11px] font-bold hover:underline">
            ดูตารางคะแนนทั้งหมด &rarr;
          </Link>
        </div>
      </div>

      {/* Retro Poke / Hack Tip */}
      <div className="fb-box p-3 space-y-1.5 text-[11px]">
        <div className="font-bold text-[#3b5998]">ข้อควรรู้ความปลอดภัย</div>
        <p className="text-gray-600">
          ตรวจสอบ HTTP Request ด้วยเครื่องมืออย่าง Burp Suite หรือ Inspect Elements เสมอ เพื่อค้นหา parameter ที่ถูกซ่อนไว้ในระบบ!
        </p>
      </div>
    </aside>
  );
}
