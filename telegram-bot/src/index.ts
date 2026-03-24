/**
 * @XentoryBot — Bot único para Market + Bet + Bundle
 * ─────────────────────────────────────────────────────────────────
 * Canales:
 *   Market Pro    → -1003770026524
 *   Market Elite  → -1003646834128
 *   Bet Pro       → -1003624640751
 *   Bet Elite     → -1003827311918
 *   Bundle Pro    → -1003806350373
 *   Bundle Elite  → -1003728895446
 *
 * Lógica de acceso:
 *   market:pro    → Market Pro
 *   market:elite  → Market Pro + Market Elite
 *   bet:pro       → Bet Pro
 *   bet:elite     → Bet Pro + Bet Elite
 *   bundle:pro    → Market Pro + Bet Pro + Bundle Pro
 *   bundle:elite  → Market Pro + Market Elite + Bet Pro + Bet Elite + Bundle Elite
 * ─────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { Telegraf, Context } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const BOT_TOKEN            = process.env.BOT_TOKEN!;
const SUPABASE_URL         = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const CH = {
  MARKET_PRO:   process.env.MARKET_PRO_CHANNEL!,
  MARKET_ELITE: process.env.MARKET_ELITE_CHANNEL!,
  BET_PRO:      process.env.BET_PRO_CHANNEL!,
  BET_ELITE:    process.env.BET_ELITE_CHANNEL!,
  BUNDLE_PRO:   process.env.BUNDLE_PRO_CHANNEL!,
  BUNDLE_ELITE: process.env.BUNDLE_ELITE_CHANNEL!,
};

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisa .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const bot = new Telegraf(BOT_TOKEN);

// ── CANALES POR PLAN ──────────────────────────────────────────────
function getChannels(platform: string, plan: string): string[] {
  if (plan === 'free') return [];
  switch (`${platform}:${plan}`) {
    case 'market:pro':    return [CH.MARKET_PRO];
    case 'market:elite':  return [CH.MARKET_PRO, CH.MARKET_ELITE];
    case 'bet:pro':       return [CH.BET_PRO];
    case 'bet:elite':     return [CH.BET_PRO, CH.BET_ELITE];
    case 'bundle:pro':    return [CH.MARKET_PRO, CH.BET_PRO, CH.BUNDLE_PRO];
    case 'bundle:elite':  return [CH.MARKET_PRO, CH.MARKET_ELITE, CH.BET_PRO, CH.BET_ELITE, CH.BUNDLE_ELITE];
    default:              return [];
  }
}

function planLabel(platform: string, plan: string): string {
  const map: Record<string, string> = {
    'market:free':  'Explorador',    'market:pro':   'Market Pro',  'market:elite': 'Market Elite',
    'bet:free':     'Explorador',    'bet:pro':      'Bet Pro',     'bet:elite':    'Bet Elite',
    'bundle:free':  'Explorador',    'bundle:pro':   'Bundle Pro',  'bundle:elite': 'Bundle Elite',
  };
  return map[`${platform}:${plan}`] ?? plan;
}

function platformName(p: string): string {
  return p === 'market' ? 'Market' : p === 'bet' ? 'Bet' : 'Bundle';
}

// ── MENSAJES ──────────────────────────────────────────────────────
function msgWelcome(name: string) {
  return `👋 Hola <b>${name}</b>, soy el bot oficial de <b>Xentory</b>.

Para vincular tu cuenta envíame tu código de verificación.

Encuéntralo en:
• <b>Xentory Market</b> → sección Telegram
• <b>Xentory Bet</b> → sección Telegram

Formatos válidos:
<code>XMKT-XXXXXXXX</code> — Market / Bundle
<code>XBET-XXXXXXXX</code> — Bet

Envíamelo directamente aquí 👇`;
}

function msgVerified(name: string, platform: string, plan: string, links: string[]) {
  const label = planLabel(platform, plan);
  const pname = platformName(platform);
  const channelBlock = links.length > 0
    ? `\n🔗 <b>Accede a tus canales:</b>\n${links.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n⚠️ Los enlaces son de un solo uso y expiran en 1 hora.`
    : plan === 'free'
      ? '\n🆓 Con el plan Explorador recibirás alertas personales por aquí.\nActualiza a Pro o Elite en Xentory para acceder a los canales de señales.'
      : '';

  return `✅ <b>¡Cuenta verificada!</b>

👤 ${name}
📊 Plataforma: <b>Xentory ${pname}</b>
💎 Plan: <b>${label}</b>
${channelBlock}

🔔 Recibirás <b>alertas de precio personales</b> directamente aquí cuando las actives en la app.

/status — ver estado · /update — refrescar acceso`;
}

function msgStatus(conns: any[]) {
  if (!conns.length) {
    return `📊 <b>Estado de tu cuenta Xentory</b>\n\n❌ Sin cuentas vinculadas.\n\nEnvía tu código de verificación para empezar.`;
  }
  const lines = conns.map(c => {
    const date = new Date(c.verified_at).toLocaleDateString('es-ES');
    return `📱 <b>Xentory ${platformName(c.platform)}</b>\n   Plan: ${planLabel(c.platform, c.plan)}\n   Vinculado: ${date}`;
  }).join('\n\n');
  return `📊 <b>Estado de tu cuenta Xentory</b>\n\n✅ Cuentas vinculadas:\n\n${lines}`;
}

function msgAlert(symbol: string, condition: string, target: number, current: number, category: string) {
  const emoji    = condition === 'above' ? '📈' : '📉';
  const condText = condition === 'above' ? 'ha superado' : 'ha caído por debajo de';
  const catEmoji = category === 'crypto' ? '🪙' : category === 'stocks' ? '📊' : '💱';
  const fmt      = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return `${emoji} <b>ALERTA DE PRECIO</b>

${catEmoji} <b>${symbol}</b> ${condText} tu objetivo

🎯 Objetivo: <b>$${fmt(target)}</b>
💰 Precio actual: <b>$${fmt(current)}</b>
🕐 ${new Date().toLocaleTimeString('es-ES')}

<a href="https://xentory-ecosystem-market.vercel.app">Ver en Xentory Market →</a>`;
}

// ── CREAR INVITACIONES ────────────────────────────────────────────
async function createInvites(channels: string[]): Promise<string[]> {
  const links: string[] = [];
  for (const ch of channels) {
    try {
      const link = await bot.telegram.createChatInviteLink(ch, {
        member_limit: 1,
        expire_date:  Math.floor(Date.now() / 1000) + 3600,
      });
      links.push(link.invite_link);
    } catch (e: any) {
      console.error(`[Bot] Error creando invitación ${ch}:`, e.message);
    }
  }
  return links;
}

// ── HANDLERS ──────────────────────────────────────────────────────
bot.start(async (ctx: Context) => {
  const code  = ((ctx as any).startPayload as string | undefined)?.trim().toUpperCase();
  const name  = ctx.from?.first_name ?? 'usuario';
  const chatId = ctx.chat!.id;
  if (code) await handleCode(ctx, code, chatId, name);
  else await ctx.replyWithHTML(msgWelcome(name));
});

bot.on('text', async (ctx: Context) => {
  const text   = ((ctx as any).message?.text ?? '').trim().toUpperCase();
  const chatId = ctx.chat!.id;
  const name   = ctx.from?.first_name ?? 'usuario';
  if (text.startsWith('XMKT-') || text.startsWith('XBET-')) { await handleCode(ctx, text, chatId, name); return; }
  if (text === '/STATUS') { await handleStatus(ctx, chatId); return; }
  if (text === '/UPDATE') { await handleUpdate(ctx, chatId); return; }
  await ctx.replyWithHTML(msgWelcome(name));
});

bot.command('status', async ctx => handleStatus(ctx, ctx.chat!.id));
bot.command('update', async ctx => handleUpdate(ctx, ctx.chat!.id));

// ── VERIFICAR CÓDIGO ──────────────────────────────────────────────
async function handleCode(ctx: Context, code: string, chatId: number, name: string) {
  const { data: row, error } = await supabase
    .from('telegram_verify_codes')
    .select('*').eq('code', code).single();

  if (error || !row)                         { await ctx.replyWithHTML('❌ Código no reconocido.\n\nComprueba que lo has copiado bien e inténtalo de nuevo.'); return; }
  if (row.used)                              { await ctx.replyWithHTML('⚠️ Este código ya fue utilizado. Genera uno nuevo desde la app.'); return; }
  if (new Date(row.expires_at) < new Date()) { await ctx.replyWithHTML('⏰ Código expirado. Genera uno nuevo desde la sección Telegram de la app.'); return; }

  const { platform, plan, user_id, user_email } = row;

  // ¿Ya vinculado?
  const { data: existing } = await supabase
    .from('telegram_connections').select('id, plan')
    .eq('user_id', user_id).eq('platform', platform).single();

  if (existing) {
    await ctx.replyWithHTML(`ℹ️ Tu cuenta de Xentory ${platformName(platform)} ya está vinculada con el plan <b>${planLabel(platform, existing.plan)}</b>.\n\nUsa /update si has cambiado de plan.`);
    return;
  }

  // Guardar conexión
  await supabase.from('telegram_connections').insert({
    user_id, user_email, platform,
    telegram_chat_id:  chatId,
    telegram_username: ctx.from?.username ?? null,
    plan, verified: true,
    verified_at: new Date().toISOString(),
  });

  await supabase.from('telegram_verify_codes').update({ used: true }).eq('id', row.id);

  // Crear invitaciones a canales según plan
  const channels = getChannels(platform, plan);
  const links    = await createInvites(channels);

  await ctx.replyWithHTML(msgVerified(name, platform, plan, links));
  console.log(`[Bot] ✅ ${user_email} | ${platform}:${plan} | ${channels.length} canales`);
}

// ── /status ───────────────────────────────────────────────────────
async function handleStatus(ctx: Context, chatId: number) {
  const { data } = await supabase
    .from('telegram_connections')
    .select('platform, plan, verified_at')
    .eq('telegram_chat_id', chatId).eq('verified', true);
  await ctx.replyWithHTML(msgStatus(data ?? []));
}

// ── /update — refresca canales tras cambio de plan ────────────────
async function handleUpdate(ctx: Context, chatId: number) {
  const { data: conns } = await supabase
    .from('telegram_connections')
    .select('*').eq('telegram_chat_id', chatId).eq('verified', true);

  if (!conns?.length) {
    await ctx.replyWithHTML('❌ Sin cuentas vinculadas. Envía tu código para empezar.');
    return;
  }

  await ctx.replyWithHTML('🔄 Actualizando acceso a canales…');

  for (const conn of conns) {
    const channels = getChannels(conn.platform, conn.plan);
    const links    = await createInvites(channels);
    if (links.length > 0) {
      await ctx.replyWithHTML(
        `✅ <b>Xentory ${platformName(conn.platform)}</b> — ${planLabel(conn.platform, conn.plan)}\n\n${links.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
      );
    }
  }
}

// ── CRON: alertas cada 30 segundos ───────────────────────────────
const BINANCE_MAP: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT',
  BNB: 'BNBUSDT', ADA: 'ADAUSDT', DOGE:'DOGEUSDT', AVAX:'AVAXUSDT',
};

async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  const crypto = symbols.filter(s => BINANCE_MAP[s]);
  if (crypto.length > 0) {
    try {
      const qs  = JSON.stringify(crypto.map(s => BINANCE_MAP[s]));
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(qs)}`);
      const arr = await res.json() as any[];
      arr.forEach(item => {
        const sym = Object.entries(BINANCE_MAP).find(([, v]) => v === item.symbol)?.[0];
        if (sym) prices[sym] = parseFloat(item.price);
      });
    } catch (e) { console.error('[Bot] Binance error:', e); }
  }

  for (const sym of symbols.filter(s => s.includes('/'))) {
    try {
      const [base, quote] = sym.split('/');
      const res  = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
      const data = await res.json() as { rates?: Record<string, number> };
      if (data.rates?.[quote]) prices[sym] = data.rates[quote];
    } catch { /* skip */ }
  }

  return prices;
}

