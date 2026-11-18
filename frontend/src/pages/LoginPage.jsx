import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/format';
import Logo from '../components/ui/Logo';
import { Field } from '../components/ui/Primitives';

/** Split layout shared by login/register: brand panel + form card. */
export function AuthShell({ children, side }) {
  return (
    <div className="mx-auto grid w-full max-w-[980px] gap-6 py-6 lg:min-h-[calc(100vh-260px)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-10">
      <div className="hidden lg:block">{side}</div>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthSide({ title, description, bullets, footer }) {
  return (
    <div className="relative overflow-hidden rounded-panel border border-paper-line bg-paper-raised p-8">
      <Logo />
      <h2 className="mt-8 text-balance font-display text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{description}</p>

      <ul className="mt-6 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={b} className="flex items-start gap-2.5 text-[13px] text-ink-soft">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-acid/40 font-mono text-[10px] font-bold text-acid-ink">
              {i + 1}
            </span>
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-8 overflow-hidden rounded-xl bg-night p-3.5 font-mono text-[11px] leading-relaxed text-night-text/70">
        <div className="mb-1.5 flex items-center gap-1.5 text-night-text/40">
          <Terminal className="h-3 w-3" />
          <span>petbug — session</span>
        </div>
        <div className="text-night-text/85">
          <span className="text-acid">$</span> open https://<span className="text-night-text">lab.petbug.io</span>
        </div>
        <div className="text-night-text/50">→ isolated container ready</div>
        <div className="text-night-text/85">
          <span className="text-acid">$</span> submit PETBUG{'{...}'}
        </div>
        <div className="text-[#9bd36b]">✓ +200 points · badge unlocked</div>
      </div>

      {footer && <div className="mt-6 border-t border-paper-line pt-4 text-xs text-ink-muted">{footer}</div>}
    </div>
  );
}

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="card p-6 sm:p-7">
      <div className="mb-5 lg:hidden">
        <Logo />
      </div>
      <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
      {footer && <div className="mt-5 border-t border-paper-line pt-4 text-center text-[13px] text-ink-muted">{footer}</div>}
    </div>
  );
}

export function FormAlert({ tone = 'error', children }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]',
        tone === 'error' ? 'border-ember/30 bg-ember-soft text-ember-deep' : 'border-moss/30 bg-moss-soft text-moss-deep'
      )}
    >
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-current/15 text-[10px] font-bold">!</span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/labs';
  const showDemo = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.identifier, form.password);
      navigate(from, { replace: true });
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
              กลับมาลุยต่อ
              <br />
              ห้องแล็บของคุณรออยู่
            </>
          }
          description="เข้าสู่ระบบเพื่อเปิดด่าน, ส่ง flag และเก็บคะแนนขึ้นตารางอันดับ — ทุกความคืบหน้าถูกบันทึกอัตโนมัติ"
          bullets={['1 ผู้เล่น = 1 container แยกเดี่ยว', 'Container ปิดอัตโนมัติเมื่อหมดเวลา', 'เก็บคะแนนและเหรียญได้ทันทีที่ส่ง flag ถูก']}
          footer={
            <span className="font-mono text-[11px]">
              tip · กด <kbd className="kbd">⌘</kbd> <kbd className="kbd">K</kbd> เพื่อค้นหาด่วนได้ทุกหน้า
            </span>
          }
        />
      }
    >
      <AuthCard
        title="เข้าสู่ระบบ"
        subtitle="ใช้ชื่อผู้ใช้หรืออีเมลก็ได้"
        footer={
          <>
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="font-semibold text-ink underline decoration-paper-strong underline-offset-2 hover:decoration-ink">
              สมัครฟรี
            </Link>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3.5">
          {error && <FormAlert>{error}</FormAlert>}

          <Field label="ชื่อผู้ใช้ หรือ อีเมล" htmlFor="identifier">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="identifier"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                className="input pl-9"
                placeholder="hunter_x หรือ hunter@petbug.io"
                autoComplete="username"
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
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </Field>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          {showDemo && (
            <div className="rounded-xl border border-dashed border-paper-strong bg-paper-soft/70 p-2.5 text-[11px] text-ink-muted">
              <p className="mb-1 font-semibold text-ink-soft">บัญชีทดสอบ (dev)</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { u: 'admin', p: 'Petbug@2026', label: 'admin' },
                  { u: 'hunter_x', p: 'Petbug@2026', label: 'hunter_x' },
                ].map((acc) => (
                  <button
                    key={acc.u}
                    type="button"
                    onClick={() => setForm({ identifier: acc.u, password: acc.p })}
                    className="rounded-md border border-paper-strong bg-paper-raised px-1.5 py-0.5 font-mono text-[10px] hover:border-ink-faint hover:text-ink"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </AuthCard>
    </AuthShell>
  );
}
