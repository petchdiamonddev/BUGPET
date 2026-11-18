import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/format';
import { AuthCard, AuthShell, AuthSide, FormAlert } from './LoginPage';
import { Field } from '../components/ui/Primitives';

const RULES = [
  { test: (v) => v.length >= 8, label: 'อย่างน้อย 8 ตัวอักษร' },
  { test: (v) => /[A-Za-z]/.test(v) && /\d/.test(v), label: 'มีตัวอักษรและตัวเลข' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'มีอักขระพิเศษ (แนะนำ)' },
];

function StrengthMeter({ value }) {
  const score = RULES.filter((r) => r.test(value)).length;
  const colors = ['bg-paper-line', 'bg-ember', 'bg-[#e2c822]', 'bg-moss'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? colors[score] : 'bg-paper-line')} />
        ))}
      </div>
      <ul className="grid gap-0.5 text-[11px]">
        {RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={cn('flex items-center gap-1.5 transition-colors', ok ? 'text-moss-deep' : 'text-ink-faint')}>
              <span className={cn('h-1 w-1 rounded-full', ok ? 'bg-moss' : 'bg-ink-faint/50')} />
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usernameOk = useMemo(() => /^[a-zA-Z0-9_.-]{3,24}$/.test(form.username), [form.username]);
  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), [form.email]);
  const canSubmit = usernameOk && emailOk && form.password.length >= 8;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('ตรวจสอบชื่อผู้ใช้, อีเมล และรหัสผ่านให้ถูกต้องก่อน');
      return;
    }
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      navigate('/labs', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      side={
        <AuthSide
          title={
            <>
              สร้างโปรไฟล์
              <br />
              แล้วเริ่มแฮก legally
            </>
          }
          description="ทุกด่านคือสภาพแวดล้อมจำลองที่ปลอดภัยสำหรับฝึกทักษะจริง สมัครครั้งเดียว แล้วเปิดได้ทุกด่านทันที"
          bullets={['ฟรี ไม่มีค่าใช้จ่าย', 'ได้ container ส่วนตัวทุกครั้งที่เริ่มด่าน', 'เก็บเหรียญ 7 แบบ และขึ้นตารางอันดับ']}
          footer={
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-moss" />
              ด่านทุกอันเป็นระบบจำลองที่ควบคุมได้ ไม่กระทบระบบจริง
            </span>
          }
        />
      }
    >
      <AuthCard
        title="สมัครสมาชิก"
        subtitle="ใช้เวลาไม่ถึง 30 วินาที"
        footer={
          <>
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="font-semibold text-ink underline decoration-paper-strong underline-offset-2 hover:decoration-ink">
              เข้าสู่ระบบ
            </Link>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3.5">
          {error && <FormAlert>{error}</FormAlert>}

          <Field
            label="ชื่อผู้ใช้"
            hint={form.username && !usernameOk ? 'ใช้ a-z, 0-9, _ . - เท่านั้น และยาว 3–24 ตัวอักษร' : 'ใช้แสดงบนตารางอันดับ'}
            htmlFor="username"
          >
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={cn('input pl-9', form.username && !usernameOk && 'input-error')}
                placeholder="hacker_pro"
                autoComplete="username"
                required
              />
            </div>
          </Field>

          <Field label="อีเมล" htmlFor="email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={cn('input pl-9', form.email && !emailOk && 'input-error')}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </Field>

          <Field label="รหัสผ่าน" htmlFor="password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input pl-9"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                autoComplete="new-password"
                required
              />
            </div>
            {form.password && (
              <div className="mt-2">
                <StrengthMeter value={form.password} />
              </div>
            )}
          </Field>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="text-center text-[11px] text-ink-faint">
            การสมัครถือว่ายอมรับกติกาการใช้งาน — ห้ามโจมตีระบบนอกขอบเขตห้องแล็บ
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
