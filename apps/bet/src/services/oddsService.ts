/**
 * oddsService — Cuotas por casa de apuestas
 *
 * Genera cuotas derivadas del modelo estadístico con variaciones
 * realistas por casa. Cuando se configura VITE_ODDS_API_KEY, intenta
 * obtener cuotas reales de The Odds API (theoddsapi.com).
 *
 * Las 6 casas mostradas: Bet365, William Hill, Betfair, Sportium, Bwin, Codere
 */

const ODDS_API_KEY = (import.meta as any).env?.VITE_ODDS_API_KEY ?? '';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// ── Casas configuradas ─────────────────────────────────────────────────────
export interface Bookmaker {
  id:          string;
  name:        string;
  shortName:   string;
  logo:        string; // Google favicon CDN — siempre disponible
  color:       string;
  registerUrl: string;
  loginUrl:    string;
  // Factor de pago típico (cuanto mayor, mejores cuotas para el apostante)
  payoutRate:  number;
}

export const BOOKMAKERS: Bookmaker[] = [
  {
    id: 'bet365', name: 'Bet365', shortName: 'B365',
    logo: 'https://www.google.com/s2/favicons?domain=bet365.es&sz=32',
    color: '#00a651',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.bet365.es/#/AC/B1/C1/D1002/E3/N/',
    loginUrl:    'https://www.bet365.es/',
    payoutRate: 0.940,
  },
  {
    id: 'williamhill', name: 'William Hill', shortName: 'WH',
    logo: 'https://www.google.com/s2/favicons?domain=williamhill.es&sz=32',
    color: '#8b8b8b',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://sports.williamhill.es/registration',
    loginUrl:    'https://sports.williamhill.es/',
    payoutRate: 0.925,
  },
  {
    id: 'betfair', name: 'Betfair', shortName: 'BF',
    logo: 'https://www.google.com/s2/favicons?domain=betfair.com&sz=32',
    color: '#f5a623',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://register.betfair.es/',
    loginUrl:    'https://www.betfair.es/',
    payoutRate: 0.975, // Exchange — mejores cuotas del mercado
  },
  {
    id: 'sportium', name: 'Sportium', shortName: 'SPT',
    logo: 'https://www.google.com/s2/favicons?domain=apuestas.sportium.es&sz=32',
    color: '#1a73e8',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://apuestas.sportium.es/registro',
    loginUrl:    'https://apuestas.sportium.es/',
    payoutRate: 0.910,
  },
  {
    id: 'bwin', name: 'Bwin', shortName: 'BW',
    logo: 'https://www.google.com/s2/favicons?domain=bwin.es&sz=32',
    color: '#ff6600',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://sports.bwin.es/es/sports/registration',
    loginUrl:    'https://sports.bwin.es/',
    payoutRate: 0.920,
  },
  {
    id: 'codere', name: 'Codere', shortName: 'CDR',
    logo: 'https://www.google.com/s2/favicons?domain=codere.com&sz=32',
    color: '#e30613',
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.codere.es/registro',
    loginUrl:    'https://www.codere.es/',
    payoutRate: 0.905,
  },
];

// ── Mapping ESPN competition ID → Odds API sport key ───────────────────────
const SPORT_KEYS: Record<number, string> = {
  2:   'soccer_uefa_champs_league',
  3:   'soccer_uefa_europa_league',
  39:  'soccer_england_premier_league',
  61:  'soccer_france_ligue_one',
  78:  'soccer_germany_bundesliga',
  94:  'soccer_portugal_primeira_liga',
  128: 'soccer_argentina_primera_division',
  135: 'soccer_italy_serie_a',
  140: 'soccer_spain_la_liga',
  141: 'soccer_spain_segunda_division',
  262: 'soccer_mexico_ligamx',
};
const NBA_KEY   = 'basketball_nba';

// ── Deterministic pseudo-random seeded on string ───────────────────────────
function seededRand(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

// ── Derive odds per bookmaker from base probability ────────────────────────
/**
 * @param baseProb  Probabilidad del modelo (0–100)
 * @param matchSeed Seed único del partido (matchId + market + selection)
 * @returns Record<bookmaker_id, odds>
 */
export function deriveBookmakerOdds(
  baseProb: number,
  matchSeed: string,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const bk of BOOKMAKERS) {
    // Variación determinista per bookmaker ±3% en la probabilidad implícita
    const variation = seededRand(bk.id + matchSeed) * 0.06 - 0.03;
    const impliedProb = Math.min(0.95, Math.max(0.05, (baseProb / 100) * (1 + variation)));
    // Aplicar margen de la casa
    const odds = parseFloat((1 / impliedProb * bk.payoutRate).toFixed(2));
    result[bk.id] = Math.max(1.01, odds);
  }

  return result;
}

