/**
 * useSignals — fetches signals from Supabase with plan-based delay logic
 *
 * Visibility rules:
 *   Elite  → real-time (0 delay)
 *   Pro    → 6h delay (crypto/forex/stock) | after match ends (sport)
 *   Free   → 24h delay always
 *   Guest  → 48h delay, max 10 signals
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Plan } from '../types';

const supabase = createClient(
  (import.meta as any).env?.VITE_SUPABASE_URL ?? '',
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
);

export interface Signal {
  id: string;
  type: 'crypto' | 'forex' | 'stock' | 'sport';
  asset: string;
  asset_icon: string;
  signal: string;
  confidence: number;
  result: 'win' | 'loss' | 'neutral' | null;
  published_at: string;
  match_end_time: string | null;
  platform: 'market' | 'bet' | 'both';
  visible: boolean;
  locked: boolean;
  unlocks_at: Date | null;
}

function getDelayHours(plan: Plan | null): number {
  if (plan === 'elite') return 0;
  if (plan === 'pro')   return 6;
  if (plan === 'free')  return 24;
  return 48; // guest / no account
}

function computeVisibility(raw: any, plan: Plan | null): Signal {
  const now          = new Date();
  const publishedAt  = new Date(raw.published_at);
  const delayHours   = getDelayHours(plan);
  let visible        = false;
  let unlocks_at: Date | null = null;

  if (raw.type === 'sport' && raw.match_end_time) {
    const matchEnd = new Date(raw.match_end_time);
    if (plan === 'elite') {
      visible = true;
    } else {
      visible = now > matchEnd;
      if (!visible) unlocks_at = matchEnd;
    }
  } else {
    const unlockTime = new Date(publishedAt.getTime() + delayHours * 3_600_000);
    visible   = now >= unlockTime;
    if (!visible) unlocks_at = unlockTime;
  }

  return { ...raw, visible, locked: !visible, unlocks_at };
}

export function formatUnlockTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'ahora';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `en ${h}h ${m}m`;
  return `en ${m}m`;
}

export function useSignals(plan: Plan | null) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const maxSignals = plan === null ? 10 : 50;

  const fetchSignals = useCallback(async () => {
    try {
      const { data, error: sbError } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(60);

      if (sbError) throw sbError;

      const processed = (data ?? [])
        .map(r => computeVisibility(r, plan))
        .slice(0, maxSignals);

      setSignals(processed);
    } catch (e: any) {
      setError(e.message ?? 'Error cargando señales');
    } finally {
      setLoading(false);
    }
  }, [plan, maxSignals]);

  useEffect(() => {
    fetchSignals();

    // Realtime: re-fetch on any DB change
    const channel = supabase
      .channel('signals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, fetchSignals)
      .subscribe();

    // Re-evaluate lock timers every minute
    const timer = setInterval(() => {
      setSignals(prev => prev.map(s => computeVisibility(s, plan)));
    }, 60_000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchSignals, plan]);

  return { signals, loading, error };
}
