import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Single source of truth for "the lab container this user has running".
 *
 * - Polls `/instances/active` at a readable cadence (faster while STARTING).
 * - Keeps a local ticker so countdowns re-render each second without
 *   hammering the API.
 * - `start(labId)` / `stop()` wrap the optimistic UI states.
 */
export function useLabSession() {
  const { activeInstance, setActiveInstance, user, refreshUser } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(null); // 'starting' | 'stopping' | null
  const pollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const poll = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await api.get('/instances/active');
      setActiveInstance(res.data ?? null);
      return res.data ?? null;
    } catch {
      return null;
    }
  }, [user, setActiveInstance]);

  // Poll loops: 2.5s while the container is being created, 15s otherwise.
  useEffect(() => {
    if (!user) return undefined;
    const interval = activeInstance?.status === 'STARTING' ? 2500 : 15000;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, interval);
    return () => clearInterval(pollRef.current);
  }, [user, activeInstance?.status, poll]);

  const start = useCallback(
    async (labId) => {
      setBusy('starting');
      try {
        const res = await api.post(`/instances/start/${labId}`);
        // The API status is authoritative. `containerId` is intentionally not
        // exposed to ordinary users, so using its absence as a readiness check
        // incorrectly turned an already-running (idempotent) start into
        // STARTING and hid its link until the next poll.
        setActiveInstance(res.data ?? null);
        return res;
      } finally {
        setBusy(null);
      }
    },
    [setActiveInstance]
  );

  const stop = useCallback(
    async (instanceId) => {
      setBusy('stopping');
      try {
        const res = await api.post(`/instances/${instanceId ?? activeInstance?.id}/stop`);
        setActiveInstance(null);
        await refreshUser();
        return res;
      } finally {
        setBusy(null);
      }
    },
    [activeInstance?.id, setActiveInstance, refreshUser]
  );

  const remainingMs = activeInstance?.expiresAt
    ? Math.max(0, new Date(activeInstance.expiresAt).getTime() - now)
    : 0;
  const totalMs = activeInstance?.expiresAt && activeInstance?.startedAt
    ? new Date(activeInstance.expiresAt).getTime() - new Date(activeInstance.startedAt).getTime()
    : 0;
  const progress = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;

  const isThisLab = (labId) => Boolean(activeInstance && Number(activeInstance.labId) === Number(labId));

  return {
    activeInstance,
    isRunning: activeInstance?.status === 'RUNNING',
    isStarting: activeInstance?.status === 'STARTING',
    remainingMs,
    progress,
    busy,
    start,
    stop,
    poll,
    isThisLab,
    now,
  };
}

export const urgencyOf = (remainingMs) => {
  if (remainingMs <= 0) return 'expired';
  if (remainingMs < 5 * 60 * 1000) return 'critical';
  if (remainingMs < 15 * 60 * 1000) return 'warning';
  return 'normal';
};
