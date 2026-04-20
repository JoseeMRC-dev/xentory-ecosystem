/**
 * Supabase Edge Function: check-alerts
 * ─────────────────────────────────────────────────────────────────
 * Called by Supabase cron (pg_cron) every minute.
 * Fetches live prices and triggers alerts + sends Telegram DMs.
 *
 * Deploy: supabase functions deploy check-alerts
 * Schedule in Supabase Dashboard → Database → Extensions → pg_cron:
 *   SELECT cron.schedule('check-alerts', '* * * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-alerts',
 *       headers := '{"Authorization": "Bearer <anon_key>"}'::jsonb
 *     )$$
 *   );
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN            = Deno.env.get('BOT_TOKEN')!;
const MARKET_APP_URL       = Deno.env.get('MARKET_APP_URL') ?? 'https://xentory-ecosystem-market.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT',
  BNB: 'BNBUSDT', ADA: 'ADAUSDT', DOGE: 'DOGEUSDT', AVAX: 'AVAXUSDT',
};

// ── FETCH PRICES ──────────────────────────────────────────────────
async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  const cryptoSyms = symbols.filter(s => BINANCE_SYMBOLS[s]);
  if (cryptoSyms.length > 0) {
    try {
      const qs  = JSON.stringify(cryptoSyms.map(s => BINANCE_SYMBOLS[s]));
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(qs)}`);
      const arr: any[] = await res.json();
      arr.forEach(item => {
        const sym = Object.entries(BINANCE_SYMBOLS).find(([, v]) => v === item.symbol)?.[0];
        if (sym) prices[sym] = parseFloat(item.price);
      });
    } catch (e) { console.error('Binance error:', e); }
  }

  // Stocks via Yahoo Finance (via allorigins proxy)
  const stockSyms = symbols.filter(s => !BINANCE_SYMBOLS[s] && !s.includes('/'));
  for (const sym of stockSyms) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`;
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) prices[sym] = price;
    } catch { /* skip */ }
  }

  // Forex via Frankfurter
  const forexSyms = symbols.filter(s => s.includes('/'));
  for (const sym of forexSyms) {
    try {
      const [base, quote] = sym.split('/');
      const res  = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
      const data = await res.json();
      if (data.rates?.[quote]) prices[sym] = data.rates[quote];
    } catch { /* skip */ }
  }

  return prices;
}

// ── SEND TELEGRAM MESSAGE ─────────────────────────────────────────
async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildAlertMessage(
  symbol: string,
  condition: string,
  targetPrice: number,
  currentPrice: number,
  category: string
): string {
  const emoji    = condition === 'above' ? '📈' : '📉';
  const condText = condition === 'above' ? 'ha superado' : 'ha caído por debajo de';
  const catEmoji = category === 'crypto' ? '🪙' : category === 'stocks' ? '📊' : '💱';

  return `${emoji} <b>ALERTA DE PRECIO ACTIVADA</b>

${catEmoji} <b>${symbol}</b> ${condText} tu precio objetivo

🎯 Precio objetivo: <b>$${Number(targetPrice).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</b>
💰 Precio actual: <b>$${currentPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</b>
🕐 ${new Date().toLocaleTimeString('es-ES')}

<a href="${MARKET_APP_URL}/market/${symbol.toLowerCase()}">Ver en Xentory Market →</a>`;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────
Deno.serve(async (_req) => {
  try {
    // Get all active untriggered alerts with telegram connection
    const { data: alerts, error } = await supabase
      .from('price_alerts')
      .select(`
        id, user_id, symbol, category, condition,
        target_price, notify_channel
      `)
      .eq('active', true)
      .eq('triggered', false);

    if (error) throw error;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), { status: 200 });
    }

    // Fetch connections for these users
    const userIds = [...new Set(alerts.map((a: any) => a.user_id))];
    const { data: connections } = await supabase
      .from('telegram_connections')
      .select('user_id, platform, telegram_chat_id, verified')
      .in('user_id', userIds)
      .eq('platform', 'market')
      .eq('verified', true);

    const connMap: Record<string, number> = {};
    (connections ?? []).forEach((c: any) => {
      connMap[c.user_id] = Number(c.telegram_chat_id);
    });

    // Fetch live prices for symbols in active alerts
    const symbols = [...new Set(alerts.map((a: any) => a.symbol))];
    const prices  = await fetchPrices(symbols);

    let triggered = 0;
    const toTrigger: any[] = [];

    for (const alert of alerts as any[]) {
      const price = prices[alert.symbol];
      if (price === undefined) continue;

      const hit =
        (alert.condition === 'above' && price >= Number(alert.target_price)) ||
        (alert.condition === 'below' && price <= Number(alert.target_price));

      if (!hit) continue;

      toTrigger.push({ ...alert, currentPrice: price });
    }

    // Process triggered alerts
    for (const alert of toTrigger) {
      const chatId = connMap[alert.user_id];
      let tgOk = false;

      if ((alert.notify_channel === 'telegram' || alert.notify_channel === 'both') && chatId) {
        const msg = buildAlertMessage(
          alert.symbol, alert.condition,
          Number(alert.target_price), alert.currentPrice,
          alert.category
        );
        tgOk = await sendTelegramMessage(chatId, msg);
      }

      // Mark as triggered
      await supabase
        .from('price_alerts')
        .update({
          triggered:     true,
          triggered_at:  new Date().toISOString(),
          trigger_price: alert.currentPrice,
        })
        .eq('id', alert.id);

      // Log
      if (chatId) {
        await supabase.from('alert_notifications_log').insert({
          alert_id: alert.id,
          user_id:  alert.user_id,
          channel:  'telegram',
          status:   tgOk ? 'sent' : 'failed',
          message:  `${alert.symbol} ${alert.condition} $${alert.target_price} → $${alert.currentPrice}`,
        });
      }

      triggered++;
    }

    return new Response(
      JSON.stringify({ checked: alerts.length, triggered, prices }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('check-alerts error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
