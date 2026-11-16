import React, { useState, useEffect } from 'react';
import { User, Shield, Trophy, Award, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiRequest('/leaderboard/me');
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
        <p>กำลังโหลดโปรไฟล์...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-[#080c14] rounded-[14px] flex items-center justify-center text-3xl font-bold font-mono text-emerald-400">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {profile.username}
            </h1>
            <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">
              {profile.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">{profile.email}</p>
        </div>

        {/* Big Stats */}
        <div className="grid grid-cols-3 gap-4 text-center w-full sm:w-auto">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl min-w-[90px]">
            <div className="text-xs text-slate-400 font-medium">คะแนนรวม</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{profile.points}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl min-w-[90px]">
            <div className="text-xs text-slate-400 font-medium">อันดับ</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-1">#{profile.rank}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl min-w-[90px]">
            <div className="text-xs text-slate-400 font-medium">ผ่านแล้ว</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-1">{profile.totalSolves} ด่าน</div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          เหรียญรางวัลที่ครอบครอง ({profile.badges?.length || 0})
        </h2>

        {(!profile.badges || profile.badges.length === 0) ? (
          <p className="text-xs sm:text-sm text-slate-500 py-4">
            ยังไม่มีเหรียญรางวัล พิชิต Lab แรกเพื่อปลดล็อกเหรียญ First Blood!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {profile.badges.map((b) => (
              <div key={b.id} className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl text-center space-y-2">
                <div className="text-3xl">{b.icon}</div>
                <div className="font-bold text-sm text-white">{b.name}</div>
                <div className="text-[11px] text-slate-400">{b.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solves History */}
      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ประวัติการพิชิตด่าน ({profile.solves?.length || 0})
        </h2>

        {(!profile.solves || profile.solves.length === 0) ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-slate-500">คุณยังไม่เคยส่ง Flag ที่ถูกต้อง</p>
            <Link to="/labs" className="text-xs font-semibold text-emerald-400 hover:underline">
              เริ่มทำ Lab ด่านแรก &rarr;
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {profile.solves.map((s, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between text-sm">
                <div>
                  <h4 className="font-bold text-white">{s.title}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ระดับความยาก: <span className="font-semibold text-slate-300">{s.difficulty}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                    +{s.points} PTS
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(s.solvedAt).toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
