import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import LabCard from '../components/LabCard';
import { useAuth } from '../context/AuthContext';

export default function LabsPage() {
  const { activeInstance } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLabs = async () => {
    setLoading(true);
    try {
      let query = '';
      const params = new URLSearchParams();
      if (difficulty !== 'ALL') params.append('difficulty', difficulty);
      if (search.trim()) params.append('search', search.trim());
      if (params.toString()) query = `?${params.toString()}`;

      const res = await apiRequest(`/labs${query}`);
      setLabs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [difficulty]);

  const tabs = [
    { id: 'ALL', label: 'ทั้งหมด' },
    { id: 'EASY', label: 'ง่าย (Easy)' },
    { id: 'MEDIUM', label: 'ปานกลาง (Medium)' },
    { id: 'HARD', label: 'ยาก (Hard)' },
  ];

  return (
    <div className="space-y-3">
      {/* Header Box */}
      <div className="fb-box p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eceff5] pb-2 mb-2">
          <div>
            <h1 className="text-base font-bold text-[#3b5998]">คลังโจทย์ทดสอบช่องโหว่ (Security Labs)</h1>
            <p className="text-[11px] text-gray-500">เลือกด่านที่ต้องการเพื่อเริ่มรัน Container ส่วนตัว แล้วดึง Flag มาส่งคำตอบ</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLabs();
            }}
            className="flex items-center space-x-1"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อด่าน..."
              className="border border-[#ccd0d5] px-2 py-1 text-xs rounded-[2px] outline-none"
            />
            <button type="submit" className="fb-btn text-xs py-1">
              ค้นหา
            </button>
          </form>
        </div>

        {/* Classic Horizontal Tabs */}
        <div className="flex space-x-1 text-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setDifficulty(t.id)}
              className={`px-3 py-1 font-bold rounded-t-[2px] border-t border-l border-r ${
                difficulty === t.id
                  ? 'bg-white border-[#d8dfea] text-[#3b5998]'
                  : 'bg-[#eceff5] border-transparent text-[#385898] hover:bg-[#dfe3ee]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Labs List */}
      {loading ? (
        <div className="fb-box p-8 text-center text-gray-500">
          กำลังโหลดโจทย์...
        </div>
      ) : labs.length === 0 ? (
        <div className="fb-box p-8 text-center text-gray-500">
          ไม่พบด่านที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              isActiveInstance={activeInstance?.labId === lab.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
