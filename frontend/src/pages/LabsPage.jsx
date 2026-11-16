import React, { useState, useEffect } from 'react';
import { Search, Filter, Bug, RefreshCw, AlertCircle } from 'lucide-react';
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
      console.error('Failed to fetch labs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [difficulty]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLabs();
  };

  const tabs = [
    { id: 'ALL', label: 'ทั้งหมด' },
    { id: 'EASY', label: 'Easy' },
    { id: 'MEDIUM', label: 'Medium' },
    { id: 'HARD', label: 'Hard' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
            <Bug className="w-8 h-8 text-emerald-400" />
            Security Labs & Challenges
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            เลือกด่านที่ต้องการเจาะระบบ ระบบจะทำการ Spin-up Container เฉพาะของคุณพร้อม Subdomain อัตโนมัติ
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อด่านหรือช่องโหว่..."
            className="w-full bg-[#0f172a] border border-slate-700/80 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>
      </div>

      {/* Difficulty Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDifficulty(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              difficulty === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm">กำลังโหลดรายการ Labs...</p>
        </div>
      ) : labs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#0f172a]/50 rounded-2xl border border-slate-800/80">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">ไม่พบ Lab ที่ตรงกับเงื่อนไข</h3>
          <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหาหรือระดับความยากดูใหม่อีกครั้ง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
