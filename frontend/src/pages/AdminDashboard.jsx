import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [instances, setInstances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal create lab
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLab, setNewLab] = useState({
    title: '',
    description: '',
    difficulty: 'EASY',
    dockerImage: '',
    flag: '',
    points: 100,
    timeoutMin: 60,
    tags: '',
  });

  const fetchData = async () => {
    try {
      const [statsRes, instRes, usersRes] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/instances'),
        apiRequest('/admin/users'),
      ]);
      setStats(statsRes.data);
      setInstances(instRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateInstance = async (id) => {
    if (!confirm('ยืนยันที่จะบังคับหยุดการทำงานของ Container นี้หรือไม่?')) return;
    setActionLoading(true);
    try {
      await apiRequest(`/admin/instances/${id}/terminate`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLab = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...newLab,
        points: parseInt(newLab.points, 10),
        timeoutMin: parseInt(newLab.timeoutMin, 10),
        tags: newLab.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      await apiRequest('/labs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('สร้าง Lab ใหม่เรียบร้อยแล้ว!');
      setShowCreateModal(false);
      setNewLab({
        title: '',
        description: '',
        difficulty: 'EASY',
        dockerImage: '',
        flag: '',
        points: 100,
        timeoutMin: 60,
        tags: '',
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="fb-box p-8 text-center text-gray-500 text-xs">กำลังโหลดข้อมูลแผงควบคุม...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Box */}
      <div className="fb-box p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#3b5998]">แผงควบคุมระบบ (Admin Control Center)</h1>
          <p className="text-[11px] text-gray-500">ตรวจสอบสถานะเครื่อง Container และจัดการโจทย์ความปลอดภัย</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="fb-btn text-xs"
        >
          + สร้าง Lab ด่านใหม่
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="fb-box p-3 text-center">
            <div className="text-[11px] text-gray-500">สถานะ Docker</div>
            <div className="font-bold text-sm mt-1">
              {stats.systemStatus?.dockerHealthy ? (
                <span className="text-green-700">● ใช้งานได้ปกติ</span>
              ) : (
                <span className="text-red-600">● ขัดข้อง</span>
              )}
            </div>
          </div>
          <div className="fb-box p-3 text-center">
            <div className="text-[11px] text-gray-500">Active Containers</div>
            <div className="font-bold text-sm mt-1 text-[#3b5998]">{stats.activeInstances} เครื่อง</div>
          </div>
          <div className="fb-box p-3 text-center">
            <div className="text-[11px] text-gray-500">จำนวนการ Solve ทั้งหมด</div>
            <div className="font-bold text-sm mt-1 text-[#3b5998]">{stats.totalSolves} ครั้ง</div>
          </div>
          <div className="fb-box p-3 text-center">
            <div className="text-[11px] text-gray-500">สมาชิกในระบบ</div>
            <div className="font-bold text-sm mt-1 text-[#3b5998]">{stats.totalUsers} คน</div>
          </div>
        </div>
      )}

      {/* Real-time Container Monitor */}
      <div className="fb-box">
        <div className="fb-box-header flex items-center justify-between">
          <span>ตาราง Container ที่กำลังรันอยู่ ({instances.length})</span>
          <span className="text-[10px] text-gray-400 font-normal">อัปเดตอัตโนมัติ</span>
        </div>

        {instances.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">ขณะนี้ไม่มี Container กำลังทำงาน</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#eceff5] text-gray-600 font-bold border-b border-[#d8dfea]">
              <tr>
                <th className="px-3 py-2">ผู้เล่น</th>
                <th className="px-3 py-2">ชื่อ Lab</th>
                <th className="px-3 py-2">Subdomain / URL</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">หมดเวลา</th>
                <th className="px-3 py-2 text-right">คำสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {instances.map((inst) => (
                <tr key={inst.id} className="hover:bg-[#f7f7f7]">
                  <td className="px-3 py-2 font-bold text-[#385898]">{inst.user.username}</td>
                  <td className="px-3 py-2 text-gray-800">{inst.lab.title}</td>
                  <td className="px-3 py-2 font-mono">
                    <a href={inst.url} target="_blank" rel="noreferrer" className="text-[#385898] hover:underline">
                      {inst.subdomain}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span className="bg-green-100 text-green-800 border border-green-300 font-bold px-1.5 py-0.5 rounded-[2px] text-[10px]">
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(inst.expiresAt).toLocaleTimeString('th-TH')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleTerminateInstance(inst.id)}
                      disabled={actionLoading}
                      className="fb-btn-danger text-[10px] py-0.5 px-2"
                    >
                      บังคับหยุด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Management */}
      <div className="fb-box">
        <div className="fb-box-header">รายชื่อผู้ใช้ทั้งหมดในระบบ ({users.length})</div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#eceff5] text-gray-600 font-bold border-b border-[#d8dfea]">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">อีเมล</th>
              <th className="px-3 py-2">สิทธิ์</th>
              <th className="px-3 py-2">Solves</th>
              <th className="px-3 py-2 text-right">คะแนน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eceff5]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#f7f7f7]">
                <td className="px-3 py-2 font-mono text-gray-400">#{u.id}</td>
                <td className="px-3 py-2 font-bold text-[#385898]">{u.username}</td>
                <td className="px-3 py-2 text-gray-600 font-mono text-[11px]">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] ${u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono">{u.solvesCount}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-[#3b5998]">{u.points} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Create Lab */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="fb-box max-w-lg w-full">
            <div className="fb-box-header flex items-center justify-between">
              <span>สร้าง Lab ด่านใหม่</span>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-black font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLab} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">ชื่อ Lab:</label>
                <input
                  type="text"
                  required
                  value={newLab.title}
                  onChange={(e) => setNewLab({ ...newLab, title: e.target.value })}
                  placeholder="เช่น Cafe Club — SQL Injection"
                  className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">คำอธิบายภารกิจ:</label>
                <textarea
                  required
                  rows={3}
                  value={newLab.description}
                  onChange={(e) => setNewLab({ ...newLab, description: e.target.value })}
                  placeholder="รายละเอียดและช่องโหว่ของเป้าหมาย..."
                  className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ระดับความยาก:</label>
                  <select
                    value={newLab.difficulty}
                    onChange={(e) => setNewLab({ ...newLab, difficulty: e.target.value })}
                    className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none"
                  >
                    <option value="EASY">ง่าย (EASY)</option>
                    <option value="MEDIUM">ปานกลาง (MEDIUM)</option>
                    <option value="HARD">ยาก (HARD)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Docker Image:</label>
                  <input
                    type="text"
                    required
                    value={newLab.dockerImage}
                    onChange={(e) => setNewLab({ ...newLab, dockerImage: e.target.value })}
                    placeholder="bkimminich/juice-shop:latest"
                    className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Flag:</label>
                  <input
                    type="text"
                    required
                    value={newLab.flag}
                    onChange={(e) => setNewLab({ ...newLab, flag: e.target.value })}
                    placeholder="PETBUG{...}"
                    className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">คะแนน (แต้ม):</label>
                  <input
                    type="number"
                    value={newLab.points}
                    onChange={(e) => setNewLab({ ...newLab, points: e.target.value })}
                    className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">เวลา (นาที):</label>
                  <input
                    type="number"
                    value={newLab.timeoutMin}
                    onChange={(e) => setNewLab({ ...newLab, timeoutMin: e.target.value })}
                    className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">แท็ก (คั่นด้วยจุลภาค):</label>
                <input
                  type="text"
                  value={newLab.tags}
                  onChange={(e) => setNewLab({ ...newLab, tags: e.target.value })}
                  placeholder="SQLi, OWASP, Auth"
                  className="w-full border border-[#ccd0d5] px-2 py-1 rounded-[2px] outline-none"
                />
              </div>

              <div className="pt-2 border-t border-[#eceff5] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="fb-btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="fb-btn"
                >
                  {actionLoading ? 'กำลังสร้าง...' : 'บันทึกสร้าง Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
