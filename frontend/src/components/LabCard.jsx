import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Clock, ArrowRight, CheckCircle2, Play } from 'lucide-react';

export default function LabCard({ lab, isActiveInstance }) {
  const difficultyConfig = {
    EASY: {
      label: 'Easy',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/50',
    },
    MEDIUM: {
      label: 'Medium',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'group-hover:border-amber-500/50',
    },
    HARD: {
      label: 'Hard',
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'group-hover:border-rose-500/50',
    },
  };

  const config = difficultyConfig[lab.difficulty] || difficultyConfig.EASY;

  return (
    <div className={`group relative bg-[#0f172a]/70 hover:bg-[#131c33] border border-slate-800/80 ${config.glow} rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between shadow-lg shadow-black/30 backdrop-blur-sm hover:-translate-y-1`}>
      {/* Top Banner / Tags */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${config.badge}`}>
              {config.label}
            </span>
            {lab.isSolved && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>SOLVED</span>
              </span>
            )}
            {isActiveInstance && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <span>RUNNING</span>
              </span>
            )}
          </div>

          <div className="flex items-center text-xs font-bold text-emerald-400 font-mono bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            +{lab.points} PTS
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition mb-2">
          {lab.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {lab.description}
        </p>

        {/* Tags */}
        {lab.tags && lab.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {lab.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1" title="จำนวนผู้พิชิต">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{lab.solvesCount || 0}</span>
          </span>
          <span className="flex items-center space-x-1" title="เวลาต่อรอบ">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{lab.timeoutMin} นาที</span>
          </span>
        </div>

        <Link
          to={`/labs/${lab.id}`}
          className={`inline-flex items-center space-x-1.5 font-semibold text-xs px-3 py-1.5 rounded-lg transition ${
            isActiveInstance
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border border-slate-700'
          }`}
        >
          <span>{isActiveInstance ? 'เข้าสู่ Lab' : 'เจาะช่องโหว่'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
