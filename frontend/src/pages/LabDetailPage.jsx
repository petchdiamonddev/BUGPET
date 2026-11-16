import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Play,
  Square,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Shield,
  AlertTriangle,
  Send,
  Loader2,
  Terminal,
  Flag,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function LabDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeInstance, refreshActiveInstance, refreshUser } = useAuth();

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flagInput, setFlagInput] = useState('');
  const [submitResult, setSubmitResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchLabDetail = async () => {
    try {
      const res = await apiRequest(`/labs/${id}`);
      setLab(res.data);
    } catch (err) {
      alert(err.message);
      navigate('/labs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabDetail();
  }, [id]);

  // Check if this lab is the currently active one
  const isThisLabActive = activeInstance && activeInstance.labId === parseInt(id, 10);
  const currentInstance = isThisLabActive ? activeInstance : lab?.activeInstance;

  const handleStartInstance = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setStarting(true);
    setSubmitResult(null);
    try {
      await apiRequest(`/instances/start/${id}`, { method: 'POST' });
      await refreshActiveInstance();
      await fetchLabDetail();
    } catch (err) {
      alert(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStopInstance = async () => {
    if (!currentInstance) return;
    if (!confirm('ยืนยันที่จะหยุดการทำงานของ Lab นี้หรือไม่?')) return;
    setStopping(true);
    try {
      await apiRequest(`/instances/${currentInstance.id}/stop`, { method: 'POST' });
      await refreshActiveInstance();
      await fetchLabDetail();
    } catch (err) {
      alert(err.message);
    } finally {
      setStopping(false);
    }
  };

  const handleCopyUrl = () => {
    if (!currentInstance?.url) return;
    navigator.clipboard.writeText(currentInstance.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flagInput.trim()) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await apiRequest(`/solves/labs/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ flag: flagInput.trim() }),
      });

      setSubmitResult({
        success: true,
        message: res.message,
        points: res.earnedPoints,
        newBadges: res.newBadges || [],
      });

      // Launch victory confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      await refreshUser();
      await refreshActiveInstance();
      await fetchLabDetail();
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
        <p>กำลังโหลดข้อมูล Lab...</p>
      </div>
    );
  }

  if (!lab) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <Link
        to="/labs"
        className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปยังรายการ Labs</span>
      </Link>

      {/* Main Lab Header */}
      <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                lab.difficulty === 'HARD'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : lab.difficulty === 'MEDIUM'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {lab.difficulty}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
              +{lab.points} POINTS
            </span>
            {lab.isSolved && (
              <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SOLVED</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-4">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              จำกัดเวลา {lab.timeoutMin} นาที
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
          {lab.title}
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {lab.description}
        </p>

        {lab.tags && lab.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {lab.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Target Environment Box (Container Control) */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Target Environment (Isolated Lab)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">1 User = 1 Instance</span>
        </div>

        {/* State: Not Running */}
        {!currentInstance && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <div>
              <h4 className="font-semibold text-white text-sm">พร้อมเริ่มการทดสอบเจาะระบบ</h4>
              <p className="text-xs text-slate-400 mt-1">
                คลิกปุ่มเพื่อสร้าง Docker Container และ Traefik Subdomain เฉพาะของคุณ
              </p>
            </div>
            <button
              onClick={handleStartInstance}
              disabled={starting}
              className="inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{starting ? 'กำลังเตรียม Container...' : 'Start Instance'}</span>
            </button>
          </div>
        )}

        {/* State: Running or Starting */}
        {currentInstance && (
          <div className="space-y-4">
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-bold text-emerald-400 tracking-wide">
                    CONTAINER RUNNING
                  </span>
                </div>

                <button
                  onClick={handleStopInstance}
                  disabled={stopping}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {stopping ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Square className="w-3 h-3 fill-current" />
                  )}
                  <span>Stop Instance</span>
                </button>
              </div>

              {/* URL Display */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 flex items-center justify-between font-mono text-sm text-emerald-300 overflow-x-auto">
                  <span>{currentInstance.url}</span>
                  <button
                    onClick={handleCopyUrl}
                    className="ml-2 p-1 text-slate-400 hover:text-white transition"
                    title="คัดลอก URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <a
                  href={currentInstance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20 whitespace-nowrap"
                >
                  <span>เปิด Target URL</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flag Submission Box */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
          <Flag className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">ส่งคำตอบ (Submit Flag)</h2>
        </div>

        <form onSubmit={handleSubmitFlag} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={flagInput}
              onChange={(e) => setFlagInput(e.target.value)}
              placeholder="PETBUG{...}"
              disabled={submitting}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={submitting || !flagInput.trim()}
              className="inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>ส่ง Flag</span>
            </button>
          </div>

          {/* Feedback Alert */}
          {submitResult && (
            <div
              className={`p-4 rounded-xl border flex items-start space-x-3 ${
                submitResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {submitResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold text-sm">{submitResult.message}</div>
                {submitResult.success && submitResult.points && (
                  <div className="text-xs text-emerald-400 font-mono">
                    คุณได้รับคะแนน +{submitResult.points} PTS!
                  </div>
                )}
                {submitResult.newBadges && submitResult.newBadges.length > 0 && (
                  <div className="text-xs text-amber-300 font-semibold mt-1">
                    🏅 ปลดล็อก Achievement ใหม่: {submitResult.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
