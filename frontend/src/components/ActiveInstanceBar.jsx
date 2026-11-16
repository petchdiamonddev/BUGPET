import React, { useState, useEffect } from 'react';
import { ExternalLink, Square, Clock, Terminal, AlertCircle, Loader2 } from 'lucide-react';
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
        setTimeLeft('หมดเวลา');
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
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการหยุด Lab นี้?')) return;
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
    <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border-b border-emerald-500/30 backdrop-blur-md px-4 py-2.5 text-sm sticky top-0 z-50 shadow-lg shadow-emerald-950/20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isStarting ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isStarting ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="font-semibold text-white tracking-wide flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              {activeInstance.labTitle}
            </span>
          </div>

          <span className="hidden sm:inline-block text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
            {activeInstance.subdomain}
          </span>
        </div>

        {/* Right: Actions & Countdown */}
        <div className="flex items-center space-x-3 text-xs sm:text-sm">
          {/* Timer */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 text-slate-200 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{isStarting ? 'กำลังเตรียม Container...' : timeLeft}</span>
          </div>

          {/* Target URL */}
          {!isStarting && (
            <a
              href={activeInstance.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-md transition shadow-sm hover:shadow-emerald-500/20"
            >
              <span>เปิด Target Lab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={stopping}
            className="inline-flex items-center space-x-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md transition disabled:opacity-50"
          >
            {stopping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3 h-3 fill-current" />
            )}
            <span>หยุด Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
}
