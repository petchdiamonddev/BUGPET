import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
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
    if (!confirm('ยืนยันที่จะหยุดการทำงานของ Lab Container นี้หรือไม่?')) return;
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

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

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
    return <div className="fb-box p-8 text-center text-gray-500">กำลังโหลดข้อมูลด่าน...</div>;
  }

  if (!lab) return null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="text-xs text-gray-500">
        <Link to="/labs" className="text-[#385898] hover:underline">ด่านทดสอบทั้งหมด</Link> &raquo; <span>{lab.title}</span>
      </div>

      {/* Main Challenge Box */}
      <div className="fb-box">
        <div className="fb-box-header flex items-center justify-between">
          <span className="text-sm font-bold">{lab.title}</span>
          <span className="font-mono font-bold text-[#3b5998]">+{lab.points} แต้ม</span>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-center space-x-3 text-gray-500 pb-2 border-b border-[#eceff5]">
            <span>ระดับความยาก: <b className="text-black">{lab.difficulty}</b></span>
            <span>&bull;</span>
            <span>จำกัดเวลา: <b>{lab.timeoutMin} นาที</b></span>
            <span>&bull;</span>
            <span>ผู้ผ่านด่าน: <b>{lab.solvesCount} คน</b></span>
            {lab.isSolved && (
              <span className="bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-[2px] border border-green-300">
                พิชิตสำเร็จแล้ว ✓
              </span>
            )}
          </div>

          <div>
            <h3 className="font-bold text-gray-700 mb-1">รายละเอียดและบริบทของภารกิจ</h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">
              {lab.description}
            </p>
          </div>

          {lab.tags && lab.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {lab.tags.map((tag, idx) => (
                <span key={idx} className="bg-[#f0f2f5] text-gray-600 px-1.5 py-0.5 border border-[#ccd0d5] rounded-[2px]">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Target Container Environment Box */}
      <div className="fb-box">
        <div className="fb-box-header">สภาพแวดล้อมเป้าหมาย (Isolated Container)</div>
        <div className="p-4 space-y-3">
          {!currentInstance ? (
            <div className="bg-[#f7f7f7] border border-[#d8dfea] p-3 rounded-[2px] flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-gray-800">เปิดใช้งาน Lab Container ส่วนบุคคล</div>
                <div className="text-[11px] text-gray-500">
                  ระบบจะสร้าง Docker Container พร้อม Subdomain ชี้ผ่าน Traefik สำหรับคุณโดยเฉพาะ
                </div>
              </div>
              <button
                onClick={handleStartInstance}
                disabled={starting}
                className="fb-btn"
              >
                {starting ? 'กำลังเตรียม Container...' : 'เริ่มระบบ Lab (Start)'}
              </button>
            </div>
          ) : (
            <div className="bg-[#fff9d7] border border-[#e2c822] p-3 rounded-[2px] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-700">● Container กำลังทำงาน (พร้อมเจาะระบบ)</span>
                <button
                  onClick={handleStopInstance}
                  disabled={stopping}
                  className="fb-btn-danger text-[11px] py-0.5"
                >
                  {stopping ? 'กำลังหยุด...' : 'หยุดการทำงาน (Stop)'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={currentInstance.url}
                  className="bg-white border border-[#ccd0d5] px-2 py-1 rounded-[2px] font-mono text-xs flex-1 outline-none text-[#3b5998]"
                />
                <button onClick={handleCopyUrl} className="fb-btn-secondary text-[11px] py-1">
                  {copied ? 'คัดลอกแล้ว!' : 'คัดลอก URL'}
                </button>
                <a
                  href={currentInstance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fb-btn text-[11px] py-1"
                >
                  เปิดหน้าเป้าหมายในแท็บใหม่ &rarr;
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flag Submission Box */}
      <div className="fb-box">
        <div className="fb-box-header">ส่งคำตอบ (Submit Flag)</div>
        <div className="p-4 space-y-3 text-xs">
          <form onSubmit={handleSubmitFlag} className="space-y-2">
            <label className="block font-bold text-gray-700">
              เมื่อเจาะระบบสำเร็จและพบ Flag แล้ว กรุณากรอกรหัส Flag เพื่อรับแต้ม:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="PETBUG{...}"
                disabled={submitting}
                className="border border-[#ccd0d5] px-3 py-1.5 rounded-[2px] font-mono text-xs flex-1 outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !flagInput.trim()}
                className="fb-btn"
              >
                {submitting ? 'กำลังตรวจสอบ...' : 'ส่ง Flag'}
              </button>
            </div>
          </form>

          {submitResult && (
            <div
              className={`p-3 rounded-[2px] border ${
                submitResult.success
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              <div className="font-bold">{submitResult.message}</div>
              {submitResult.success && submitResult.points && (
                <div className="font-mono mt-1 font-bold">
                  คะแนนที่ได้รับ: +{submitResult.points} แต้ม!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