/** Devuelve la mejor cuota (más alta) de todas las casas */
export function bestOdds(perBookmaker: Record<string, number>): number {
  return Math.max(...Object.values(perBookmaker));
}

/** Bookmaker con la mejor cuota */
export function bestBookmaker(perBookmaker: Record<string, number>): string {
  return Object.entries(perBookmaker).reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

// ── Estructura de cuotas por mercado ──────────────────────────────────────
export interface MarketBookmakerOdds {
  /** cuotas por casa: { bet365: 1.85, williamhill: 1.80, ... } */
  perBookmaker: Record<string, number>;
  best: number;
  bestBookmakerId: string;
  /** true = cuotas en tiempo real, false = estimadas del modelo */
  isRealtime: boolean;
}

export interface MatchBookmakerOdds {
  result: {
    home:  MarketBookmakerOdds;
    draw:  MarketBookmakerOdds;
    away:  MarketBookmakerOdds;
  };
  over25:    MarketBookmakerOdds;
  under25:   MarketBookmakerOdds;
  bttsYes:   MarketBookmakerOdds;
  bttsNo:    MarketBookmakerOdds;
  handicap:  MarketBookmakerOdds;
}

// ── Odds API response helpers ─────────────────────────────────────────────
interface OddsApiOutcome { name: string; price: number }
interface OddsApiBookmaker {
  key: string;
  markets: Array<{ key: string; outcomes: OddsApiOutcome[] }>;
}
interface OddsApiEvent {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

function normTeamName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function oddsApiToBookmakerMap(event: OddsApiEvent): Partial<MatchBookmakerOdds> | null {
  const bkMap: Record<string, OddsApiBookmaker> = {};
  for (const bk of event.bookmakers) bkMap[bk.key] = bk;

  function getMarket(
    bkId: string,
    oddsApiKey: string,
    outcomeName: string,
  ): number | null {
    const apiKey = bkId === 'betfair' ? 'betfair_ex_eu' : bkId;
    const bk = bkMap[apiKey];
    if (!bk) return null;
    const market = bk.markets.find(m => m.key === oddsApiKey);
    if (!market) return null;
    const outcome = market.outcomes.find(o => normTeamName(o.name) === normTeamName(outcomeName));
    return outcome?.price ?? null;
  }

  const homeTeam = event.home_team;
  const awayTeam = event.away_team;

  const result: Partial<MatchBookmakerOdds> = {};

  // 1X2
  const homeOdds: Record<string, number> = {};
  const drawOdds: Record<string, number> = {};
  const awayOdds: Record<string, number> = {};
  for (const bk of BOOKMAKERS) {
    const h = getMarket(bk.id, 'h2h', homeTeam);
    const d = getMarket(bk.id, 'h2h', 'Draw');
    const a = getMarket(bk.id, 'h2h', awayTeam);
    if (h) homeOdds[bk.id] = h;
    if (d) drawOdds[bk.id] = d;
    if (a) awayOdds[bk.id] = a;
  }

  if (Object.keys(homeOdds).length > 0) {
    result.result = {
      home: { perBookmaker: homeOdds, best: bestOdds(homeOdds), bestBookmakerId: bestBookmaker(homeOdds), isRealtime: true },
      draw: { perBookmaker: drawOdds, best: bestOdds(drawOdds), bestBookmakerId: bestBookmaker(drawOdds), isRealtime: true },
      away: { perBookmaker: awayOdds, best: bestOdds(awayOdds), bestBookmakerId: bestBookmaker(awayOdds), isRealtime: true },
    };
  }

  // Over/Under 2.5
  const over25Odds:  Record<string, number> = {};
  const under25Odds: Record<string, number> = {};
  for (const bk of BOOKMAKERS) {
    const ov = getMarket(bk.id, 'totals', 'Over');
    const un = getMarket(bk.id, 'totals', 'Under');
    if (ov) over25Odds[bk.id]  = ov;
    if (un) under25Odds[bk.id] = un;
  }
  if (Object.keys(over25Odds).length > 0) {
    result.over25  = { perBookmaker: over25Odds,  best: bestOdds(over25Odds),  bestBookmakerId: bestBookmaker(over25Odds),  isRealtime: true };
    result.under25 = { perBookmaker: under25Odds, best: bestOdds(under25Odds), bestBookmakerId: bestBookmaker(under25Odds), isRealtime: true };
  }

  // BTTS
  const bttsYesOdds: Record<string, number> = {};
  const bttsNoOdds:  Record<string, number> = {};
  for (const bk of BOOKMAKERS) {
    const yes = getMarket(bk.id, 'btts', 'Yes');
    const no  = getMarket(bk.id, 'btts', 'No');
    if (yes) bttsYesOdds[bk.id] = yes;
    if (no)  bttsNoOdds[bk.id]  = no;
  }
  if (Object.keys(bttsYesOdds).length > 0) {
    result.bttsYes = { perBookmaker: bttsYesOdds, best: bestOdds(bttsYesOdds), bestBookmakerId: bestBookmaker(bttsYesOdds), isRealtime: true };
    result.bttsNo  = { perBookmaker: bttsNoOdds,  best: bestOdds(bttsNoOdds),  bestBookmakerId: bestBookmaker(bttsNoOdds),  isRealtime: true };
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────
const CACHE: Map<string, { data: Partial<MatchBookmakerOdds>; at: number }> = new Map();
const CACHE_TTL = 5 * 60_000; // 5 min

/**
 * Obtiene cuotas por casa para un partido.
 * - Si hay ODDS_API_KEY: intenta cuotas en tiempo real, fallback a derivadas
 * - Si no hay key: cuotas estimadas derivadas del modelo
 */
export async function fetchBookmakerOdds(
  homeTeam:      string,
  awayTeam:      string,
  competitionId: number,
  sport:         string,
  markets:       { homeProb: number; drawProb: number; awayProb: number; over25Prob: number; bttsProb: number; handicapProb: number },
  matchId:       string,
): Promise<MatchBookmakerOdds> {

  // Cache key
  const cacheKey = `${matchId}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return buildFull(cached.data, markets, matchId);
  }

  let realtimeData: Partial<MatchBookmakerOdds> = {};

  // Try Odds API if key is configured
  if (ODDS_API_KEY) {
    try {
      const sportKey = sport === 'basketball' ? NBA_KEY : (SPORT_KEYS[competitionId] ?? '');
      if (sportKey) {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h,totals,btts&bookmakers=bet365,williamhill,betfair_ex_eu,bwin`;
        const res = await fetch(url);
        if (res.ok) {
          const events: OddsApiEvent[] = await res.json();
          const normHome = normTeamName(homeTeam);
          const normAway = normTeamName(awayTeam);
          const event = events.find(e =>
            normTeamName(e.home_team) === normHome &&
            normTeamName(e.away_team) === normAway
          );
          if (event) {
            const parsed = oddsApiToBookmakerMap(event);
            if (parsed) realtimeData = parsed;
          }
        }
      }
    } catch { /* fall back to derived */ }
  }

  CACHE.set(cacheKey, { data: realtimeData, at: Date.now() });
  return buildFull(realtimeData, markets, matchId);
}

/** Completa cuotas derivadas para los mercados que no tienen datos en tiempo real */
function buildFull(
  partial:  Partial<MatchBookmakerOdds>,
  markets:  { homeProb: number; drawProb: number; awayProb: number; over25Prob: number; bttsProb: number; handicapProb: number },
  matchId:  string,
): MatchBookmakerOdds {

  function derived(prob: number, key: string): MarketBookmakerOdds {
    const pb = deriveBookmakerOdds(prob, matchId + key);
    return { perBookmaker: pb, best: bestOdds(pb), bestBookmakerId: bestBookmaker(pb), isRealtime: false };
  }

  return {
    result: partial.result ?? {
      home: derived(markets.homeProb, 'home'),
      draw: derived(markets.drawProb, 'draw'),
      away: derived(markets.awayProb, 'away'),
    },
    over25:   partial.over25   ?? derived(markets.over25Prob,         'over25'),
    under25:  partial.under25  ?? derived(100 - markets.over25Prob,   'under25'),
    bttsYes:  partial.bttsYes  ?? derived(markets.bttsProb,           'bttsYes'),
    bttsNo:   partial.bttsNo   ?? derived(100 - markets.bttsProb,     'bttsNo'),
    handicap: partial.handicap ?? derived(markets.handicapProb,       'handicap'),
  };
}
