# 🤖 Xentory Telegram Bot — Guía de despliegue completo

## Arquitectura

```
Frontend (Market/Bet)
    │
    ├── alertService.ts ──→ Supabase Edge Function (manage-alerts)
    │                            │
    │                            └──→ Supabase DB (price_alerts, telegram_verify_codes)
    │
    └── TelegramPage ──→ deep link → @XentoryBot / @XentoryBot
                                           │
                                     Telegraf Bot (Railway)
                                           │
                                ┌──────────┴──────────────┐
                                │                         │
                        Verifica código              Cron cada 30s
                        en Supabase                  fetchea precios Binance
                                │                         │
                        Invita al canal            Dispara alerts por DM
                        según plan
```

---

## PASO 1 — Crear Bot en Telegram

1. Abre Telegram → busca `@BotFather`
2. Envía `/newbot`
3. Nombre: `Xentory Market`
4. Username: `XentoryMarketBot`
5. Copia el **BOT_TOKEN** que te da BotFather
6. Repite para Bet: `XentoryBetBot`

---

## PASO 2 — Crear los 4 canales en Telegram

Crea estos canales (tipo "Canal", no grupo):

| Canal               | Username              | Para        |
|---------------------|-----------------------|-------------|
| Xentory Market Pro  | `@XentoryMarketPro`   | Plan Pro    |
| Xentory Market Elite| `@XentoryMarketElite` | Plan Elite  |
| Xentory Bet Pro     | `@XentoryBetPro`      | Plan Pro    |
| Xentory Bet Elite   | `@XentoryBetElite`    | Plan Elite  |

**Importante**: Añade el bot como **Administrador** de cada canal con permiso de "Invitar usuarios".

---

## PASO 3 — Ejecutar SQL en Supabase

1. Abre Supabase Dashboard → `SQL Editor` → `New query`
2. Pega el contenido de `supabase/migrations/001_telegram_alerts.sql`
3. Ejecuta (▶)

Comprueba que se crearon las tablas:
- `telegram_connections`
- `telegram_verify_codes`
- `price_alerts`
- `alert_notifications_log`
- `channel_signals`

---

## PASO 4 — Desplegar Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto
supabase link --project-ref mtgatdmrpfysqphdgaue

# Desplegar funciones
supabase functions deploy manage-alerts
supabase functions deploy check-alerts

# Añadir secretos
supabase secrets set BOT_TOKEN=<tu_bot_token>
supabase secrets set MARKET_APP_URL=https://xentory-ecosystem-market.vercel.app
```

---

## PASO 5 — Configurar cron en Supabase

En Supabase Dashboard → Database → Extensions → habilita `pg_cron`.

Luego en SQL Editor:

```sql
-- Llamar check-alerts cada minuto
SELECT cron.schedule(
  'check-price-alerts',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mtgatdmrpfysqphdgaue.supabase.co/functions/v1/check-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SUPABASE_KEY_REDACTED.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z2F0ZG1ycGZ5c3FwaGRnYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjA5NjksImV4cCI6MjA4ODE5Njk2OX0.yx_ciyMPr0iiurbIBc8GuhL4gEXkaSjYKTevWqUrPpY'
    )
  )
  $$
);
```

> También necesitas `pg_net` habilitado (mismo sitio).

---

## PASO 6 — Desplegar el Bot en Railway

1. Crea cuenta en [railway.app](https://railway.app) (free tier funciona)
2. `New Project` → `Deploy from GitHub`
3. Selecciona el repo → carpeta `telegram-bot`
4. Añade variables de entorno:

```env
BOT_TOKEN=<market_bot_token>
SUPABASE_URL=https://mtgatdmrpfysqphdgaue.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>   ← Dashboard > Settings > API > service_role
MARKET_PRO_CHANNEL=@XentoryMarketPro
MARKET_ELITE_CHANNEL=@XentoryMarketElite
BET_PRO_CHANNEL=@XentoryBetPro
BET_ELITE_CHANNEL=@XentoryBetElite
```

5. Railway detecta el `package.json` y ejecuta `npm start`

> **IMPORTANTE**: El `service_role` key está en Supabase → Settings → API.
> Es diferente al `anon` key. Nunca lo expongas en el frontend.

---

## PASO 7 — Añadir RLS policy para reads anónimos

En Supabase SQL Editor:

```sql
-- Permite que el frontend (sin sesión) lea sus propias alertas
-- usando user_id como identificador
CREATE POLICY "anon_read_own_alerts" ON public.price_alerts
  FOR SELECT USING (true);   -- el filtro .eq('user_id', ...) ya restringe

CREATE POLICY "anon_read_own_conn" ON public.telegram_connections
  FOR SELECT USING (true);

CREATE POLICY "anon_read_own_codes" ON public.telegram_verify_codes
  FOR SELECT USING (true);
```

---

## PASO 8 — Variables en Vercel

Añade a Market y Bet en Vercel → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://mtgatdmrpfysqphdgaue.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_KEY_REDACTED...
```

---

## Flujo completo de verificación

```
Usuario en Market (plan Pro)
  → Pulsa "Vincular Telegram"
  → alertService.upsertVerifyCode() → Edge Function manage-alerts
      → INSERT telegram_verify_codes { code: 'XMKT-A1B2C3D4', user_id, plan: 'pro' }
  → Se abre t.me/XentoryMarketBot?start=XMKT-A1B2C3D4

Bot recibe /start XMKT-A1B2C3D4
  → SELECT telegram_verify_codes WHERE code = 'XMKT-A1B2C3D4'
  → code válido, no usado, no expirado
  → INSERT telegram_connections { user_id, chat_id: 123456789, platform: 'market', plan: 'pro' }
  → UPDATE telegram_verify_codes SET used = true
  → createChatInviteLink(@XentoryMarketPro, member_limit: 1)
  → Envía DM: "¡Verificado! Accede al canal: https://t.me/..."

Frontend (polling cada 3s durante 30s)
  → getTelegramConnection() → Supabase SELECT
  → Encuentra la conexión → tgConn = { verified: true, ... }
  → UI actualizada: "● Conectado · @usuario"
```

## Flujo de alerta de precio

```
Usuario crea alerta: BTC > $105.000, canal: Telegram

Edge Function check-alerts (cada minuto vía pg_cron)
  → SELECT price_alerts WHERE active=true AND triggered=false
  → fetchPrices(['BTC']) → Binance API → { BTC: 105_230 }
  → 105_230 >= 105_000 → ¡TRIGGERED!
  → sendTelegramMessage(chat_id, "📈 BTC ha superado $105.000...")
  → UPDATE price_alerts SET triggered=true, trigger_price=105230
  → INSERT alert_notifications_log

Usuario recibe DM privado en Telegram inmediatamente.
```

---

## Señales de canal (manual / admin)

Para enviar una señal a todos los miembros del canal Pro de Market:

```typescript
import { broadcastSignal } from './src/index';

await broadcastSignal({
  platform:   'market',
  planTier:   'both',        // 'pro' | 'elite' | 'both'
  signalType: 'buy',
  symbol:     'BTC',
  confidence: 82,
  message: `📈 <b>SEÑAL MARKET · BTC/USDT</b>

🎯 Tipo: Compra
💎 Confianza: 82%
📊 Precio actual: $95.400
🎯 Objetivo: $102.000
🛑 Stop: $91.500

RSI(14): 52 · MACD bullish · Volumen +28% media 20D
Estructura alcista intacta. EMA20 como soporte dinámico.

⚠️ No es asesoramiento financiero.`,
});
```
