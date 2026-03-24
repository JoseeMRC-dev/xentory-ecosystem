# 🌐 Xentory Ecosystem — Monorepo

Plataforma SaaS de análisis financiero y deportivo con IA.
**Una instalación. Tres apps. Un solo comando para arrancar todo.**

---

## 🗺️ Estructura

```
xentory-ecosystem/
├── apps/
│   ├── hub/       → XentoryHub    (portal + SSO + blog)      :4000
│   ├── market/    → XentoryMarket (cripto + bolsa + forex)   :3000
│   └── bet/       → XentoryBet    (apuestas deportivas)      :3001
├── packages/
│   └── shared/    → Tipos y utilidades SSO compartidos
├── .env.example   → Variables de entorno unificadas
└── package.json   → Raíz del monorepo (workspaces)
```

---

## 🚀 Instalación y arranque

```bash
# 1. Descomprime y entra en la carpeta
tar -xzf xentory-ecosystem.tar.gz
cd xentory-ecosystem

# 2. Instala TODAS las dependencias de golpe
npm install

# 3. Configura las variables de entorno
cp .env.example .env
# Edita .env y añade tus API keys (mínimo VITE_GEMINI_API_KEY)

# 4. Arranca las 3 apps a la vez
npm run dev
```

> **Nota:** El `.npmrc` incluido en el proyecto configura `legacy-peer-deps=true` automáticamente para evitar errores de compatibilidad entre paquetes.

Las tres apps se lanzan en paralelo:

| App | URL | Descripción |
|-----|-----|-------------|
| XentoryHub | http://localhost:4000 | Portal central + SSO + Blog |
| XentoryMarket | http://localhost:3000 | Análisis financiero con IA |
| XentoryBet | http://localhost:3001 | Predicciones deportivas (en construcción) |

---

## ⚙️ Comandos disponibles

```bash
npm run dev            # Arranca las 3 apps a la vez
npm run dev:hub        # Solo XentoryHub
npm run dev:market     # Solo XentoryMarket
npm run dev:bet        # Solo XentoryBet

npm run build          # Build de producción de las 3 apps
npm run build:hub      # Build solo de Hub
npm run build:market   # Build solo de Market
npm run build:bet      # Build solo de Bet

npm run clean          # Elimina node_modules y dist de todo el monorepo
```

---

## 🔑 Variables de entorno necesarias

Edita el archivo `.env` en la raíz con tus claves reales:

### Gemini AI (para XentoryMarket y XentoryBet)
```env
VITE_GEMINI_API_KEY=AIza...
```
Obtén tu key gratis en: https://aistudio.google.com

### Stripe (pasarela de pagos)
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Crea tu cuenta en: https://dashboard.stripe.com

### Telegram Bot
```env
TELEGRAM_BOT_TOKEN=7xxx:AAA...
TELEGRAM_MARKET_PRO_CHANNEL_ID=-100xxx
```
Crea tu bot con @BotFather en Telegram.

---

## 🔗 SSO — Cómo funciona la autenticación unificada

```
Usuario hace login en XentoryHub
    ↓
XentoryHub genera SSOToken (JWT temporal, 5 min)
    ↓
Al pulsar "Abrir XentoryMarket":
  → Redirige a localhost:3000?sso=<TOKEN_BASE64>
    ↓
XentoryMarket lee el token, valida y loguea al usuario automáticamente
    ↓
Usuario ya está autenticado sin volver a escribir su contraseña
```

---

## 🤖 Configurar el Bot de Telegram

```
1. Abre Telegram y busca @BotFather
2. Escribe /newbot y sigue los pasos
3. Guarda el TOKEN que te da BotFather
4. Crea un canal privado en Telegram
5. Añade el bot como ADMINISTRADOR del canal
   (con permisos de añadir/expulsar miembros)
6. Obtén el Channel ID enviando un mensaje
   y visitando: https://api.telegram.org/bot<TOKEN>/getUpdates
7. Añade el token y channel ID al .env
```

---

## 💳 Integración Stripe (producción)

```bash
# Instalar Stripe CLI para probar webhooks en local
npm install -g stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Eventos que debes escuchar:
# customer.subscription.created  → Añadir usuario al canal Telegram
# customer.subscription.deleted  → Expulsar usuario del canal Telegram
# invoice.payment_failed          → Notificar al usuario
```

---

## 📦 Apps en detalle

### XentoryHub (:4000)
- Landing con hero, ticker en vivo y cards de plataformas
- Login/Registro/Magic Link unificado (SSO)
- Dashboard con estado de suscripciones de ambas plataformas
- Comparador de precios XentoryMarket vs XentoryBet vs Bundle
- Blog con artículos de cripto, bolsa, forex y deportes

### XentoryMarket (:3000)
- Dashboard con semáforo de mercado 🟢🟡🔴
- 16 activos: cripto (BTC, ETH, SOL...), bolsa (NVDA, AAPL...), forex (EUR/USD...)
- Análisis IA con Gemini Flash (Free) o Gemini Pro + Grounding (Pro/Elite)
- Indicadores: RSI, MACD, Bollinger Bands, EMA 20/50/200, ATR
- Watchlist, alertas de precio, canal Telegram integrado
- 3 planes: Explorador (gratis) / Pro (29€) / Elite (59€)

### XentoryBet (:3001) — En construcción
- Predicciones deportivas: fútbol, baloncesto, tenis
- Análisis de últimos 5 partidos por equipo
- Nivel de confianza estadística por predicción
- Canal Telegram con señales automáticas
- 3 planes: Fanático (gratis) / Pro (29€) / Elite (49€)

---

## ⚖️ Aviso legal

Este software es de carácter informativo y educativo.
**No proporciona asesoramiento financiero ni de apuestas.**
Las decisiones de inversión y apuesta son responsabilidad exclusiva del usuario.
