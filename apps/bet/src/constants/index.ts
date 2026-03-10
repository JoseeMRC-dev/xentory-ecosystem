import type { Competition, Plan } from '../types';

// ── COMPETITIONS ──
export const COMPETITIONS: Competition[] = [
  { id: 2,   name: 'Champions League', sport: 'football',   country: 'Europa',   logo: '', emoji: '🏆' },
  { id: 140, name: 'La Liga',          sport: 'football',   country: 'España',   logo: '', emoji: '🇪🇸' },
  { id: 39,  name: 'Premier League',   sport: 'football',   country: 'Inglaterra',logo:'', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 12,  name: 'NBA',              sport: 'basketball', country: 'USA',      logo: '', emoji: '🏀' },
  { id: 1,   name: 'ATP Tour',         sport: 'tennis',     country: 'Mundial',  logo: '', emoji: '🎾' },
  { id: 3,   name: 'WTA Tour',         sport: 'tennis',     country: 'Mundial',  logo: '', emoji: '🎾' },
];

export const SPORT_CONFIG = {
  football:   { label: 'Fútbol',      emoji: '⚽', color: '#00ff88' },
  basketball: { label: 'Baloncesto',  emoji: '🏀', color: '#f97316' },
  tennis:     { label: 'Tenis',       emoji: '🎾', color: '#eab308' },
  f1:         { label: 'Fórmula 1',   emoji: '🏎️',  color: '#ef4444' },
  golf:       { label: 'Golf',        emoji: '⛳', color: '#22c55e' },
} as const;

// ── PLANS ──
export interface PlanConfig {
  id: Plan;
  name: string;
  price: number;
  yearlyPrice: number;
  color: string;
  popular?: boolean;
  features: { label: string; included: boolean; highlight?: boolean }[];
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free', name: 'Fan', price: 0, yearlyPrice: 0, color: '#6b7294',
    features: [
      { label: '3 análisis al día',                  included: true  },
      { label: 'Mercado 1X2 básico',                 included: true  },
      { label: 'Football only',                  included: true  },
      { label: 'Últimos 3 partidos por equipo',      included: true  },
      { label: 'Análisis completo (5 partidos)',     included: false },
      { label: 'Over/Under + BTTS + Hándicap',       included: false },
      { label: 'Telegram signals channel',             included: false },
      { label: 'Baloncesto + Tenis + F1 + Golf',     included: false },
      { label: 'Mejor apuesta del día',              included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 29, yearlyPrice: 278, color: '#c9a84c', popular: true,
    features: [
      { label: 'Análisis ilimitados',                included: true  },
      { label: 'Todos los mercados (5 mercados)',    included: true, highlight: true },
      { label: 'Últimos 5 partidos completos',       included: true, highlight: true },
      { label: 'Todos los deportes',                 included: true  },
      { label: 'Canal Telegram PRO',                 included: true, highlight: true },
      { label: 'Mejor apuesta del día',              included: true  },
      { label: 'Cuotas estimadas',                   included: true  },
      { label: 'Historial de predicciones',          included: true  },
      { label: 'Weekly PDF reports',             included: false },
    ],
  },
  {
    id: 'elite', name: 'Elite', price: 49, yearlyPrice: 470, color: '#00d4ff',
    features: [
      { label: 'Todo el Plan Pro incluido',          included: true  },
      { label: 'Canal Telegram ELITE exclusivo',     included: true, highlight: true },
      { label: 'Alertas pre-partido en tiempo real', included: true, highlight: true },
      { label: 'Weekly PDF reports',             included: true  },
      { label: 'Análisis a demanda por equipo',      included: true  },
      { label: 'Estadísticas avanzadas H2H',         included: true  },
      { label: 'Priority support 24/7',           included: true  },
      { label: 'Acceso anticipado a funciones',      included: true  },
      { label: 'API de señales personal',            included: true  },
    ],
  },
];

// ── FORM RESULT COLORS ──
export const FORM_COLORS = {
  W: { bg: 'rgba(0,255,136,0.15)', color: '#00ff88', border: 'rgba(0,255,136,0.3)' },
  D: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  L: { bg: 'rgba(255,68,85,0.15)', color: '#ff4455', border: 'rgba(255,68,85,0.3)' },
};

// ── CONFIDENCE COLORS ──
export function confidenceColor(n: number): string {
  if (n >= 75) return '#00ff88';
  if (n >= 60) return '#c9a84c';
  return '#f97316';
}

// ── API-FOOTBALL ──
export const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
export const SEASON = 2024;
