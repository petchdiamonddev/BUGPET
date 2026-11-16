import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest('/leaderboard?limit=50');
        setUsers(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="fb-box">
        <div className="fb-box-header flex items-center justify-between">
          <span className="font-bold text-sm">ตารางอันดับคะแนนแฮกเกอร์ (Leaderboard)</span>
          <span className="text-[11px] text-gray-500 font-normal">เรียงลำดับตามคะแนนสะสมสูงสุด</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-xs">กำลังโหลดข้อมูลอันดับ...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">ยังไม่มีคะแนนสะสมในระบบ ร่วมส่ง Flag เป็นคนแรก!</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#eceff5] text-gray-600 font-bold border-b border-[#d8dfea]">
              <tr>
                <th className="px-3 py-2 w-16">อันดับ</th>
                <th className="px-3 py-2">ชื่อผู้ใช้ (Hacker)</th>
                <th className="px-3 py-2">ด่านที่ผ่าน</th>
                <th className="px-3 py-2">เหรียญรางวัล</th>
                <th className="px-3 py-2 text-right">คะแนนรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#f7f7f7]">
                  <td className="px-3 py-2 font-bold font-mono text-gray-500">
                    {u.rank === 1 ? '🥇 อันดับ 1' : u.rank === 2 ? '🥈 อันดับ 2' : u.rank === 3 ? '🥉 อันดับ 3' : `#${u.rank}`}
                  </td>
                  <td className="px-3 py-2 font-bold text-[#385898]">
                    {u.username}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-700">
                    {u.solvesCount} ด่าน
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm">
                      {u.badges?.map((b, i) => b.icon).join(' ') || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-[#3b5998]">
                    {u.points} แต้ม
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
