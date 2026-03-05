import type { PlatformPlan, BlogPost } from '../types';

// ── PLATFORM URLS ──
export const PLATFORM_URLS = {
  market: 'http://localhost:3000',   // Xentory Market URL
  bets:   'http://localhost:3001',   // Xentory Bet URL (when built)
};

// ── MARKET PLANS ──
export const MARKET_PLANS: PlatformPlan[] = [
  {
    id: 'free', name: 'Explorador', price: 0, yearlyPrice: 0,
    platform: 'market', color: '#6b7294',
    features: [
      { label: '3 activos en watchlist', included: true },
      { label: 'Análisis rápido IA (Flash)', included: true },
      { label: 'Dashboard de precios', included: true },
      { label: 'Análisis Pro (Google Grounding)', included: false },
      { label: 'Alertas de precio', included: false },
      { label: 'Canal Telegram PRO', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29, yearlyPrice: 278,
    platform: 'market', color: '#c9a84c', popular: true,
    features: [
      { label: 'Activos ilimitados', included: true },
      { label: 'Análisis Pro + Google Grounding', included: true, highlight: true },
      { label: 'Todos los indicadores técnicos', included: true },
      { label: 'Alertas ilimitadas', included: true },
      { label: 'Canal Telegram PRO', included: true, highlight: true },
      { label: 'Cripto + Bolsa + Forex', included: true },
    ],
  },
  {
    id: 'elite', name: 'Elite', price: 59, yearlyPrice: 566,
    platform: 'market', color: '#00d4ff',
    features: [
      { label: 'Todo el Plan Pro', included: true },
      { label: 'Análisis a demanda ilimitado', included: true, highlight: true },
      { label: 'Canal Telegram ELITE', included: true, highlight: true },
      { label: 'Informes PDF semanales', included: true },
      { label: 'Soporte prioritario 24/7', included: true },
      { label: 'Acceso anticipado a funciones', included: true },
    ],
  },
];

// ── BETS PLANS ──
export const BETS_PLANS: PlatformPlan[] = [
  {
    id: 'free', name: 'Fanático', price: 0, yearlyPrice: 0,
    platform: 'bets', color: '#6b7294',
    features: [
      { label: '3 predicciones al día', included: true },
      { label: 'Análisis básico (últimos 3 partidos)', included: true },
      { label: 'Fútbol únicamente', included: true },
      { label: 'Análisis 5 partidos completo', included: false },
      { label: 'Canal Telegram señales', included: false },
      { label: 'Baloncesto + Tenis', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29, yearlyPrice: 278,
    platform: 'bets', color: '#c9a84c', popular: true,
    features: [
      { label: 'Predicciones ilimitadas', included: true },
      { label: 'Análisis completo 5 partidos', included: true, highlight: true },
      { label: 'Fútbol + Baloncesto + Tenis', included: true },
      { label: 'Canal Telegram señales PRO', included: true, highlight: true },
      { label: 'Confianza estadística avanzada', included: true },
      { label: 'Historial de predicciones', included: true },
    ],
  },
  {
    id: 'elite', name: 'Elite', price: 49, yearlyPrice: 470,
    platform: 'bets', color: '#00d4ff',
    features: [
      { label: 'Todo el Plan Pro', included: true },
      { label: 'Análisis a demanda por equipo', included: true, highlight: true },
      { label: 'Canal Telegram ELITE exclusivo', included: true, highlight: true },
      { label: 'Alertas pre-partido en tiempo real', included: true },
      { label: 'Informes PDF semanales', included: true },
      { label: 'Soporte prioritario', included: true },
    ],
  },
];

// ── BUNDLE DISCOUNT ──
export const BUNDLE = {
  name: 'Bundle Total',
  description: 'Xentory Market Pro + Xentory Bet Pro',
  monthlyPrice: 49,   // en vez de 29+29=58
  yearlyPrice: 470,
  saving: 9,
  color: '#c9a84c',
};

// ── BLOG POSTS (mock) ──
export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'bitcoin-resistencia-100k',
    title: 'Bitcoin ante la resistencia clave de los $100.000',
    excerpt: 'El análisis técnico muestra una estructura alcista intacta, pero los indicadores de momentum sugieren prudencia en los niveles actuales.',
    content: '',
    category: 'crypto',
    tags: ['Bitcoin', 'BTC', 'Análisis técnico'],
    author: 'Xentory Market IA',
    publishedAt: '2025-02-27T10:00:00Z',
    readTime: 4,
    imageEmoji: '₿',
    featured: true,
  },
  {
    id: '2',
    slug: 'nvidia-resultados-q4',
    title: 'NVIDIA: resultados Q4 y su impacto en el sector IA',
    excerpt: 'Los resultados trimestrales de NVIDIA superaron expectativas. Analizamos el contexto técnico y las implicaciones para el sector semiconductores.',
    content: '',
    category: 'stocks',
    tags: ['NVDA', 'Resultados', 'IA'],
    author: 'Xentory Market IA',
    publishedAt: '2025-02-26T14:30:00Z',
    readTime: 5,
    imageEmoji: '🟩',
  },
  {
    id: '3',
    slug: 'eurusd-macro-fed',
    title: 'EUR/USD y la decisión de la Fed: escenarios técnicos',
    excerpt: 'La reunión de la Reserva Federal marcará el próximo movimiento del par. Estudiamos los niveles clave y las zonas de interés técnico.',
    content: '',
    category: 'forex',
    tags: ['EUR/USD', 'Fed', 'Forex'],
    author: 'Xentory Market IA',
    publishedAt: '2025-02-25T09:15:00Z',
    readTime: 3,
    imageEmoji: '💱',
  },
  {
    id: '4',
    slug: 'champions-league-predicciones',
    title: 'Champions League: predicciones IA para los octavos',
    excerpt: 'Nuestro motor analiza los últimos 5 partidos de cada equipo. Estadísticas, tendencias y niveles de confianza para cada enfrentamiento.',
    content: '',
    category: 'sports',
    tags: ['Champions', 'Fútbol', 'Predicción'],
    author: 'Xentory Bet IA',
    publishedAt: '2025-02-24T18:00:00Z',
    readTime: 6,
    imageEmoji: '⚽',
    featured: true,
  },
  {
    id: '5',
    slug: 'solana-ecosistema-2025',
    title: 'Solana en 2025: análisis del ecosistema y perspectivas técnicas',
    excerpt: 'SOL consolida tras su rally. Analizamos el estado del ecosistema, los indicadores on-chain y el contexto técnico en los timeframes clave.',
    content: '',
    category: 'crypto',
    tags: ['Solana', 'SOL', 'On-chain'],
    author: 'Xentory Market IA',
    publishedAt: '2025-02-23T11:00:00Z',
    readTime: 5,
    imageEmoji: '◎',
  },
  {
    id: '6',
    slug: 'nba-playoffs-analisis',
    title: 'NBA Playoffs: análisis estadístico de los favoritos',
    excerpt: 'Con la temporada regular en su recta final, el motor de Xentory Bet analiza las tendencias de los equipos con más opciones al título.',
    content: '',
    category: 'sports',
    tags: ['NBA', 'Baloncesto', 'Playoffs'],
    author: 'Xentory Bet IA',
    publishedAt: '2025-02-22T16:00:00Z',
    readTime: 4,
    imageEmoji: '🏀',
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  crypto:   { label: 'Cripto',    color: '#c9a84c', emoji: '₿' },
  stocks:   { label: 'Bolsa',     color: '#00d4ff', emoji: '📈' },
  forex:    { label: 'Forex',     color: '#00ff88', emoji: '💱' },
  sports:   { label: 'Deportes',  color: '#f97316', emoji: '⚽' },
  platform: { label: 'Plataforma',color: '#6b7294', emoji: '🔧' },
};

export const PLAN_LABELS: Record<string, string> = {
  free: 'Explorador',
  pro: 'Pro',
  elite: 'Elite',
};