async function checkAlerts() {
  const { data: alerts } = await supabase
    .from('price_alerts').select('id, user_id, symbol, category, condition, target_price, notify_channel')
    .eq('active', true).eq('triggered', false);

  if (!alerts?.length) return;

  const userIds = [...new Set(alerts.map((a: any) => a.user_id))];
  const { data: conns } = await supabase
    .from('telegram_connections').select('user_id, telegram_chat_id')
    .in('user_id', userIds).eq('verified', true);

  const chatMap: Record<string, number> = {};
  (conns ?? []).forEach((c: any) => { chatMap[c.user_id] = Number(c.telegram_chat_id); });

  const symbols = [...new Set(alerts.map((a: any) => a.symbol))];
  const prices  = await fetchPrices(symbols as string[]);

  for (const a of alerts as any[]) {
    const price = prices[a.symbol];
    if (price === undefined) continue;

    const hit = (a.condition === 'above' && price >= Number(a.target_price)) ||
                (a.condition === 'below' && price <= Number(a.target_price));
    if (!hit) continue;

    const chatId = chatMap[a.user_id];

    if ((a.notify_channel === 'telegram' || a.notify_channel === 'both') && chatId) {
      try {
        await bot.telegram.sendMessage(chatId, msgAlert(a.symbol, a.condition, Number(a.target_price), price, a.category), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
        await supabase.from('alert_notifications_log').insert({ alert_id: a.id, user_id: a.user_id, channel: 'telegram', status: 'sent', message: `${a.symbol} ${a.condition} $${a.target_price} → $${price}` });
        console.log(`[Bot] 🔔 Alerta: ${a.symbol} → chatId ${chatId}`);
      } catch (e: any) {
        await supabase.from('alert_notifications_log').insert({ alert_id: a.id, user_id: a.user_id, channel: 'telegram', status: 'failed', message: e.message });
      }
    }

    await supabase.from('price_alerts').update({ triggered: true, triggered_at: new Date().toISOString(), trigger_price: price }).eq('id', a.id);
  }
}

cron.schedule('*/30 * * * * *', async () => {
  try { await checkAlerts(); } catch (e) { console.error('[Bot] Cron error:', e); }
});

// ── ARRANQUE ──────────────────────────────────────────────────────
bot.launch().then(() => {
  console.log('🤖 @XentoryBot en marcha');
  Object.entries(CH).forEach(([k, v]) => console.log(`   ${k.padEnd(15)} ${v || '⚠️ no configurado'}`));
}).catch(err => { console.error('❌ Error al arrancar:', err); process.exit(1); });

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot, CH, getChannels };
