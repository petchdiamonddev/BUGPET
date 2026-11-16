import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export default function ActiveInstanceBar() {
  const { activeInstance, refreshActiveInstance, refreshUser } = useAuth();
  const [stopping, setStopping] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!activeInstance?.expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(activeInstance.expiresAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('หมดเวลาแล้ว');
        refreshActiveInstance();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeInstance, refreshActiveInstance]);

  if (!activeInstance) return null;

  const isStarting = activeInstance.status === 'STARTING';

  const handleStop = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการหยุดการทำงานของ Lab Container นี้?')) return;
    setStopping(true);
    try {
      await apiRequest(`/instances/${activeInstance.id}/stop`, { method: 'POST' });
      await refreshActiveInstance();
      await refreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="bg-[#fff9d7] border-b border-[#e2c822] text-[#333333] px-4 py-2 text-xs shadow-sm">
      <div className="max-w-[1020px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 bg-green-500 border border-green-700 rounded-full animate-pulse"></span>
          <span className="font-bold text-[#3b5998]">ด่านที่กำลังเปิดใช้งาน:</span>
          <span className="font-semibold">{activeInstance.labTitle}</span>
          <span className="text-gray-500 font-mono">({activeInstance.subdomain})</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="font-bold font-mono bg-white px-2 py-0.5 border border-[#e2c822] rounded-[2px]">
            เวลาที่เหลือ: {isStarting ? 'กำลังเตรียม Container...' : timeLeft}
          </span>

          {!isStarting && (
            <a
              href={activeInstance.url}
              target="_blank"
              rel="noopener noreferrer"
              className="fb-btn text-[11px] py-0.5 px-2"
            >
              เปิดเว็บเป้าหมาย &rarr;
            </a>
          )}

          <button
            onClick={handleStop}
            disabled={stopping}
            className="fb-btn-danger text-[11px] py-0.5 px-2"
          >
            {stopping ? 'กำลังหยุด...' : 'หยุดการทำงาน'}
          </button>
        </div>
      </div>
    </div>
  );
}
