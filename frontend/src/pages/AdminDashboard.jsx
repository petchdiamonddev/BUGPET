import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BRAND } from '../config/brand';
import {
  Activity,
  Box,
  Boxes,
  CircleAlert,
  CircleCheck,
  Container,
  Cpu,
  ExternalLink,
  Gauge,
  Layers,
  Pencil,
  Play,
  Plus,
  Power,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Modal, useConfirm } from '../components/ui/Modal';
import { cn, formatDate, formatDateTime, formatDuration, pointsLabel, relativeTime, DIFFICULTY } from '../lib/format';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  DifficultyBadge,
  EmptyState,
  Field,
  Segmented,
  Skeleton,
  Sparkline,
  StatusDot,
} from '../components/ui/Primitives';

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */
function Metric({ label, value, suffix, trend, icon: Icon, spark, tone = 'ink' }) {
  const tones = { ink: 'text-ink', moss: 'text-moss', ember: 'text-ember-deep', acid: 'text-[#5d6f0d]' };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-ink-muted">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {spark && <Sparkline data={spark} className={tones[tone]} width={72} height={24} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('num font-display text-2xl font-bold', tones[tone])}>{value}</span>
        {suffix && <span className="font-mono text-[11px] text-ink-faint">{suffix}</span>}
      </div>
      {trend && <p className="mt-0.5 text-[11px] text-ink-faint">{trend}</p>}
    </Card>
  );
}

