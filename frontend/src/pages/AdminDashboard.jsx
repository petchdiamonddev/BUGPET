import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Server,
  Users,
  Activity,
  Plus,
  Trash2,
  StopCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
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
    if (!confirm('ยืนยันที่จะบังคับหยุด Container นี้หรือไม่?')) return;
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
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
        <p>กำลังโหลดข้อมูลระบบ Admin...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-8 h-8 text-emerald-400" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ภาพรวมระบบ ควบคุม Container แบบเรียลไทม์ และจัดการโจทย์ความปลอดภัย
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>สร้าง Lab ใหม่</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">Docker Status</div>
            <div className="text-lg font-bold flex items-center gap-2 mt-2">
              {stats.systemStatus?.dockerHealthy ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-400">Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">Active Containers</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {stats.activeInstances} เครื่อง
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">Total Solves</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {stats.totalSolves} ครั้ง
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">Total Registered Users</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {stats.totalUsers} คน
            </div>
          </div>
        </div>
      )}

      {/* Real-time Container Monitor */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Active Running Containers ({instances.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">Auto-refreshed</span>
        </div>

        {instances.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800/80">
            ไม่มี Container กำลังทำงานอยู่ในขณะนี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Lab Title</th>
                  <th className="px-4 py-3">Subdomain / URL</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {instances.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-white">
                      {inst.user.username}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{inst.lab.title}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">
                      <a href={inst.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                        <span>{inst.subdomain}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(inst.expiresAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleTerminateInstance(inst.id)}
                        disabled={actionLoading}
                        className="inline-flex items-center space-x-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded text-xs transition"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Force Stop</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          ผู้ใช้งานในระบบ ({users.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Solves</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-slate-500">#{u.id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{u.username}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{u.solvesCount}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                    {u.points} PTS
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Lab */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">สร้าง Lab ด่านใหม่</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLab} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">ชื่อ Lab</label>
                <input
                  type="text"
                  required
                  value={newLab.title}
                  onChange={(e) => setNewLab({ ...newLab, title: e.target.value })}
                  placeholder="e.g. Cafe Club — SQL Injection"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">คำอธิบาย</label>
                <textarea
                  required
                  rows={3}
                  value={newLab.description}
                  onChange={(e) => setNewLab({ ...newLab, description: e.target.value })}
                  placeholder="รายละเอียดบริบทของระบบเป้าหมายและจุดบกพร่อง..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">ระดับความยาก</label>
                  <select
                    value={newLab.difficulty}
                    onChange={(e) => setNewLab({ ...newLab, difficulty: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Docker Image</label>
                  <input
                    type="text"
                    required
                    value={newLab.dockerImage}
                    onChange={(e) => setNewLab({ ...newLab, dockerImage: e.target.value })}
                    placeholder="e.g. bkimminich/juice-shop:latest"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Flag</label>
                  <input
                    type="text"
                    required
                    value={newLab.flag}
                    onChange={(e) => setNewLab({ ...newLab, flag: e.target.value })}
                    placeholder="PETBUG{...}"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">คะแนน (PTS)</label>
                  <input
                    type="number"
                    value={newLab.points}
                    onChange={(e) => setNewLab({ ...newLab, points: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">เวลา (นาที)</label>
                  <input
                    type="number"
                    value={newLab.timeoutMin}
                    onChange={(e) => setNewLab({ ...newLab, timeoutMin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tags (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  value={newLab.tags}
                  onChange={(e) => setNewLab({ ...newLab, tags: e.target.value })}
                  placeholder="SQLi, OWASP, Auth"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-lg transition"
                >
                  {actionLoading ? 'กำลังสร้าง...' : 'สร้าง Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
