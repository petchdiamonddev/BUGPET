import React, { useState, useEffect } from 'react';
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
    <div className="space-y-4">
      <div className="fb-box">
        <div className="fb-box-header">เหรียญเกียรติยศและความสำเร็จ (Achievements)</div>
        <div className="p-3 text-xs text-gray-600 border-b border-[#eceff5]">
          สะสมเหรียญตราเกียรติยศเมื่อผ่านเงื่อนไขการค้นพบช่องโหว่และพิชิตโจทย์ต่างๆ ในระบบ
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-xs">กำลังโหลดเหรียญรางวัล...</div>
        ) : (
          <div className="divide-y divide-[#eceff5]">
            {badges.map((b) => {
              const isEarned = earnedBadgeIds.has(b.id);
              return (
                <div key={b.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#f7f7f7]">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <div className="font-bold text-gray-800">{b.name}</div>
                      <div className="text-gray-500 text-[11px]">{b.description}</div>
                    </div>
                  </div>

                  <div>
                    {isEarned ? (
                      <span className="bg-green-100 text-green-800 border border-green-300 font-bold px-2 py-0.5 rounded-[2px] text-[10px]">
                        ปลดล็อกแล้ว ✓
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-400 border border-gray-300 px-2 py-0.5 rounded-[2px] text-[10px]">
                        ยังไม่ปลดล็อก
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
