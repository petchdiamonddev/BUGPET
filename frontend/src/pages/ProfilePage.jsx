import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, KeyRound, Target, Trophy, UserCog, History, Loader2 } from 'lucide-react';
import { api, authApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { cn, formatDate, formatDateTime, pointsLabel, relativeTime, DIFFICULTY } from '../lib/format';
import { BadgeMedallion } from '../components/ui/BadgeMedallion';
import {
  Avatar,
  Card,
  CardHeader,
  DifficultyBadge,
  EmptyState,
  Meter,
  ProgressRing,
  Segmented,
  Skeleton,
  TierBadge,
  Field,
} from '../components/ui/Primitives';

function SettingsForm() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [bio, setBio] = useState(user?.bio ?? '');
  const [savingBio, setSavingBio] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const saveBio = async (e) => {
    e.preventDefault();
    setSavingBio(true);
    try {
      await authApi.updateProfile(bio.trim() || null);
      await refreshUser();
      toast.success('บันทึกโปรไฟล์แล้ว');
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setSavingBio(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwd.newPassword.length < 8) return setPwdError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    if (pwd.newPassword !== pwd.confirm) return setPwdError('รหัสผ่านยืนยันไม่ตรงกัน');
    setSavingPwd(true);
    try {
      await authApi.changePassword(pwd.currentPassword, pwd.newPassword);
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader eyebrow="profile" title="ข้อมูลส่วนตัว" />
        <form onSubmit={saveBio} className="space-y-3 p-4">
          <Field label="ชื่อผู้ใช้">
            <input value={user?.username ?? ''} disabled className="input bg-paper-soft font-mono text-xs text-ink-muted" />
          </Field>
          <Field label="อีเมล">
            <input value={user?.email ?? ''} disabled className="input bg-paper-soft font-mono text-xs text-ink-muted" />
          </Field>
          <Field label="แนะนำตัว (bio)" hint={`${bio.length}/280`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="เช่น สนใจ web exploitation, OWASP top 10…"
              className="input resize-none"
            />
          </Field>
          <div className="flex justify-end">
            <button type="submit" disabled={savingBio} className="btn-primary btn-sm">
              {savingBio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              บันทึก
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader eyebrow="security" title="เปลี่ยนรหัสผ่าน" />
        <form onSubmit={savePassword} className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="รหัสผ่านปัจจุบัน">
            <input
              type="password"
              value={pwd.currentPassword}
              onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
              className="input"
              autoComplete="current-password"
            />
          </Field>
          <Field label="รหัสผ่านใหม่">
            <input
              type="password"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
              className="input"
              autoComplete="new-password"
            />
          </Field>
          <Field label="ยืนยันรหัสผ่าน">
            <input
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              className="input"
              autoComplete="new-password"
            />
          </Field>
          {pwdError && <p className="text-xs font-medium text-ember-deep sm:col-span-3">{pwdError}</p>}
          <div className="flex justify-end sm:col-span-3">
            <button type="submit" disabled={savingPwd} className="btn-primary btn-sm">
              <KeyRound className="h-3.5 w-3.5" />
              อัปเดตรหัสผ่าน
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'settings' ? 'settings' : 'overview';
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [profileRes, historyRes] = await Promise.allSettled([
      api.get('/leaderboard/me'),
      api.get('/instances/history?limit=20'),
    ]);
    if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
    if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id, user?.points]);

  const stats = useMemo(() => {
    if (!profile) return null;
    return [
      { label: 'คะแนนสะสม', value: pointsLabel(profile.points), icon: Trophy },
      { label: 'อันดับ', value: profile.rank ? `#${profile.rank}` : '—', icon: Target },
      { label: 'ด่านที่พิชิต', value: `${profile.totalSolves}/${profile.totalSolvedLabs}`, icon: History },
    ];
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-panel" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-24 bg-[radial-gradient(circle_at_15%_130%,#d5f24a_0%,transparent_42%),radial-gradient(circle_at_85%_-30%,#ece7ff_0%,transparent_55%)]" />
        <div className="-mt-11 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <Avatar name={profile.username} size={84} className="ring-4 ring-paper-raised" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-ink">{profile.username}</h1>
              {profile.role === 'ADMIN' && <span className="chip chip-plum">ADMIN</span>}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-muted">{profile.bio || profile.email}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
              <CalendarDays className="h-3 w-3" /> เข้าร่วมเมื่อ {formatDate(profile.createdAt)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {stats.map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-paper-line bg-paper-raised px-3 py-2 text-center">
                <div className="num font-display text-lg font-bold leading-tight text-ink">{value}</div>
                <div className="text-[10px] text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Segmented
        value={tab}
        onChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === 'overview') next.delete('tab');
          else next.set('tab', v);
          setParams(next, { replace: true });
        }}
        options={[
          { value: 'overview', label: 'ภาพรวม', icon: Trophy },
          { value: 'settings', label: 'ตั้งค่า', icon: UserCog },
        ]}
      />

      {tab === 'settings' ? (
        <SettingsForm />
      ) : (
        // grid-cols-1 keeps the mobile track at the container width; without it
        // the implicit track sizes to the widest child and overflows at 320px.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader eyebrow="solves" title={`ประวัติการพิชิตด่าน (${profile.solves.length})`} />
              {profile.solves.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="ยังไม่เคยส่ง flag"
                  description="เริ่มจากด่านง่าย เพื่อปลดล็อกเหรียญ First Blood"
                  action={
                    <Link to="/labs" className="btn-primary btn-sm">
                      ไปหน้าด่านทดสอบ
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-dashed divide-paper-line">
                  {profile.solves.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <DifficultyBadge difficulty={s.difficulty} showEn={false} />
                      <Link to={`/labs/${s.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:underline">
                        {s.title}
                      </Link>
                      <span className="hidden font-mono text-[11px] text-ink-faint sm:block">{formatDate(s.solvedAt)}</span>
                      <span className="num w-12 text-right font-mono text-[12px] font-semibold text-moss">+{s.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {history.length > 0 && (
              <Card>
                <CardHeader eyebrow="sessions" title="ไทม์ไลน์ container" description="ทุกครั้งที่คุณเปิด/ปิดด่าน" />
                <ul className="divide-y divide-dashed divide-paper-line">
                  {history.slice(0, 8).map((h) => (
                    <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          h.status === 'STOPPED' ? 'bg-ink-faint' : 'bg-ember'
                        )}
                      />
                      <Link
                        to={`/labs/${h.labId}`}
                        className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-soft hover:text-ink"
                      >
                        {h.lab?.title}
                      </Link>
                      <span className="hidden shrink-0 font-mono text-[10px] uppercase text-ink-faint sm:block">
                        {h.stopReason ?? h.status}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-faint">{formatDateTime(h.startedAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader eyebrow="progress" title="ความคืบหน้ารวม" />
              <div className="flex items-center gap-5 p-4">
                <ProgressRing value={profile.completion} size={84} label={`${profile.completion}%`} />
                <div className="flex-1 space-y-2">
                  {Object.entries(profile.byDifficulty).map(([k, v]) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-ink-muted">{DIFFICULTY[k]?.label}</span>
                        <span className="num font-mono text-ink">{v}</span>
                      </div>
                      <Meter value={profile.totalSolves ? (v / profile.totalSolves) * 100 : 0} tone={k === 'EASY' ? 'moss' : k === 'MEDIUM' ? 'ember' : 'plum'} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="badges" title={`เหรียญที่ครอบครอง (${profile.badges.length})`} />
              {profile.badges.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-ink-faint">ยังไม่มีเหรียญ — พิชิตด่านแรกเพื่อเริ่มสะสม</p>
              ) : (
                <div className="flex flex-wrap gap-2 p-4">
                  {profile.badges.map((b) => (
                    <div key={b.id} className="flex w-full items-center gap-3 rounded-xl border border-paper-line bg-paper-soft/60 p-2">
                      <BadgeMedallion badge={b} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-ink">{b.name}</p>
                        <p className="truncate text-[10px] text-ink-faint">{relativeTime(b.earnedAt)}</p>
                      </div>
                      <TierBadge tier={b.tier} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
