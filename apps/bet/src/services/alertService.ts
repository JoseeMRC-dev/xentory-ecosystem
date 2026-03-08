/**
 * alertService.ts — Xentory Market
 * ─────────────────────────────────────────────────────────────────
 * All Supabase operations for:
 *   - Price alerts (CRUD)
 *   - Telegram verification codes (generate + check status)
 *   - Telegram connection status
 *
 * RLS is enabled: all operations use the user's auth context.
 * Since Market uses SSO (no Supabase session), we pass user_id
 * explicitly and rely on the service role via Edge Functions
 * for writes that need to bypass RLS.
 * ─────────────────────────────────────────────────────────────────
 */

import { supabase } from '../lib/supabase';

export type AlertCategory = 'crypto' | 'stocks' | 'forex';
export type AlertCondition = 'above' | 'below';
export type AlertChannel   = 'telegram' | 'email' | 'both';

export interface PriceAlert {
  id:             string;
  user_id:        string;
  user_email:     string;
  symbol:         string;
  asset_name:     string;
  category:       AlertCategory;
  condition:      AlertCondition;
  target_price:   number;
  notify_channel: AlertChannel;
  active:         boolean;
  triggered:      boolean;
  triggered_at?:  string;
  trigger_price?: number;
  created_at:     string;
}

export interface TelegramConnection {
  id:                 string;
  user_id:            string;
  platform:           string;
  telegram_chat_id:   number;
  telegram_username?: string;
  plan:               string;
  channel_invited?:   string;
  verified:           boolean;
  verified_at?:       string;
}

// ── SUPABASE ANON KEY + user_id pattern ──────────────────────────
// Since Market users don't have a Supabase session (SSO-only),
// we call Edge Functions for writes, and use direct queries
// with the anon key for reads (RLS allows reading own rows
// when we match user_id to auth.uid() — but since there's no
// session, we use service-role via Edge Functions for all writes).
//
// READS: supabase.from(...).select() — works if RLS policy
//        uses user_id column matching (we set this up with
//        a special anon read policy below — or call via EF).
//
// WRITES: via /api/alerts Edge Function with user_id in body.

const EF_BASE = `${(import.meta as any).env?.VITE_SUPABASE_URL ?? 'https://mtgatdmrpfysqphdgaue.supabase.co'}/functions/v1`;
const ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

async function callEF(path: string, body: object): Promise<any> {
  const res = await fetch(`${EF_BASE}/${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`EF ${path} failed: ${err}`);
  }
  return res.json();
}

// ── GENERATE VERIFICATION CODE ─────────────────────────────────
export function generateVerifyCode(userId: string, platform: 'market' | 'bet'): string {
  const prefix = platform === 'market' ? 'XMKT' : 'XBET';
  const hash   = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${hash}`;
}

// ── SAVE/REFRESH VERIFICATION CODE ────────────────────────────
export async function upsertVerifyCode(
  userId:    string,
  userEmail: string,
  platform: 'market' | 'bet',
  plan:      string
): Promise<string> {
  const code = generateVerifyCode(userId, platform);
  await callEF('manage-alerts', {
    action:    'upsert_code',
    user_id:   userId,
    user_email: userEmail,
    platform,
    plan,
    code,
  });
  return code;
}

// ── CHECK TELEGRAM CONNECTION STATUS ─────────────────────────
export async function getTelegramConnection(
  userId:   string,
  platform: 'market' | 'bet',
): Promise<TelegramConnection | null> {
  const { data, error } = await supabase
    .from('telegram_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('verified', true)
    .single();

  if (error || !data) return null;
  return data as TelegramConnection;
}

// ── LOAD ALERTS ───────────────────────────────────────────────
export async function loadAlerts(userId: string): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[alertService] loadAlerts error:', error);
    return [];
  }
  return (data ?? []) as PriceAlert[];
}

// ── CREATE ALERT ──────────────────────────────────────────────
export async function createAlert(params: {
  userId:        string;
  userEmail:     string;
  symbol:        string;
  assetName:     string;
  category:      AlertCategory;
  condition:     AlertCondition;
  targetPrice:   number;
  notifyChannel: AlertChannel;
}): Promise<PriceAlert> {
  const data = await callEF('manage-alerts', {
    action:         'create_alert',
    user_id:        params.userId,
    user_email:     params.userEmail,
    symbol:         params.symbol,
    asset_name:     params.assetName,
    category:       params.category,
    condition:      params.condition,
    target_price:   params.targetPrice,
    notify_channel: params.notifyChannel,
  });
  return data as PriceAlert;
}

// ── TOGGLE ALERT ACTIVE ───────────────────────────────────────
export async function toggleAlert(alertId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('price_alerts')
    .update({ active })
    .eq('id', alertId);
  if (error) throw error;
}

// ── DELETE ALERT ──────────────────────────────────────────────
export async function deleteAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId);
  if (error) throw error;
}