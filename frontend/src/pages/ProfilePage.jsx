import React, { useState, useEffect } from 'react';
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
    return <div className="fb-box p-8 text-center text-gray-500 text-xs">กำลังโหลดโปรไฟล์...</div>;
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Profile Box */}
      <div className="fb-box p-4 flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-24 h-24 bg-[#eceff5] border border-[#d8dfea] rounded-[2px] flex items-center justify-center text-4xl font-bold text-[#3b5998] flex-shrink-0">
          {profile.username.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-[#3b5998]">{profile.username}</h1>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 border border-gray-300 rounded-[2px] text-[10px] font-mono">
              {profile.role}
            </span>
          </div>

          <div className="text-gray-600">
            อีเมล: <span className="font-mono">{profile.email}</span>
          </div>

          <div className="pt-2 border-t border-[#eceff5] flex flex-wrap gap-4 text-xs">
            <div>คะแนนสะสม: <b className="text-black">{profile.points} แต้ม</b></div>
            <div>อันดับปัจจุบัน: <b className="text-black">#{profile.rank}</b></div>
            <div>ด่านที่พิชิตได้: <b className="text-black">{profile.totalSolves} ด่าน</b></div>
          </div>
        </div>
      </div>

      {/* Badges Box */}
      <div className="fb-box">
        <div className="fb-box-header">เหรียญรางวัลที่ครอบครอง ({profile.badges?.length || 0})</div>
        <div className="p-3 text-xs">
          {(!profile.badges || profile.badges.length === 0) ? (
            <p className="text-gray-500 py-2">ยังไม่มีเหรียญรางวัล พิชิตด่านแรกเพื่อปลดล็อกเหรียญ First Blood!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.badges.map((b) => (
                <div key={b.id} className="bg-[#f7f7f7] border border-[#d8dfea] p-2 rounded-[2px] flex items-center space-x-2">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <div className="font-bold text-gray-800">{b.name}</div>
                    <div className="text-[10px] text-gray-500">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Solves History Box */}
      <div className="fb-box">
        <div className="fb-box-header">ประวัติการพิชิตด่าน ({profile.solves?.length || 0})</div>
        <div className="p-3 text-xs">
          {(!profile.solves || profile.solves.length === 0) ? (
            <div className="text-center py-4 text-gray-500">
              คุณยังไม่เคยส่ง Flag ด่านใดเลย{' '}
              <Link to="/labs" className="text-[#385898] font-bold hover:underline">
                เริ่มทำด่านแรก &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#eceff5]">
              {profile.solves.map((s, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#385898]">{s.title}</div>
                    <div className="text-[11px] text-gray-500">ระดับความยาก: {s.difficulty}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-700">+{s.points} แต้ม</div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(s.solvedAt).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