function OverviewTab({ stats, loading, onRefresh }) {
  if (loading || !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-card" />
        ))}
      </div>
    );
  }

  const { totals, system, sparklines, difficultyBreakdown } = stats;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="ผู้เล่นทั้งหมด" value={totals.users} suffix="users" icon={Users} trend={`+${totals.usersThisWeek} ใน 7 วัน`} />
        <Metric
          label="Container ที่รันอยู่"
          value={totals.activeInstances}
          suffix="live"
          icon={Container}
          tone="moss"
          spark={sparklines.solves.map((d) => d.count)}
        />
        <Metric label="การพิชิตด่าน" value={totals.solves} suffix="solves" icon={Gauge} tone="acid" trend={`+${totals.solvesThisWeek} ใน 7 วัน`} spark={sparklines.solves.map((d) => d.count)} />
        <Metric label="ด่านในระบบ" value={totals.labs} suffix={`${totals.activeLabs} active`} icon={Layers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            eyebrow="14 days"
            title="แนวโน้มการพิชิตด่าน"
            action={
              <button onClick={onRefresh} className="text-xs text-ink-muted hover:text-ink">
                ↻ รีเฟรช
              </button>
            }
          />
          <div className="p-4">
            <div className="flex h-32 items-end gap-1">
              {(() => {
                const max = Math.max(1, ...sparklines.solves.map((x) => x.count));
                return sparklines.solves.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-paper-raised opacity-0 transition-opacity group-hover:opacity-100">
                      {d.count}
                    </span>
                    {/* h-[6%] floor keeps zero-days visible as a baseline tick */}
                    <div
                      className={cn(
                        'w-full rounded-t transition-colors',
                        d.count === 0 ? 'bg-paper-strong group-hover:bg-ink-faint' : 'bg-ink group-hover:bg-acid-deep'
                      )}
                      style={{ height: d.count === 0 ? '6%' : `${Math.max(10, (d.count / max) * 100)}%` }}
                    />
                  </div>
                ));
              })()}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-faint">
              <span>{sparklines.solves[0]?.date.slice(5)}</span>
              <span>
                รวม {sparklines.solves.reduce((s, d) => s + d.count, 0)} ครั้งใน 14 วัน
              </span>
              <span>{sparklines.solves.at(-1)?.date.slice(5)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="system" title="สถานะระบบ" />
          <div className="divide-y divide-dashed divide-paper-line text-[13px]">
            {[
              {
                k: 'Docker daemon',
                v: system.dockerHealthy ? 'เชื่อมต่อแล้ว' : 'ไม่สามารถเชื่อมต่อ',
                ok: system.dockerHealthy,
              },
              { k: 'โหมด', v: system.nodeEnv, mono: true },
              { k: 'โดเมนแล็บ', v: system.baseDomain, mono: true },
              { k: 'Uptime', v: formatDuration(system.uptimeSec * 1000), mono: true },
              { k: 'หน่วยความจำ', v: `${system.memoryMb} MB`, mono: true },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between px-4 py-2">
                <span className="text-ink-muted">{row.k}</span>
                <span className={cn('flex items-center gap-1.5 font-medium', row.ok === false ? 'text-ember-deep' : 'text-ink', row.mono && 'font-mono text-xs')}>
                  {row.ok !== undefined && <StatusDot tone={row.ok ? 'moss' : 'ember'} pulse={!row.ok} />}
                  {row.v}
                </span>
              </div>
            ))}
          </div>
          {!system.dockerHealthy && (
            <div className="m-3 rounded-xl border border-ember/30 bg-ember-soft p-2.5 text-[12px] text-ember-deep">
              <CircleAlert className="mb-1 h-4 w-4" />
              Docker ยังไม่ทำงาน — การเริ่มด่านจะล้มเหลวจนกว่าจะเปิด Docker Desktop
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="inventory" title="สัดส่วนระดับความยาก" />
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {Object.keys(DIFFICULTY).map((k) => {
            const count = difficultyBreakdown.find((d) => d.difficulty === k)?.count ?? 0;
            const total = difficultyBreakdown.reduce((s, d) => s + d.count, 0) || 1;
            return (
              <div key={k} className="rounded-xl border border-paper-line bg-paper-soft/60 p-3">
                <div className="flex items-center justify-between">
                  <DifficultyBadge difficulty={k} showEn={false} />
                  <span className="num font-mono text-sm font-semibold text-ink">{count}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-line">
                  <div
                    className={cn('h-full rounded-full', { EASY: 'bg-moss', MEDIUM: 'bg-ember', HARD: 'bg-plum' }[k])}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lab editor                                                          */
/* ------------------------------------------------------------------ */
const EMPTY_LAB = {
  title: '',
  description: '',
  difficulty: 'EASY',
  dockerImage: '',
  flag: '',
  points: 100,
  timeoutMin: 60,
  tagsInput: '',
  isActive: true,
};

function LabEditor({ open, initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_LAB);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setForm({
        title: initial.title ?? '',
        description: initial.description ?? '',
        difficulty: initial.difficulty ?? 'EASY',
        dockerImage: initial.dockerImage ?? '',
        flag: initial.flag ?? '',
        points: initial.points ?? 100,
        timeoutMin: initial.timeoutMin ?? 60,
        tagsInput: (initial.tags ?? []).join(', '),
        isActive: initial.isActive ?? true,
      });
    } else {
      setForm(EMPTY_LAB);
    }
  }, [open, initial]);

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'ชื่อต้องมีอย่างน้อย 3 ตัวอักษร';
    if (form.description.trim().length < 5) next.description = 'คำอธิบายต้องมีอย่างน้อย 5 ตัวอักษร';
    if (!form.dockerImage.trim()) next.dockerImage = 'ต้องระบุ Docker image';
    if (form.flag.trim().length < 4) next.flag = 'Flag ต้องมีอย่างน้อย 4 ตัวอักษร';
    const points = Number(form.points);
    if (!Number.isInteger(points) || points < 10) next.points = 'คะแนนขั้นต่ำ 10';
    const timeout = Number(form.timeoutMin);
    if (!Number.isInteger(timeout) || timeout < 5 || timeout > 360) next.timeoutMin = 'เวลาต้องอยู่ระหว่าง 5–360 นาที';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty,
      dockerImage: form.dockerImage.trim(),
      flag: form.flag.trim(),
      points: Number(form.points),
      timeoutMin: Number(form.timeoutMin),
      tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      isActive: form.isActive,
    };
    try {
      if (isEdit) await api.put(`/admin/labs/${initial.id}`, payload);
      else await api.post('/admin/labs', payload);
      toast.success(isEdit ? 'บันทึกการแก้ไขแล้ว' : 'สร้างด่านใหม่แล้ว', payload.title);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={isEdit ? `edit · lab #${initial?.id}` : 'new lab'}
      title={isEdit ? 'แก้ไขด่าน' : 'สร้างด่านใหม่'}
      description="ฟิลด์ Docker image และ Flag จะไม่ถูกส่งให้ผู้เล่นเห็น"
      footer={
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="h-4 w-4 accent-ink" />
            เปิดให้ผู้เล่นเห็นด่านนี้
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">
              ยกเลิก
            </button>
            <Button size="sm" loading={saving} onClick={submit}>
              {isEdit ? 'บันทึกการแก้ไข' : 'สร้างด่าน'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="ชื่อด่าน" required error={errors.title}>
          <input value={form.title} onChange={set('title')} className={cn('input', errors.title && 'input-error')} placeholder="Cafe Club — SQL Injection" />
        </Field>

        <Field label="คำอธิบาย / brief" required error={errors.description} hint="ขึ้นบรรทัดใหม่ได้ รองรับหลายย่อหน้า">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
            className={cn('input resize-y font-sans text-[13px]', errors.description && 'input-error')}
            placeholder="บริบทของเป้าหมายและภารกิจ…"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ระดับความยาก">
            <select value={form.difficulty} onChange={set('difficulty')} className="select">
              <option value="EASY">ง่าย (EASY)</option>
              <option value="MEDIUM">ปานกลาง (MEDIUM)</option>
              <option value="HARD">ยาก (HARD)</option>
            </select>
          </Field>
          <Field label="Docker image" required error={errors.dockerImage} hint="เช่น petbug/lab-sqli:latest">
            <input
              value={form.dockerImage}
              onChange={set('dockerImage')}
              className={cn('input font-mono text-xs', errors.dockerImage && 'input-error')}
              placeholder="bkimminich/juice-shop:latest"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Flag" required error={errors.flag}>
            <input
              value={form.flag}
              onChange={set('flag')}
              className={cn('input font-mono text-xs', errors.flag && 'input-error')}
              placeholder={`${BRAND.flagFormat}{...}`}
            />
          </Field>
          <Field label="คะแนน" required error={errors.points}>
            <input type="number" min={10} value={form.points} onChange={set('points')} className={cn('input font-mono', errors.points && 'input-error')} />
          </Field>
          <Field label="เวลา (นาที)" error={errors.timeoutMin}>
            <input
              type="number"
              min={5}
              max={360}
              value={form.timeoutMin}
              onChange={set('timeoutMin')}
              className={cn('input font-mono', errors.timeoutMin && 'input-error')}
            />
          </Field>
        </div>

        <Field label="แท็ก" hint="คั่นด้วยจุลภาค · ไม่เกิน 12 แท็ก">
          <input value={form.tagsInput} onChange={set('tagsInput')} className="input" placeholder="SQLi, OWASP Top 10, Auth" />
        </Field>

        {form.tagsInput && (
          <div className="flex flex-wrap gap-1">
            {form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
              <span key={t} className="chip-neutral">{t}</span>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Labs tab                                                            */
/* ------------------------------------------------------------------ */
function LabsTab({ labs, loading, reload }) {
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [editor, setEditor] = useState({ open: false, lab: null });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const filtered = labs.filter((l) => {
    if (filter === 'active' && !l.isActive) return false;
    if (filter === 'inactive' && l.isActive) return false;
    if (search && !`${l.title} ${l.dockerImage}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = async (lab) => {
    setBusyId(lab.id);
    try {
      await api.patch(`/admin/labs/${lab.id}/toggle`);
      toast.success(lab.isActive ? 'ปิดใช้งานด่านแล้ว' : 'เปิดใช้งานด่านแล้ว', lab.title);
      reload();
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reset = async (lab) => {
    const ok = await confirm({
      title: 'รีเซ็ตผลการแก้ด่าน?',
      description: `ลบประวัติการผ่านด่าน "${lab.title}" ของทุกคน และคำนวณคะแนนใหม่`,
      confirmLabel: 'รีเซ็ต',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await api.post(`/admin/labs/${lab.id}/reset`);
      toast.success('รีเซ็ตแล้ว', res.message);
      reload();
    } catch (err) {
      toast.error('รีเซ็ตไม่สำเร็จ', err.message);
    }
  };

  const remove = async (lab) => {
    const ok = await confirm({
      title: 'ลบด่านนี้ถาวร?',
      description: `"${lab.title}" จะถูกลบพร้อมประวัติการแก้ ${lab.solvesCount} ครั้ง และ container ที่รันอยู่จะถูกปิด`,
      confirmLabel: 'ลบด่าน',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/admin/labs/${lab.id}`);
      toast.success('ลบด่านแล้ว', lab.title);
      reload();
    } catch (err) {
      toast.error('ลบไม่สำเร็จ', err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อหรือ image…" className="input pl-9" />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: 'all', label: 'ทั้งหมด', count: labs.length },
            { value: 'active', label: 'เปิด', count: labs.filter((l) => l.isActive).length },
            { value: 'inactive', label: 'ปิด', count: labs.filter((l) => !l.isActive).length },
          ]}
        />
        <Button size="sm" icon={Plus} onClick={() => setEditor({ open: true, lab: null })}>
          สร้างด่าน
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-72 rounded-card" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Boxes} title="ไม่พบด่าน" description="ลองเปลี่ยนตัวกรอง หรือสร้างด่านใหม่" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-paper-line bg-paper-soft/60 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-medium">ด่าน</th>
                  <th className="px-3 py-2 font-medium">ระดับ</th>
                  <th className="px-3 py-2 font-medium">คะแนน</th>
                  <th className="px-3 py-2 font-medium">ผ่าน</th>
                  <th className="px-3 py-2 font-medium">กำลังรัน</th>
                  <th className="px-3 py-2 font-medium">สถานะ</th>
                  <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-paper-line">
                {filtered.map((lab) => (
                  <tr key={lab.id} className="group transition-colors hover:bg-paper-soft/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{lab.title}</p>
                      <p className="truncate font-mono text-[10px] text-ink-faint">{lab.dockerImage}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <DifficultyBadge difficulty={lab.difficulty} showEn={false} />
                    </td>
                    <td className="num px-3 py-2.5 font-mono text-xs text-ink-soft">{lab.points}</td>
                    <td className="num px-3 py-2.5 font-mono text-xs text-ink-soft">{lab.solvesCount}</td>
                    <td className="num px-3 py-2.5 font-mono text-xs">
                      <span className={cn(lab.activeInstances > 0 ? 'font-semibold text-moss' : 'text-ink-faint')}>{lab.activeInstances}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('chip', lab.isActive ? 'chip-moss' : 'chip-neutral')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', lab.isActive ? 'bg-moss' : 'bg-ink-faint')} />
                        {lab.isActive ? 'เปิด' : 'ปิด'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditor({ open: true, lab })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-paper-line hover:text-ink"
                          title="แก้ไข"
                          aria-label={`แก้ไขด่าน ${lab.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(lab)}
                          disabled={busyId === lab.id}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-paper-line hover:text-ink disabled:opacity-40"
                          title={lab.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          aria-label={`${lab.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}ด่าน ${lab.title}`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reset(lab)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-paper-line hover:text-ink"
                          title="รีเซ็ตผลการแก้"
                          aria-label={`รีเซ็ตผลการแก้ด่าน ${lab.title}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(lab)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-ember-soft hover:text-ember-deep"
                          title="ลบ"
                          aria-label={`ลบด่าน ${lab.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <LabEditor open={editor.open} initial={editor.lab} onClose={() => setEditor({ open: false, lab: null })} onSaved={reload} />
      {confirmDialog}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instances tab                                                       */
/* ------------------------------------------------------------------ */
function InstancesTab() {
  const toast = useToast();
  const [instances, setInstances] = useState([]);
  const [recent, setRecent] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const load = useCallback(async () => {
    const [instRes, dockerRes] = await Promise.allSettled([api.get('/admin/instances'), api.get('/admin/docker/containers')]);
    if (instRes.status === 'fulfilled') {
      setInstances(instRes.value.data ?? []);
      setRecent(instRes.value.meta?.recent ?? []);
    }
    if (dockerRes.status === 'fulfilled') setContainers(dockerRes.value.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const terminate = async (inst) => {
    try {
      await api.post(`/admin/instances/${inst.id}/terminate`);
      toast.info('สั่งปิด container แล้ว', inst.lab?.title);
      load();
    } catch (err) {
      toast.error('ปิดไม่สำเร็จ', err.message);
    }
  };

  const rows = tab === 'active' ? instances : tab === 'recent' ? recent : containers;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          size="sm"
          options={[
            { value: 'active', label: 'กำลังรัน', count: instances.length },
            { value: 'recent', label: 'ล่าสุด' },
            { value: 'docker', label: 'Docker containers', count: containers.length },
          ]}
        />
        <button type="button" onClick={load} className="min-h-[32px] rounded-lg px-2 text-xs text-ink-muted hover:bg-paper-soft hover:text-ink">
          ↻ อัปเดตอัตโนมัติทุก 10 วินาที
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-card" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={Container} title="ไม่มีข้อมูลในหมวดนี้" description="เมื่อมีผู้เล่นเริ่มด่าน รายการจะปรากฏที่นี่" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-paper-line bg-paper-soft/60 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-medium">{tab === 'docker' ? 'Container' : 'ผู้เล่น'}</th>
                  <th className="px-3 py-2 font-medium">{tab === 'docker' ? 'Image' : 'ด่าน'}</th>
                  <th className="px-3 py-2 font-medium">URL / Subdomain</th>
                  <th className="px-3 py-2 font-medium">สถานะ</th>
                  <th className="px-3 py-2 font-medium">{tab === 'active' ? 'เหลือเวลา' : 'เวลา'}</th>
                  {tab === 'active' && <th className="px-4 py-2 text-right font-medium">คำสั่ง</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-paper-line">
                {tab === 'docker'
                  ? containers.map((c) => (
                      <tr key={c.id} className="hover:bg-paper-soft/50">
                        <td className="px-4 py-2.5 font-mono text-xs text-ink">{c.name}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-ink-muted">{c.image}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-ink-muted">{c.subdomain ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn('chip', c.state === 'running' ? 'chip-moss' : 'chip-neutral')}>{c.state}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-ink-faint">{c.status}</td>
                        <td className="px-4 py-2.5" />
                      </tr>
                    ))
                  : rows.map((inst) => (
                      <tr key={inst.id} className="hover:bg-paper-soft/50">
                        <td className="px-4 py-2.5">
                          {inst.user ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={inst.user.username} size={24} />
                              <span className="font-medium text-ink">{inst.user.username}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-ink-faint">{inst.id.slice(0, 10)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">{inst.lab?.title}</td>
                        <td className="px-3 py-2.5">
                          <a href={inst.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-muted hover:text-ink hover:underline">
                            {inst.subdomain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'chip',
                              inst.status === 'RUNNING' && 'chip-moss',
                              inst.status === 'STARTING' && 'chip-acid',
                              inst.status === 'ERROR' && 'chip-ember',
                              inst.status === 'STOPPED' && 'chip-neutral'
                            )}
                          >
                            {inst.status}
                            {inst.stopReason ? ` · ${inst.stopReason}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-ink-muted">
                          {tab === 'active' ? formatDuration(inst.remainingMs) : formatDateTime(inst.startedAt)}
                        </td>
                        {tab === 'active' && (
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => terminate(inst)} className="btn-ghost btn-sm text-ember-deep hover:border-ember/40 hover:bg-ember-soft">
                              <Square className="h-3 w-3 fill-current" />
                              บังคับปิด
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users tab                                                           */
/* ------------------------------------------------------------------ */
function UsersTab({ currentUserId }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      setUsers(res.data ?? []);
      setMeta(res.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const update = async (user, patch) => {
    try {
      await api.patch(`/admin/users/${user.id}`, patch);
      toast.success('อัปเดตผู้ใช้แล้ว', user.username);
      load();
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ', err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล…" className="input pl-9" />
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-paper-line bg-paper-soft/60 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-medium">ผู้ใช้</th>
                  <th className="px-3 py-2 font-medium">อีเมล</th>
                  <th className="px-3 py-2 font-medium">ผ่านด่าน</th>
                  <th className="px-3 py-2 font-medium">ความคืบหน้า</th>
                  <th className="px-3 py-2 font-medium">เข้าใช้ล่าสุด</th>
                  <th className="px-3 py-2 font-medium">สิทธิ์</th>
                  <th className="px-4 py-2 text-right font-medium">ระงับ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-paper-line">
                {users.map((u) => (
                  <tr key={u.id} className={cn('hover:bg-paper-soft/50', u.isBanned && 'opacity-60')}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar name={u.username} size={26} />
                        <span className="font-medium text-ink">{u.username}</span>
                        {u.id === currentUserId && <span className="chip chip-acid px-1.5 py-0 text-[9px]">you</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-muted">{u.email}</td>
                    <td className="num px-3 py-2.5 font-mono text-xs text-ink-soft">{u.solvesCount}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-paper-line">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${u.progress}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-ink-faint">{u.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-faint">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : '—'}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={u.role}
                        onChange={(e) => update(u, { role: e.target.value })}
                        disabled={u.id === currentUserId}
                        aria-label={`สิทธิ์ของ ${u.username}`}
                        className="min-h-[32px] rounded-lg border border-paper-strong bg-paper-raised px-2 font-mono text-[11px] text-ink disabled:opacity-50"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => update(u, { isBanned: !u.isBanned })}
                        disabled={u.id === currentUserId}
                        aria-label={`${u.isBanned ? 'ปลดระงับ' : 'ระงับ'}บัญชี ${u.username}`}
                        className={cn('btn btn-sm', u.isBanned ? 'bg-moss text-white' : 'btn-ghost text-ember-deep')}
                      >
                        {u.isBanned ? <CircleCheck className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {u.isBanned ? 'ปลดระงับ' : 'ระงับ'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && (
            <div className="border-t border-paper-line px-4 py-2 font-mono text-[11px] text-ink-faint">
              แสดง {users.length} จาก {meta.total} ผู้ใช้
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadLabs = useCallback(async () => {
    try {
      const res = await api.get('/admin/labs');
      setLabs(res.data ?? []);
    } finally {
      setLabsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadLabs();
    const t = setInterval(loadStats, 15000);
    return () => clearInterval(t);
  }, [loadStats, loadLabs]);

  const tabs = useMemo(
    () => [
      { value: 'overview', label: 'ภาพรวม', icon: Gauge },
      { value: 'labs', label: 'จัดการด่าน', icon: Layers, count: labs.length },
      { value: 'instances', label: 'Container', icon: Server },
      { value: 'users', label: 'ผู้ใช้', icon: Users },
    ],
    [labs.length]
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">admin console</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">แผงควบคุมระบบ</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5" />
            เข้าถึงในฐานะ {user?.username} · ข้อมูลอัปเดตอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-paper-line bg-paper-raised px-3 py-1.5">
          <StatusDot tone={stats?.system?.dockerHealthy ? 'moss' : 'ember'} pulse={!stats?.system?.dockerHealthy} />
          <span className="text-xs font-medium text-ink-soft">Docker {stats?.system?.dockerHealthy ? 'online' : 'offline'}</span>
        </div>
      </header>

      <div className="overflow-x-auto no-scrollbar">
        <nav className="inline-flex min-w-full gap-1 border-b border-paper-line">
          {tabs.map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
                tab === value ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count !== undefined && <span className="font-mono text-[10px] text-ink-faint">{count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} loading={statsLoading} onRefresh={loadStats} />}
      {tab === 'labs' && <LabsTab labs={labs} loading={labsLoading} reload={loadLabs} />}
      {tab === 'instances' && <InstancesTab />}
      {tab === 'users' && <UsersTab currentUserId={user?.id} />}
    </div>
  );
}
