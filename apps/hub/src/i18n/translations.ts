/**
 * Traducciones centralizadas — todas las cadenas de texto de la app.
 * Uso: const { t } = useLang();  → t('home.hero.title')
 */

export const translations = {
  // ── NAV ────────────────────────────────────────────────────────
  'nav.pricing':     { es: 'Precios',      en: 'Pricing' },
  'nav.blog':        { es: 'Blog',         en: 'Blog' },
  'nav.methodology': { es: 'Metodología',  en: 'Methodology' },
  'nav.dashboard':   { es: 'Dashboard',    en: 'Dashboard' },
  'nav.signin':      { es: 'Entrar',       en: 'Sign in' },
  'nav.signup':      { es: 'Registrarse',  en: 'Sign up' },
  'nav.signout':     { es: 'Cerrar sesión',en: 'Sign out' },
  'nav.myplans':     { es: '💎 Mis planes', en: '💎 My plans' },
  'nav.lightmode':   { es: 'Modo claro',   en: 'Light mode' },
  'nav.darkmode':    { es: 'Modo oscuro',  en: 'Dark mode' },

  // ── HOME — HERO ────────────────────────────────────────────────
  'home.hero.badge':    { es: 'IA financiera y deportiva',       en: 'Financial & sports AI' },
  'home.hero.title1':   { es: 'Analiza mercados.',               en: 'Analyse markets.' },
  'home.hero.title2':   { es: 'Predice resultados.',             en: 'Predict results.' },
  'home.hero.title3':   { es: 'Decide mejor.',                   en: 'Decide smarter.' },
  'home.hero.sub':      { es: 'Xentory centraliza análisis de criptomonedas, acciones, forex y apuestas deportivas con IA en tiempo real. Una cuenta, dos plataformas, ventaja real.', en: 'Xentory centralises crypto, stocks, forex and sports betting analysis with real-time AI. One account, two platforms, real edge.' },
  'home.hero.cta1':     { es: 'Empezar gratis',                  en: 'Start free' },
  'home.hero.cta2':     { es: 'Ver metodología',                 en: 'See methodology' },
  'home.hero.live':     { es: 'Datos en vivo',                   en: 'Live data' },
  'home.hero.users':    { es: 'usuarios activos',                en: 'active users' },

  // ── HOME — STATS ───────────────────────────────────────────────
  'home.stats.analysis': { es: 'Tiempo medio análisis', en: 'Avg. analysis time' },
  'home.stats.markets':  { es: 'Deportes y mercados',   en: 'Sports & markets' },
  'home.stats.accuracy': { es: 'Precisión en beta',     en: 'Beta accuracy' },
  'home.stats.free':     { es: 'Para empezar',          en: 'To get started' },
  'home.stats.freeVal':  { es: 'Gratis',                en: 'Free' },

  // ── HOME — PROBLEM ─────────────────────────────────────────────
  'home.problem.badge':  { es: 'El problema',           en: 'The problem' },
  'home.problem.title':  { es: 'Los datos existen. Interpretarlos no debería costarte horas.', en: 'The data exists. Interpreting it shouldn\'t cost you hours.' },
  'home.problem.sub':    { es: 'Cada día se publican miles de estadísticas de mercado y resultados deportivos. La mayoría de inversores y apostadores no tienen herramientas para procesarlos a tiempo.', en: 'Thousands of market stats and sports results are published every day. Most investors and bettors lack the tools to process them in time.' },
  'home.problem.p1t':    { es: '⏱ Sin tiempo real',    en: '⏱ No real-time' },
  'home.problem.p1d':    { es: 'Las noticias del mercado llegan tarde. Para cuando reaccionas, la oportunidad pasó.', en: 'Market news arrives late. By the time you react, the opportunity has passed.' },
  'home.problem.p2t':    { es: '📊 Datos dispersos',   en: '📊 Scattered data' },
  'home.problem.p2d':    { es: 'Cripto en un sitio, acciones en otro, apuestas en otro más. Sin visión unificada.', en: 'Crypto here, stocks there, betting elsewhere. No unified view.' },
  'home.problem.p3t':    { es: '🤷 Sin contexto',      en: '🤷 No context' },
  'home.problem.p3d':    { es: 'Los datos sin análisis son ruido. Necesitas la interpretación, no solo los números.', en: 'Data without analysis is noise. You need the interpretation, not just the numbers.' },
  'home.problem.sol':    { es: 'La solución: Xentory',  en: 'The solution: Xentory' },
  'home.problem.soldesc':{ es: 'Unificamos datos en tiempo real de mercados financieros y deportes, y los procesamos con IA para darte señales accionables — no información cruda.', en: 'We unify real-time data from financial markets and sports, processing it with AI to give you actionable signals — not raw information.' },

  // ── HOME — PLATFORMS ───────────────────────────────────────────
  'home.platforms.badge':    { es: 'Las plataformas',        en: 'The platforms' },
  'home.platforms.title':    { es: 'Dos herramientas. Una cuenta.', en: 'Two tools. One account.' },
  'home.platforms.sub':      { es: 'Xentory Market para mercados financieros. Xentory Bet para apuestas deportivas. Accede a ambas con tu cuenta Xentory.', en: 'Xentory Market for financial markets. Xentory Bet for sports betting. Access both with your Xentory account.' },
  'home.platforms.m.title':  { es: '📈 Xentory Market',         en: '📈 Xentory Market' },
  'home.platforms.m.desc':   { es: 'Análisis IA de criptomonedas, acciones y forex. Señales técnicas y fundamentales en tiempo real.', en: 'AI analysis of crypto, stocks and forex. Real-time technical and fundamental signals.' },
  'home.platforms.m.f1':     { es: '✓ 500+ activos cripto',  en: '✓ 500+ crypto assets' },
  'home.platforms.m.f2':     { es: '✓ Datos NYSE, NASDAQ',   en: '✓ NYSE, NASDAQ data' },
  'home.platforms.m.f3':     { es: '✓ Análisis Gemini Pro',  en: '✓ Gemini Pro analysis' },
  'home.platforms.m.f4':     { es: '✓ Alertas Telegram',     en: '✓ Telegram alerts' },
  'home.platforms.m.cta':    { es: 'Explorar Xentory Market',   en: 'Explore Xentory Market' },
  'home.platforms.b.title':  { es: '⚽ Xentory Bet',            en: '⚽ Xentory Bet' },
  'home.platforms.b.desc':   { es: 'Predicciones deportivas basadas en datos reales. Champions, Premier, LaLiga y más de 500 competiciones.', en: 'Sports predictions based on real data. Champions, Premier, LaLiga and 500+ competitions.' },
  'home.platforms.b.f1':     { es: '✓ 500+ competiciones',   en: '✓ 500+ competitions' },
  'home.platforms.b.f2':     { es: '✓ Estadísticas en vivo', en: '✓ Live statistics' },
  'home.platforms.b.f3':     { es: '✓ IA predictiva',        en: '✓ Predictive AI' },
  'home.platforms.b.f4':     { es: '✓ Canal Telegram',       en: '✓ Telegram channel' },
  'home.platforms.b.cta':    { es: 'Explorar Xentory Bet',      en: 'Explore Xentory Bet' },

  // ── HOME — HOW ─────────────────────────────────────────────────
  'home.how.badge':   { es: 'Cómo funciona',            en: 'How it works' },
  'home.how.title':   { es: 'De los datos a la señal en segundos.', en: 'From data to signal in seconds.' },
  'home.how.s1t':     { es: 'Datos en tiempo real',     en: 'Real-time data' },
  'home.how.s1d':     { es: 'Conectamos con APIs de mercados financieros y estadísticas deportivas actualizadas al segundo.', en: 'We connect to financial market APIs and sports statistics updated to the second.' },
  'home.how.s2t':     { es: 'Google Gemini analiza',    en: 'Google Gemini analyses' },
  'home.how.s2d':     { es: 'La IA procesa los datos, detecta patrones y genera análisis técnicos y predictivos estructurados.', en: 'The AI processes data, detects patterns and generates structured technical and predictive analyses.' },
  'home.how.s3t':     { es: 'Señal en tu Telegram',     en: 'Signal in your Telegram' },
  'home.how.s3d':     { es: 'Las mejores señales llegan a tu canal privado automáticamente. Tú solo decides si actuar.', en: 'The best signals arrive in your private channel automatically. You just decide whether to act.' },

  // ── HOME — TESTIMONIALS ────────────────────────────────────────
  'home.test.badge':  { es: 'Resultados reales',        en: 'Real results' },
  'home.test.title':  { es: 'Lo que dicen nuestros usuarios.', en: 'What our users say.' },

  // ── HOME — FAQ ─────────────────────────────────────────────────
  'home.faq.badge':   { es: 'FAQ',                      en: 'FAQ' },
  'home.faq.title':   { es: 'Preguntas frecuentes.',    en: 'Frequently asked questions.' },
  'home.faq.q1':      { es: '¿Las predicciones son realmente de IA o son manuales?',          en: 'Are predictions really AI-generated or manual?' },
  'home.faq.a1':      { es: 'Son 100% generadas por Google Gemini. En Pro usamos Gemini Pro con Google Grounding. Ningún tipster humano interviene.', en: '100% generated by Google Gemini. Pro uses Gemini Pro with Google Grounding. No human tipster is involved.' },
  'home.faq.q2':      { es: '¿Qué pasa si los análisis de IA no aciertan?', en: 'What happens if the AI analysis is wrong?' },
  'home.faq.a2':      { es: 'La IA genera análisis estadísticos, no certezas. Toda predicción tiene margen de error. Por eso insistimos: solo opera con capital que puedas permitirte perder, y usa nuestros análisis como apoyo informativo, nunca como garantía.', en: 'AI generates statistical analysis, not certainties. Every prediction has a margin of error. That is why we insist: only operate with capital you can afford to lose, and use our analysis as informational support, never as a guarantee.' },
  'home.faq.q3':      { es: '¿Necesito saber de trading o apuestas para usar Xentory?', en: 'Do I need trading or betting knowledge to use Xentory?' },
  'home.faq.a3':      { es: 'No. El análisis viene explicado en lenguaje claro, con la recomendación concreta y los factores clave.', en: 'No. The analysis comes with plain-language explanations, concrete recommendations and key factors.' },
  'home.faq.q4':      { es: '¿Es legal usar Xentory para apuestas deportivas?', en: 'Is it legal to use Xentory for sports betting?' },
  'home.faq.a4':      { es: 'Xentory es una herramienta de análisis, no una casa de apuestas. Las apuestas deportivas son legales en España.', en: 'Xentory is an analysis tool, not a bookmaker. Sports betting is legal in Spain.' },
  'home.faq.q5':      { es: '¿Puedo cancelar cuando quiera?', en: 'Can I cancel at any time?' },
  'home.faq.a5':      { es: 'Sí, en cualquier momento desde tu panel. Sin permanencia ni penalizaciones.', en: 'Yes, anytime from your dashboard. No lock-in or penalties.' },
  'home.faq.q6':      { es: '¿Cuántas señales recibo al día en Telegram?', en: 'How many signals per day on Telegram?' },
  'home.faq.a6':      { es: 'En Pro entre 3 y 8 señales diarias. Solo se envían cuando la IA detecta confianza superior al 65%.', en: 'Pro plan: 3–8 daily signals. Only sent when AI confidence exceeds 65%.' },
  'home.faq.q7':      { es: '¿Xentory Market y Xentory Bet son plataformas separadas?', en: 'Are Xentory Market and Xentory Bet separate platforms?' },
  'home.faq.a7':      { es: 'Son apps independientes pero con una sola cuenta y un solo pago. Tu suscripción Pro incluye ambas.', en: 'They are independent apps but with one account and one payment. Pro subscription includes both.' },
  'home.faq.q8':      { es: '¿Diferencia entre plan Explorador y Pro?', en: 'Difference between Explorer and Pro plan?' },
  'home.faq.a8':      { es: 'Explorador: 3 análisis/día, fútbol básico. Pro: ilimitados, todos los mercados, canal Telegram con señales automáticas.', en: 'Explorer: 3 analyses/day, basic football. Pro: unlimited, all markets, Telegram channel with automatic signals.' },

  // ── HOME — CTA ─────────────────────────────────────────────────
  'home.cta.title':   { es: 'Tu ventaja empieza hoy.',  en: 'Your edge starts today.' },
  'home.cta.sub':     { es: 'Únete a miles de traders y apostadores que ya usan IA para tomar mejores decisiones. Plan gratuito disponible.', en: 'Join thousands of traders and bettors already using AI to make better decisions. Free plan available.' },
  'home.cta.btn1':    { es: 'Crear cuenta gratis',      en: 'Create free account' },
  'home.cta.btn2':    { es: 'Ver planes',               en: 'View plans' },

  // ── EXIT POPUP ─────────────────────────────────────────────────
  'exit.title':       { es: '¡Espera! Antes de irte...', en: 'Wait! Before you go...' },
  'exit.sub':         { es: 'Tu primer mes Pro a mitad de precio. Oferta válida solo hoy.', en: 'Your first Pro month at half price. Today only.' },
  'exit.cta':         { es: 'Reclamar 50% descuento',   en: 'Claim 50% off' },
  'exit.dismiss':     { es: 'No gracias',               en: 'No thanks' },

  // ── FOOTER ─────────────────────────────────────────────────────
  'footer.tagline':   { es: 'IA financiera y deportiva para decisiones más inteligentes.', en: 'Financial and sports AI for smarter decisions.' },
  'footer.product':   { es: 'Producto',    en: 'Product' },
  'footer.company':   { es: 'Empresa',     en: 'Company' },
  'footer.legal':     { es: 'Legal',       en: 'Legal' },
  'footer.copy':      { es: '© 2025 Xentory. Todos los derechos reservados.', en: '© 2025 Xentory. All rights reserved.' },
  'footer.risk':      { es: 'Trading y apuestas conllevan riesgo. Invierte solo lo que puedas permitirte perder.', en: 'Trading and betting involve risk. Only invest what you can afford to lose.' },

  // ── HOME — EXTRA CTA ───────────────────────────────────────────
  'home.hero.cta.user':   { es: 'Ir al dashboard →',         en: 'Go to dashboard →' },
  'home.hero.cta.guest':  { es: 'Empieza gratis — sin tarjeta →', en: 'Start free — no card →' },
  'home.cta.create':      { es: 'Crear cuenta gratis →',      en: 'Create free account →' },
  'home.platforms.m.open':{ es: 'Abrir Xentory Market →',     en: 'Open Xentory Market →' },
  'home.platforms.b.open':{ es: 'Abrir Xentory Bet →',        en: 'Open Xentory Bet →' },
  'nav.ticker':           { es: 'Ticker en vivo',             en: 'Live ticker' },
} as const;

export type TKey = keyof typeof translations;
