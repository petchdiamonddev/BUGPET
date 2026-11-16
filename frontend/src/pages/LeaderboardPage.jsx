import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Shield, User, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await apiRequest('/leaderboard?limit=50');
        setUsers(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="font-mono text-sm font-bold text-slate-400">#{rank}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-1 rounded-full text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" />
          <span>Hall of Fame</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Hacker Leaderboard
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          จัดอันดับผู้เล่นที่สะสมคะแนนจากการพิชิตโจทย์ความปลอดภัยทางไซเบอร์ใน PETBUG
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
          <p>กำลังโหลดตารางคะแนน...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          ยังไม่มีข้อมูลคะแนนในระบบ ร่วมพิชิต Lab เป็นคนแรก!
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {top3.map((u) => {
                const isFirst = u.rank === 1;
                return (
                  <div
                    key={u.id}
                    className={`relative bg-[#0f172a]/90 border ${
                      isFirst
                        ? 'border-amber-500/50 shadow-xl shadow-amber-500/10 sm:-translate-y-2'
                        : 'border-slate-800'
                    } rounded-2xl p-6 text-center space-y-3 backdrop-blur-md`}
                  >
                    <div className="text-3xl">{getRankBadge(u.rank)}</div>
                    <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-lg font-bold font-mono text-emerald-400">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base truncate">{u.username}</h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {u.solvesCount} Solves
                      </div>
                    </div>
                    <div className="inline-block bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold font-mono">
                      {u.points} PTS
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">อันดับ</th>
                  <th className="px-6 py-4">แฮกเกอร์</th>
                  <th className="px-6 py-4">โจทย์ที่ผ่าน</th>
                  <th className="px-6 py-4">เหรียญรางวัล</th>
                  <th className="px-6 py-4 text-right">คะแนนรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold whitespace-nowrap">
                      {getRankBadge(u.rank)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold font-mono text-emerald-400 border border-slate-700">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono">
                      {u.solvesCount} ด่าน
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {u.badges?.map((b, i) => (
                          <span key={i} title={b.name} className="text-base cursor-help">
                            {b.icon}
                          </span>
                        ))}
                        {(!u.badges || u.badges.length === 0) && (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                      {u.points} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
