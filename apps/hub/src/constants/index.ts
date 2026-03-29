import type { PlatformPlan, BlogPost } from '../types';

// ── PLATFORM URLS ──
export const PLATFORM_URLS = {
  market: 'http://localhost:3000',   // Xentory Market URL
  bets:   'http://localhost:3001',   // Xentory Bet URL (when built)
};

// ── MARKET PLANS ──
export const MARKET_PLANS: PlatformPlan[] = [
  {
    id: 'free', name: 'Explorer', price: 0, yearlyPrice: 0,
    platform: 'market', color: '#6b7294',
    features: [
      { label: '3 assets in watchlist', included: true },
      { label: 'Fast AI analysis (Flash)', included: true },
      { label: 'Price dashboard', included: true },
      { label: 'Pro Analysis (Google Grounding)', included: false },
      { label: 'Price alerts', included: false },
      { label: 'PRO Telegram channel', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29, yearlyPrice: 278,
    platform: 'market', color: '#c9a84c', popular: true,
    features: [
      { label: 'Unlimited assets', included: true },
      { label: 'Pro Analysis + Google Grounding', included: true, highlight: true },
      { label: 'All technical indicators', included: true },
      { label: 'Unlimited alerts', included: true },
      { label: 'PRO Telegram channel', included: true, highlight: true },
      { label: 'Crypto + Stocks + Forex', included: true },
    ],
  },
  {
    id: 'elite', name: 'Elite', price: 59, yearlyPrice: 566,
    platform: 'market', color: '#00d4ff',
    features: [
      { label: 'All Pro Plan', included: true },
      { label: 'Unlimited on-demand analysis', included: true, highlight: true },
      { label: 'ELITE Telegram channel', included: true, highlight: true },
      { label: 'Weekly PDF reports', included: true },
      { label: 'Priority support 24/7', included: true },
      { label: 'Early access to features', included: true },
    ],
  },
];

// ── BETS PLANS ──
export const BETS_PLANS: PlatformPlan[] = [
  {
    id: 'free', name: 'Fan', price: 0, yearlyPrice: 0,
    platform: 'bets', color: '#6b7294',
    features: [
      { label: '3 predictions per day', included: true },
      { label: 'Basic analysis (last 3 matches)', included: true },
      { label: 'Football only', included: true },
      { label: 'Full 5-match analysis', included: false },
      { label: 'Telegram signals channel', included: false },
      { label: 'Basketball + Tennis', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29, yearlyPrice: 278,
    platform: 'bets', color: '#c9a84c', popular: true,
    features: [
      { label: 'Unlimited predictions', included: true },
      { label: 'Full 5-match analysis', included: true, highlight: true },
      { label: 'Football + Basketball + Tennis', included: true },
      { label: 'PRO Telegram signals channel', included: true, highlight: true },
      { label: 'Advanced statistical confidence', included: true },
      { label: 'Historial de predicciones', included: true },
    ],
  },
  {
    id: 'elite', name: 'Elite', price: 49, yearlyPrice: 470,
    platform: 'bets', color: '#00d4ff',
    features: [
      { label: 'All Pro Plan', included: true },
      { label: 'Análisis a demanda por equipo', included: true, highlight: true },
      { label: 'Canal Telegram ELITE exclusivo', included: true, highlight: true },
      { label: 'Alertas pre-partido en tiempo real', included: true },
      { label: 'Weekly PDF reports', included: true },
      { label: 'Soporte prioritario', included: true },
    ],
  },
];

// ── BUNDLE DISCOUNT ──
export const BUNDLE = {
  name: 'Full Bundle',
  description: 'Xentory Market Pro + Xentory Bet Pro',
  monthlyPrice: 49,   // en vez de 29+29=58
  yearlyPrice: 470,
  saving: 9,
  color: '#c9a84c',
};

// ── BLOG POSTS — fallback estático cuando el DB está vacío ──
// La fuente primaria es la tabla `blog_posts` en Supabase (useBlogPosts hook).
// Estos datos sirven como seed/fallback de desarrollo.
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

export const CATEGORY_LABELS: Record<string, { label: string; labelEn?: string; color: string; emoji: string }> = {
  crypto:   { label: 'Cripto',     labelEn: 'Crypto',    color: '#c9a84c', emoji: '₿' },
  stocks:   { label: 'Bolsa',      labelEn: 'Stocks',    color: '#00d4ff', emoji: '📈' },
  forex:    { label: 'Forex',      labelEn: 'Forex',     color: '#00ff88', emoji: '💱' },
  sports:   { label: 'Deportes',   labelEn: 'Sports',    color: '#f97316', emoji: '⚽' },
  platform: { label: 'Plataforma', labelEn: 'Platform',  color: '#6b7294', emoji: '🔧' },
};

export const PLAN_LABELS: Record<string, string> = {
  free: 'Explorador',
  pro: 'Pro',
  elite: 'Elite',
};
