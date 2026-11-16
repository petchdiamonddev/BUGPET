import React, { useState, useEffect } from 'react';
import { Award, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function BadgesPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [badgeRes, profileRes] = await Promise.all([
          apiRequest('/leaderboard/badges'),
          user ? apiRequest('/leaderboard/me') : Promise.resolve({ data: null }),
        ]);
        setBadges(badgeRes.data || []);
        setUserProfile(profileRes.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const earnedBadgeIds = new Set(userProfile?.badges?.map((b) => b.id) || []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3.5 py-1 rounded-full text-xs font-semibold">
          <Award className="w-3.5 h-3.5" />
          <span>Achievements</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          เหรียญรางวัลเกียรติยศ (Badges)
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          สะสมเหรียญรางวัลเมื่อผ่านเงื่อนไขการเจาะระบบและพิชิตโจทย์ต่างๆ
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
          <p>กำลังโหลดรายการเหรียญรางวัล...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`relative bg-[#0f172a]/80 border ${
                  isEarned
                    ? 'border-emerald-500/40 bg-gradient-to-b from-[#0f172a] to-emerald-950/20'
                    : 'border-slate-800 opacity-60'
                } rounded-2xl p-6 space-y-3 transition hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{badge.icon}</span>
                  {isEarned ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ปลดล็อกแล้ว</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                      <Lock className="w-3 h-3" />
                      <span>ยังไม่ปลดล็อก</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-white text-base">{badge.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
