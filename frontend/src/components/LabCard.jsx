import React from 'react';
import { Link } from 'react-router-dom';

export default function LabCard({ lab, isActiveInstance }) {
  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'HARD':
        return <span className="bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded-[2px] font-bold text-[10px]">ยาก (HARD)</span>;
      case 'MEDIUM':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-[2px] font-bold text-[10px]">ปานกลาง (MEDIUM)</span>;
      default:
        return <span className="bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5 rounded-[2px] font-bold text-[10px]">ง่าย (EASY)</span>;
    }
  };

  return (
    <div className="fb-box">
      {/* Box Header */}
      <div className="fb-box-header flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getDifficultyBadge(lab.difficulty)}
          <Link to={`/labs/${lab.id}`} className="text-[#385898] hover:underline font-bold text-xs sm:text-sm">
            {lab.title}
          </Link>
        </div>
        <div className="text-[11px] font-bold font-mono text-[#3b5998]">
          +{lab.points} แต้ม
        </div>
      </div>

      {/* Box Body */}
      <div className="p-3 space-y-2 text-xs">
        <p className="text-gray-700 leading-relaxed">
          {lab.description}
        </p>

        {lab.tags && lab.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[11px]">
            {lab.tags.map((tag, idx) => (
              <span key={idx} className="bg-[#f0f2f5] text-gray-600 px-1.5 py-0.5 border border-[#ccd0d5] rounded-[2px]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Box Footer Actions */}
      <div className="px-3 py-2 bg-[#f7f7f7] border-t border-[#d8dfea] flex items-center justify-between text-[11px]">
        <div className="text-gray-500 space-x-2">
          <span>ผ่านแล้ว: <b className="text-black">{lab.solvesCount || 0} คน</b></span>
          <span>&bull;</span>
          <span>เวลา: <b>{lab.timeoutMin} นาที</b></span>
          {lab.isSolved && (
            <>
              <span>&bull;</span>
              <span className="text-green-700 font-bold">พิชิตแล้ว ✓</span>
            </>
          )}
        </div>

        <Link
          to={`/labs/${lab.id}`}
          className={isActiveInstance ? 'fb-btn bg-green-600 border-green-800' : 'fb-btn'}
        >
          {isActiveInstance ? 'กลับเข้าสู่ Lab &rarr;' : 'ดูรายละเอียดและเจาะระบบ &rarr;'}
        </Link>
      </div>
    </div>
  );
}
