import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Short page header: what the lab is, and the counts that matter. */
export default function Hero({ stats, statsLoading }) {
  const { user } = useAuth();

  const figures = [
    { label: 'ด่านที่เปิด', value: stats?.activeLabs },
    { label: 'ผู้เล่น', value: stats?.totalPlayers },
    { label: 'ครั้งที่ผ่านด่าน', value: stats?.totalSolves },
  ];

  return (
    <section className="border border-paper-line bg-white">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-xs text-ink-muted">ห้องแล็บฝึกเจาะเว็บ</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-snug text-ink sm:text-[30px]">
            เลือกด่าน แล้วเปิดเป้าหมายของตัวเอง
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            แต่ละด่านเป็นเว็บที่มีช่องโหว่จริง รันแยกในคอนเทนเนอร์ของคุณ
            พอพร้อมแล้วจะได้ลิงก์ไว้เปิด ตรวจ request และส่ง flag
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link to="/labs" className="btn-primary">
              ไปหน้าด่าน
            </Link>
            <Link to={user ? '/leaderboard' : '/register'} className="btn-ghost">
              {user ? 'ดูตารางอันดับ' : 'สมัครใช้งาน'}
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-3 overflow-hidden border border-paper-line bg-paper-soft sm:min-w-[280px]">
          {figures.map((f) => (
            <div key={f.label} className="border-r border-paper-line bg-white px-3 py-3 last:border-r-0">
              <dd className="num text-xl font-semibold leading-none text-ink">
                {statsLoading ? (
                  <span className="inline-block h-5 w-8 animate-pulse rounded bg-paper-line align-middle" />
                ) : (
                  f.value ?? 0
                )}
              </dd>
              <dt className="mt-1.5 text-[11px] leading-tight text-ink-muted">{f.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
