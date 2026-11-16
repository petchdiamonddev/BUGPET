import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Terminal, Trophy, Zap, ArrowRight, CheckCircle, Bug, Sparkles, Server } from 'lucide-react';
import { apiRequest } from '../lib/api';
import LabCard from '../components/LabCard';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, activeInstance } = useAuth();
  const [featuredLabs, setFeaturedLabs] = useState([]);
  const [stats, setStats] = useState({ totalLabs: 3, totalUsers: 10, totalSolves: 25 });

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest('/labs');
        setFeaturedLabs((res.data || []).slice(0, 3));
      } catch (err) {
        // fallback
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-8 sm:pb-12 border-b border-slate-800/60">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>BugForge-Inspired Web Application Pentesting Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            ฝึกเจาะระบบในสภาพแวดล้อมจริง <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              1-Click Isolated Container
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            แพลตฟอร์มจำลองช่องโหว่ความปลอดภัยทางไซเบอร์ที่รันแยก Container เฉพาะคุณผ่าน Wildcard Subdomain ฝึกฝนทักษะ Web Pentesting และ Bug Bounty ได้จริงทันที
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/labs"
              className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
              <span>เริ่มทำ Lab ทันที</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/leaderboard"
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700/80 text-white font-medium px-6 py-3 rounded-xl border border-slate-700 transition"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>ดูอันดับแฮกเกอร์</span>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 max-w-4xl mx-auto text-left">
            <div className="bg-[#0f172a]/80 border border-slate-800 p-4 rounded-xl">
              <Server className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-bold text-white text-sm">Dedicated URL</div>
              <div className="text-xs text-slate-400 mt-1">&lt;random&gt;.lab.domain</div>
            </div>
            <div className="bg-[#0f172a]/80 border border-slate-800 p-4 rounded-xl">
              <Zap className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="font-bold text-white text-sm">Real-Time Routing</div>
              <div className="text-xs text-slate-400 mt-1">Traefik v3 Dynamic Proxy</div>
            </div>
            <div className="bg-[#0f172a]/80 border border-slate-800 p-4 rounded-xl">
              <Shield className="w-5 h-5 text-amber-400 mb-2" />
              <div className="font-bold text-white text-sm">OWASP Top 10</div>
              <div className="text-xs text-slate-400 mt-1">SQLi, IDOR, RCE, Auth</div>
            </div>
            <div className="bg-[#0f172a]/80 border border-slate-800 p-4 rounded-xl">
              <Trophy className="w-5 h-5 text-purple-400 mb-2" />
              <div className="font-bold text-white text-sm">Gamification</div>
              <div className="text-xs text-slate-400 mt-1">Points, Badges & Ranks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Labs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Challenges แนะนำ</h2>
            <p className="text-sm text-slate-400 mt-1">เลือกด่านที่ต้องการและทดสอบช่องโหว่ได้ทันที</p>
          </div>
          <Link
            to="/labs"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredLabs.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              isActiveInstance={activeInstance?.labId === lab.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
