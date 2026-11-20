import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, LayoutGrid, SlidersHorizontal, BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLabSession } from '../hooks/useLabSession';
import { cn, DIFFICULTY } from '../lib/format';
import LabCard from '../components/ui/LabCard';
import { Card, EmptyState, Segmented, Skeleton } from '../components/ui/Primitives';

const STATUS_TABS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'unsolved', label: 'ยังไม่ผ่าน' },
  { value: 'solved', label: 'ผ่านแล้ว' },
];

const SORTS = [
  { value: 'default', label: 'แนะนำ' },
  { value: 'newest', label: 'ใหม่สุด' },
  { value: 'points', label: 'คะแนนมาก' },
  { value: 'difficulty', label: 'ยากสุด' },
];

function FilterBar({ params, setParams, meta, total }) {
  const [search, setSearch] = useState(params.get('search') ?? '');
  const timer = useRef(null);

  useEffect(() => setSearch(params.get('search') ?? ''), [params.get('search')]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const submitSearch = (value) => {
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('search', value.trim());
    else next.delete('search');
    setParams(next, { replace: true });
  };

  const onSearchChange = (value) => {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => submitSearch(value), 320);
  };

  const activeFilterCount = ['difficulty', 'tag', 'status', 'search'].filter((k) => params.get(k)).length;


  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นชื่อด่าน, เทคนิค เช่น SQLi, XXE…"
            className="input pl-9 pr-9"
            aria-label="ค้นหาด่าน"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint hover:bg-paper-soft hover:text-ink"
              aria-label="ล้างคำค้น"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Segmented
          value={params.get('status') ?? 'all'}
          onChange={(v) => update('status', v)}
          options={STATUS_TABS}
          className="self-start sm:self-auto"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => update('difficulty', null)}
          aria-pressed={!params.get('difficulty')}
          className={cn(
            'chip min-h-[32px] px-3 transition-colors',
            !params.get('difficulty') ? 'border-ink bg-ink text-paper-raised' : 'border-paper-strong bg-paper-soft text-ink-muted hover:text-ink'
          )}
        >
          ทุกระดับ
        </button>
        {Object.entries(DIFFICULTY).map(([key, d]) => (
          <button
            key={key}
            type="button"
            onClick={() => update('difficulty', key)}
            aria-pressed={params.get('difficulty') === key}
            className={cn(
              'chip min-h-[32px] px-3 transition-colors',
              params.get('difficulty') === key
                ? 'border-ink bg-ink text-paper-raised'
                : 'border-paper-strong bg-paper-soft text-ink-muted hover:text-ink'
            )}
          >
            {d.label}
            <span className="opacity-60">{meta?.counts?.byDifficulty?.[key] ?? 0}</span>
          </button>
        ))}

        <div className="divider-dots mx-1 hidden h-2 w-16 sm:block" />

        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">เรียงตาม</span>
          <select
            value={params.get('sort') ?? 'default'}
            onChange={(e) => update('sort', e.target.value)}
            className="rounded-lg border border-paper-strong bg-paper-raised py-1 pl-2 pr-7 font-mono text-xs text-ink focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {meta?.tags?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1">tags</span>
          {meta.tags.slice(0, 12).map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => update('tag', params.get('tag') === t.name ? null : t.name)}
              aria-pressed={params.get('tag') === t.name}
              className={cn(
                'rounded-lg px-2 py-1 font-mono text-[11px] transition-colors',
                params.get('tag') === t.name
                  ? 'bg-ink text-paper-raised'
                  : 'bg-paper-soft text-ink-muted hover:bg-paper-line hover:text-ink'
              )}
            >
              {t.name}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="ml-1 inline-flex min-h-[28px] items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-ember-deep hover:bg-ember-soft"
            >
              <X className="h-3 w-3" />
              ล้างตัวกรอง ({activeFilterCount})
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-paper-line pt-2 text-xs text-ink-muted">
        <span>
          พบ <b className="text-ink">{total}</b> ด่าน
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
          <LayoutGrid className="h-3.5 w-3.5" />
          grid
        </span>
      </div>
    </div>
  );
}

export default function LabsPage() {
  const [params, setParams] = useSearchParams();
  const { activeInstance } = useAuth();
  const [labs, setLabs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { poll } = useLabSession();

  const queryKey = params.toString();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get(`/labs${queryKey ? `?${queryKey}` : ''}`)
      .then((res) => {
        if (!alive) return;
        setLabs(res.data ?? []);
        setMeta(res.meta ?? null);
      })
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [queryKey]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">ด่านทดสอบ</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            ทุกด่านรันแบบแยกคอนเทนเนอร์ (1 คน = 1 container) — เปิดแล้วเจาะได้ทันที
          </p>
        </div>
        <button onClick={() => poll()} className="hidden text-xs text-ink-faint hover:text-ink sm:block">
          ↻ รีเฟรชสถานะ
        </button>
      </header>

      <Card className="p-3 sm:p-4">
        <FilterBar params={params} setParams={setParams} meta={meta} total={labs.length} />
      </Card>

      {error ? (
        <Card>
          <EmptyState
            icon={Search}
            title="โหลดด่านไม่สำเร็จ"
            description={error.message}
          />
        </Card>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-[196px] p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : labs.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="ไม่พบด่านที่ตรงกับตัวกรอง"
            description="ลองล้างตัวกรอง หรือค้นหาเทคนิคอื่น เช่น SQLi, IDOR, XSS"
            action={
              <button className="btn-soft btn-sm" onClick={() => setParams(new URLSearchParams())}>
                ล้างตัวกรองทั้งหมด
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab, i) => (
            <LabCard key={lab.id} lab={lab} active={activeInstance?.labId === lab.id && activeInstance?.status === 'RUNNING'}
                    starting={activeInstance?.labId === lab.id && activeInstance?.status === 'STARTING'} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
