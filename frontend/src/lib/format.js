import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const DIFFICULTY = {
  EASY: { label: 'ง่าย', en: 'EASY', tone: 'moss' },
  MEDIUM: { label: 'ปานกลาง', en: 'MEDIUM', tone: 'ember' },
  HARD: { label: 'ยาก', en: 'HARD', tone: 'plum' },
};

export const TIER = {
  BRONZE: { label: 'Bronze', ring: 'ring-[#c58b5a]/40', bg: 'bg-[#f7ecdf]', text: 'text-[#8a5527]' },
  SILVER: { label: 'Silver', ring: 'ring-[#9aa3ad]/40', bg: 'bg-[#f0f2f4]', text: 'text-[#54606b]' },
  GOLD: { label: 'Gold', ring: 'ring-[#e0b322]/45', bg: 'bg-[#fbf4da]', text: 'text-[#8a6a08]' },
};

export const relativeTime = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDate = (value, opts) =>
  value ? new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', ...opts }) : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** mm:ss (or h:mm:ss) from a millisecond duration. */
export const formatDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const initials = (name = '?') => name.slice(0, 2).toUpperCase();

export const pointsLabel = (n) => new Intl.NumberFormat('th-TH').format(n ?? 0);

export const plural = (n, one, many) => (n === 1 ? one : many);
