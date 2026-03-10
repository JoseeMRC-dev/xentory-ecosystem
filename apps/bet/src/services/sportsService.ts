import type { Match, TeamStats, FormMatch, Competition } from '../types';
import { SEASON, COMPETITIONS } from '../constants';

// ─────────────────────────────────────────────
// API-FOOTBALL (api-football.com)
// Free tier: 100 req/day — no credit card needed
// Sign up at: https://dashboard.api-football.com
// ─────────────────────────────────────────────
const API_KEY  = (import.meta as any).env?.VITE_API_FOOTBALL_KEY ?? '';
const API_BASE = 'https://v3.football.api-sports.io';

// ── In-memory cache to save free-tier quota ──
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

async function apiFetch(path: string): Promise<any> {
  if (!API_KEY) return null;
  const cached = cache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Check API error / quota exceeded
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.warn('[API-Football] Error:', json.errors);
      return null;
    }
    cache.set(path, { data: json, ts: Date.now() });
    return json;
  } catch (err) {
    console.warn('[API-Football] fetch failed:', err);
    return null;
  }
}

// ── Remaining quota check ──
export async function getApiStatus(): Promise<{ remaining: number; limit: number } | null> {
  const json = await apiFetch('/status');
  if (!json) return null;
  return {
    remaining: json.response?.requests?.current ?? 0,
    limit:     json.response?.requests?.limit_day ?? 100,
  };
}

// ── Fetch upcoming fixtures for a league ──
export async function fetchUpcomingMatches(leagueId: number, limit = 10): Promise<Match[]> {
  const json = await apiFetch(`/fixtures?league=${leagueId}&season=${SEASON}&next=${limit}&timezone=Europe/Madrid`);
  if (!json) return getMockMatches(leagueId, limit);
  const fixtures = json.response ?? [];
  if (fixtures.length === 0) return getMockMatches(leagueId, Math.min(limit, 3));
  return fixtures.map(mapFixtureToMatch);
}

// ── Fetch live fixtures ──
export async function fetchLiveMatches(leagueId?: number): Promise<Match[]> {
  const path = leagueId ? `/fixtures?live=all&league=${leagueId}` : '/fixtures?live=all';
  const json = await apiFetch(path);
  if (!json) return [];
  return (json.response ?? []).map(mapFixtureToMatch);
}

// ── Fetch recent results (last N) ──
export async function fetchRecentMatches(leagueId: number, limit = 5): Promise<Match[]> {
  const json = await apiFetch(`/fixtures?league=${leagueId}&season=${SEASON}&last=${limit}&timezone=Europe/Madrid`);
  if (!json) return [];
  return (json.response ?? []).map(mapFixtureToMatch);
}

// ── Fetch team statistics ──
export async function fetchTeamStats(teamId: number, leagueId: number): Promise<TeamStats | null> {
  const [statsJson, formJson] = await Promise.all([
    apiFetch(`/teams/statistics?team=${teamId}&league=${leagueId}&season=${SEASON}`),
    apiFetch(`/fixtures?team=${teamId}&league=${leagueId}&season=${SEASON}&last=5`),
  ]);
  if (!statsJson) return getMockTeamStats(teamId);
  return mapApiStatsToTeamStats(statsJson.response, formJson?.response ?? [], teamId);
}

// ── Fetch head-to-head ──
export async function fetchH2H(team1Id: number, team2Id: number): Promise<Match[]> {
  const json = await apiFetch(`/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=5`);
  if (!json) return [];
  return (json.response ?? []).map(mapFixtureToMatch);
}

// ── Search teams ──
export async function searchTeams(query: string): Promise<{ id: number; name: string; logo: string; country: string }[]> {
  const json = await apiFetch(`/teams?search=${encodeURIComponent(query)}`);
  if (!json) return [];
  return (json.response ?? []).map((t: any) => ({
    id:      t.team.id,
    name:    t.team.name,
    logo:    t.team.logo,
    country: t.team.country ?? '',
  }));
}

// ══════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════
function mapFixtureToMatch(f: any): Match {
  const comp = COMPETITIONS.find(c => c.id === f.league?.id) ?? {
    id:      f.league?.id ?? 0,
    name:    f.league?.name ?? 'Liga',
    sport:   'football' as const,
    country: f.league?.country ?? '',
    logo:    f.league?.logo ?? '',
    emoji:   '⚽',
  };
  return {
    id:        f.fixture.id,
    sport:     'football',
    competition: comp,
    homeTeam: {
      id:        f.teams.home.id,
      name:      f.teams.home.name,
      shortName: f.teams.home.name.slice(0, 3).toUpperCase(),
      logo:      f.teams.home.logo,
    },
    awayTeam: {
      id:        f.teams.away.id,
      name:      f.teams.away.name,
      shortName: f.teams.away.name.slice(0, 3).toUpperCase(),
      logo:      f.teams.away.logo,
    },
    date:       f.fixture.date,
    status:     mapStatus(f.fixture.status.short),
    homeScore:  f.goals.home   ?? undefined,
    awayScore:  f.goals.away   ?? undefined,
    venue:      f.fixture.venue?.name,
    round:      f.league?.round,
  };
}

function mapStatus(s: string): Match['status'] {
  if (['1H','2H','HT','ET','BT','P'].includes(s))     return 'live';
  if (['FT','AET','PEN'].includes(s))                  return 'finished';
  if (['PST','CANC','SUSP','ABD','AWD','WO'].includes(s)) return 'postponed';
  return 'scheduled';
}

function mapApiStatsToTeamStats(stats: any, fixtures: any[], teamId: number): TeamStats {
  const form: FormMatch[] = (fixtures ?? []).map((f: any) => {
    const isHome = f.teams.home.id === teamId;
    const gf = isHome ? f.goals.home : f.goals.away;
    const ga = isHome ? f.goals.away : f.goals.home;
    const homeWin = f.teams.home.winner;
    const awayWin = f.teams.away.winner;
    let result: FormMatch['result'] = 'D';
    if (isHome && homeWin)   result = 'W';
    else if (!isHome && awayWin) result = 'W';
    else if (isHome && awayWin)  result = 'L';
    else if (!isHome && homeWin) result = 'L';
    return {
      opponent:     isHome ? f.teams.away.name : f.teams.home.name,
      opponentLogo: isHome ? f.teams.away.logo : f.teams.home.logo,
      result,
      goalsFor:     gf ?? 0,
      goalsAgainst: ga ?? 0,
      date:         f.fixture.date,
      isHome,
    };
  });
  const gs = stats?.goals?.for?.average?.total   ?? '1.5';
  const gc = stats?.goals?.against?.average?.total ?? '1.2';
  return {
    team: {
      id:        teamId,
      name:      stats?.team?.name ?? 'Equipo',
      shortName: (stats?.team?.name ?? 'EQP').slice(0, 3).toUpperCase(),
      logo:      stats?.team?.logo,
    },
    form,
    goalsScored:   parseFloat(gs),
    goalsConceded: parseFloat(gc),
    cleanSheets:   stats?.clean_sheet?.total ?? 0,
    btts:          Math.round((1 - (stats?.failed_to_score?.percentage ?? '30%').replace('%','') / 100) * (1 - (stats?.clean_sheet?.percentage ?? '30%').replace('%','') / 100) * 100),
    over25:        Math.round(parseFloat(gs) * 28),
    possession:    stats?.ball_possession ? parseInt(stats.ball_possession) : undefined,
    shotsOnTarget: stats?.shots?.on?.total ?? undefined,
    homeRecord:    { w: stats?.fixtures?.wins?.home ?? 5, d: stats?.fixtures?.draws?.home ?? 2, l: stats?.fixtures?.loses?.home ?? 2 },
    awayRecord:    { w: stats?.fixtures?.wins?.away ?? 3, d: stats?.fixtures?.draws?.away ?? 3, l: stats?.fixtures?.loses?.away ?? 3 },
  };
}

// ══════════════════════════════════════
// MOCK DATA — full fallback sin API key
// ══════════════════════════════════════
const MOCK_TEAMS = [
  { id: 541,  name: 'Real Madrid',        shortName: 'RMA' },
  { id: 529,  name: 'FC Barcelona',       shortName: 'BAR' },
  { id: 50,   name: 'Manchester City',    shortName: 'MCI' },
  { id: 42,   name: 'Arsenal',            shortName: 'ARS' },
  { id: 157,  name: 'Bayern Munich',      shortName: 'BAY' },
  { id: 85,   name: 'Paris Saint-Germain',shortName: 'PSG' },
  { id: 530,  name: 'Atlético Madrid',    shortName: 'ATL' },
  { id: 40,   name: 'Liverpool',          shortName: 'LIV' },
  { id: 505,  name: 'Inter Milan',        shortName: 'INT' },
  { id: 165,  name: 'Borussia Dortmund',  shortName: 'BVB' },
  { id: 489,  name: 'AC Milan',           shortName: 'MIL' },
  { id: 33,   name: 'Manchester United',  shortName: 'MUN' },
];

const MOCK_COMP_MAP: Record<number, Competition> = {
  2:   { id: 2,   name: 'Champions League', sport: 'football', country: 'Europa',     logo: '', emoji: '🏆' },
  3:   { id: 3,   name: 'Europa League',    sport: 'football', country: 'Europa',     logo: '', emoji: '🟠' },
  140: { id: 140, name: 'La Liga',          sport: 'football', country: 'España',     logo: '', emoji: '🇪🇸' },
  39:  { id: 39,  name: 'Premier League',   sport: 'football', country: 'Inglaterra', logo: '', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  135: { id: 135, name: 'Serie A',          sport: 'football', country: 'Italia',     logo: '', emoji: '🇮🇹' },
  78:  { id: 78,  name: 'Bundesliga',       sport: 'football', country: 'Alemania',   logo: '', emoji: '🇩🇪' },
  61:  { id: 61,  name: 'Ligue 1',          sport: 'football', country: 'Francia',    logo: '', emoji: '🇫🇷' },
  141: { id: 141, name: 'Segunda División', sport: 'football', country: 'España',     logo: '', emoji: '🇪🇸' },
};

function getMockMatches(leagueId: number, limit: number): Match[] {
  const comp = MOCK_COMP_MAP[leagueId] ?? MOCK_COMP_MAP[2];
  const teams = [...MOCK_TEAMS].sort(() => Math.random() - 0.5);
  const now = Date.now();
  return Array.from({ length: Math.min(limit, 4) }, (_, i) => {
    const home = teams[i * 2 % teams.length];
    const away = teams[(i * 2 + 1) % teams.length];
    return {
      id:          10000 + leagueId * 10 + i,
      sport:       'football' as const,
      competition: comp,
      homeTeam:    { id: home.id, name: home.name, shortName: home.shortName },
      awayTeam:    { id: away.id, name: away.name, shortName: away.shortName },
      date:        new Date(now + (i + 1) * 2 * 86400000).toISOString(),
      status:      'scheduled' as const,
      round:       `Jornada ${28 + i}`,
      venue:       `Estadio ${home.name}`,
    };
  });
}

function getMockTeamStats(teamId: number): TeamStats {
  const team = MOCK_TEAMS.find(t => t.id === teamId) ?? MOCK_TEAMS[0];
  const results: FormMatch['result'][] = ['W', 'W', 'D', 'W', 'L'];
  const opponents = MOCK_TEAMS.filter(t => t.id !== teamId).slice(0, 5);
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({
    opponent:     opponents[i]?.name ?? 'Rival',
    result,
    goalsFor:     result === 'W' ? 2 + Math.floor(Math.random() * 2) : result === 'D' ? 1 : Math.floor(Math.random() * 2),
    goalsAgainst: result === 'L' ? 2 + Math.floor(Math.random() * 2) : result === 'D' ? 1 : Math.floor(Math.random() * 2),
    date:         new Date(now - (i + 1) * 7 * 86400000).toISOString(),
    isHome:       i % 2 === 0,
  }));
  return {
    team:          { id: team.id, name: team.name, shortName: team.shortName },
    form,
    goalsScored:   1.8 + Math.random() * 0.8,
    goalsConceded: 0.9 + Math.random() * 0.6,
    cleanSheets:   8 + Math.floor(Math.random() * 6),
    btts:          45 + Math.floor(Math.random() * 25),
    over25:        55 + Math.floor(Math.random() * 25),
    possession:    50 + Math.floor(Math.random() * 20) - 10,
    shotsOnTarget: 5 + Math.floor(Math.random() * 4),
    homeRecord:    { w: 7, d: 2, l: 1 },
    awayRecord:    { w: 5, d: 3, l: 2 },
  };
}

// ══════════════════════════════════════
// TENNIS API (api-sports.io v1)
// ══════════════════════════════════════
const TENNIS_BASE = 'https://v1.tennis.api-sports.io';

async function callTennisAPI(endpoint: string) {
  if (!API_KEY) { console.warn('[Tennis API] No API key found'); return null; }
  try {
    const res = await fetch(`${TENNIS_BASE}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    if (!res.ok) { console.warn('[Tennis API] HTTP error:', res.status, res.statusText); return null; }
    const data = await res.json();
    if (data?.errors && Object.keys(data.errors).length > 0) {
      console.warn('[Tennis API] API error:', data.errors);
      return null;
    }
    console.info('[Tennis API] OK — results:', data?.results ?? 0);
    return data?.response ?? null;
  } catch (e) {
    console.warn('[Tennis API] Fetch failed:', e);
    return null;
  }
}

function formatPlayerName(name: string): string {
  // "Carlos Alcaraz" → "C. Alcaraz"
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export async function fetchTennisMatches(): Promise<Match[]> {
  // Get today and next 7 days
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const raw = await callTennisAPI(`/games?date=${todayStr}`);
  const raw2 = await callTennisAPI(`/games?date=${nextWeekStr}`);

  const combined = [...(raw ?? []), ...(raw2 ?? [])];
  if (!combined.length) return getMockMatchesBySport('tennis');

  const matches: Match[] = combined
    .filter((g: any) => g?.status?.short === 'NS') // NS = Not Started
    .slice(0, 12)
    .map((g: any, idx: number) => {
      const homePlayer = g.players?.home?.name ?? 'Jugador 1';
      const awayPlayer = g.players?.away?.name ?? 'Jugador 2';
      const tournament = g.tournament?.name ?? 'Torneo ATP/WTA';
      const country = g.country?.name ?? 'Internacional';
      const isWTA = tournament.toLowerCase().includes('wta') || tournament.toLowerCase().includes('women');
      return {
        id: g.id ?? 30000 + idx,
        sport: 'tennis' as const,
        competition: {
          id:      g.tournament?.id ?? idx,
          name:    tournament,
          sport:   'tennis',
          country,
          logo:    '',
          emoji:   '🎾',
        },
        homeTeam: {
          id:        g.players?.home?.id ?? 20000 + idx * 2,
          name:      formatPlayerName(homePlayer),
          shortName: homePlayer.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3),
        },
        awayTeam: {
          id:        g.players?.away?.id ?? 20001 + idx * 2,
          name:      formatPlayerName(awayPlayer),
          shortName: awayPlayer.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3),
        },
        date:   g.date ?? new Date(Date.now() + 86400000).toISOString(),
        status: 'scheduled',
        venue:  g.venue ?? tournament,
      };
    });

  return matches.length > 0 ? matches : getMockMatchesBySport('tennis');
}


// ══════════════════════════════════════
// BASKETBALL API (api-sports.io v1)
// ══════════════════════════════════════
async function callSportsAPI(base: string, endpoint: string) {
  if (!API_KEY) { console.warn('[Sports API] No API key:', base); return null; }
  const cacheKey = base + endpoint;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const res = await fetch(`${base}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    if (!res.ok) { console.warn('[Sports API] HTTP error:', res.status, base + endpoint); return null; }
    const data = await res.json();
    if (data?.errors && Object.keys(data.errors).length > 0) {
      console.warn('[Sports API] API error:', data.errors, base + endpoint);
      return null;
    }
    const result = data?.response ?? null;
    console.info('[Sports API] OK —', base.split('/')[2], '— results:', data?.results ?? 0);
    if (result) cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (e) {
    console.warn('[Sports API] Fetch failed:', e, base + endpoint);
    return null;
  }
}

export async function fetchBasketballMatches(): Promise<Match[]> {
  const today = new Date().toISOString().split('T')[0];
  const raw = await callSportsAPI('https://v1.basketball.api-sports.io', `/games?date=${today}&league=12&season=2024-2025`);
  if (!raw || !raw.length) return getMockMatchesBySport('basketball');

  const matches: Match[] = raw
    .filter((g: any) => g?.status?.short === 'NS')
    .slice(0, 12)
    .map((g: any, idx: number) => ({
      id: g.id ?? 20000 + idx,
      sport: 'basketball' as const,
      competition: {
        id: g.league?.id ?? 12,
        name: g.league?.name ?? 'NBA',
        sport: 'basketball',
        country: g.country?.name ?? 'USA',
        logo: g.league?.logo ?? '',
        emoji: '🏀',
      },
      homeTeam: { id: g.teams?.home?.id ?? idx * 2, name: g.teams?.home?.name ?? 'Home', shortName: (g.teams?.home?.name ?? 'HOM').substring(0, 3).toUpperCase() },
      awayTeam: { id: g.teams?.away?.id ?? idx * 2 + 1, name: g.teams?.away?.name ?? 'Away', shortName: (g.teams?.away?.name ?? 'AWY').substring(0, 3).toUpperCase() },
      date: g.date ?? new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled',
      venue: g.arena?.name ?? g.league?.name,
    }));

  return matches.length > 0 ? matches : getMockMatchesBySport('basketball');
}

export async function fetchF1Matches(): Promise<Match[]> {
  const season = new Date().getFullYear();
  const raw = await callSportsAPI('https://v1.formula-1.api-sports.io', `/races?season=${season}`);
  if (!raw || !raw.length) return getMockMatchesBySport('f1');

  const upcoming = raw
    .filter((r: any) => r?.status === 'Scheduled')
    .slice(0, 6);

  if (!upcoming.length) return getMockMatchesBySport('f1');

  const matches: Match[] = upcoming.map((r: any, idx: number) => ({
    id: r.id ?? 40000 + idx,
    sport: 'f1' as const,
    competition: {
      id: r.competition?.id ?? 50,
      name: `Formula 1 ${season}`,
      sport: 'f1',
      country: 'Mundial',
      logo: '',
      emoji: '🏎️',
    },
    homeTeam: { id: 300 + idx * 2,     name: r.circuit?.name ?? `GP ${r.competition?.location?.country ?? ''}`, shortName: 'GP' },
    awayTeam: { id: 300 + idx * 2 + 1, name: r.competition?.location?.city ?? r.competition?.name ?? 'Grand Prix', shortName: 'F1' },
    date: r.date ?? new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
    status: 'scheduled',
    venue: r.circuit?.name ?? '',
  }));

  return matches.length > 0 ? matches : getMockMatchesBySport('f1');
}


export function getMockMatchesBySport(sport: string): Match[] {
  const now = Date.now();
  const d = (days: number) => new Date(now + days * 86400000).toISOString();

  if (sport === 'tennis') return [
    { id: 3001, sport: 'tennis', competition: { id: 1, name: 'ATP Madrid Open', sport: 'tennis', country: 'Spain', logo: '', emoji: '🎾' }, homeTeam: { id: 201, name: 'C. Alcaraz', shortName: 'ALC' }, awayTeam: { id: 202, name: 'J. Sinner', shortName: 'SIN' }, date: d(1), status: 'scheduled', venue: 'Caja Mágica, Madrid' },
    { id: 3002, sport: 'tennis', competition: { id: 1, name: 'ATP Madrid Open', sport: 'tennis', country: 'Spain', logo: '', emoji: '🎾' }, homeTeam: { id: 203, name: 'N. Djokovic', shortName: 'DJO' }, awayTeam: { id: 204, name: 'D. Medvedev', shortName: 'MED' }, date: d(1), status: 'scheduled', venue: 'Caja Mágica, Madrid' },
    { id: 3003, sport: 'tennis', competition: { id: 2, name: 'WTA Madrid Open', sport: 'tennis', country: 'Spain', logo: '', emoji: '🎾' }, homeTeam: { id: 205, name: 'I. Swiatek', shortName: 'SWI' }, awayTeam: { id: 206, name: 'A. Sabalenka', shortName: 'SAB' }, date: d(2), status: 'scheduled', venue: 'Caja Mágica, Madrid' },
    { id: 3004, sport: 'tennis', competition: { id: 1, name: 'ATP Madrid Open', sport: 'tennis', country: 'Spain', logo: '', emoji: '🎾' }, homeTeam: { id: 207, name: 'A. Zverev', shortName: 'ZVE' }, awayTeam: { id: 208, name: 'H. Hurkacz', shortName: 'HUR' }, date: d(2), status: 'scheduled', venue: 'Caja Mágica, Madrid' },
  ];

  if (sport === 'basketball') return [
    { id: 2001, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 101, name: 'Oklahoma City Thunder', shortName: 'OKC' }, awayTeam: { id: 102, name: 'Cleveland Cavaliers', shortName: 'CLE' }, date: d(1), status: 'scheduled', venue: 'Paycom Center' },
    { id: 2002, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 103, name: 'Boston Celtics', shortName: 'BOS' }, awayTeam: { id: 104, name: 'Golden State Warriors', shortName: 'GSW' }, date: d(1), status: 'scheduled', venue: 'TD Garden' },
    { id: 2003, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 105, name: 'Denver Nuggets', shortName: 'DEN' }, awayTeam: { id: 106, name: 'Minnesota Timberwolves', shortName: 'MIN' }, date: d(1), status: 'scheduled', venue: 'Ball Arena' },
    { id: 2004, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 107, name: 'LA Lakers', shortName: 'LAL' }, awayTeam: { id: 108, name: 'Memphis Grizzlies', shortName: 'MEM' }, date: d(2), status: 'scheduled', venue: 'Crypto.com Arena' },
  ];

  if (sport === 'f1') return [
    { id: 4001, sport: 'f1', competition: { id: 1, name: 'Formula 1', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 401, name: 'M. Verstappen', shortName: 'VER' }, awayTeam: { id: 402, name: 'L. Hamilton', shortName: 'HAM' }, date: d(3), status: 'scheduled', venue: 'Circuit de Barcelona-Catalunya' },
    { id: 4002, sport: 'f1', competition: { id: 1, name: 'Formula 1', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 403, name: 'C. Leclerc', shortName: 'LEC' }, awayTeam: { id: 404, name: 'L. Norris', shortName: 'NOR' }, date: d(3), status: 'scheduled', venue: 'Circuit de Barcelona-Catalunya' },
    { id: 4003, sport: 'f1', competition: { id: 1, name: 'Formula 1', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 405, name: 'G. Russell', shortName: 'RUS' }, awayTeam: { id: 406, name: 'O. Piastri', shortName: 'PIA' }, date: d(3), status: 'scheduled', venue: 'Circuit de Barcelona-Catalunya' },
  ];

  if (sport === 'golf') return [
    { id: 5001, sport: 'golf', competition: { id: 1, name: 'PGA Tour', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 501, name: 'S. Scheffler', shortName: 'SCH' }, awayTeam: { id: 502, name: 'R. McIlroy', shortName: 'MCI' }, date: d(4), status: 'scheduled', venue: 'Augusta National' },
    { id: 5002, sport: 'golf', competition: { id: 1, name: 'PGA Tour', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 503, name: 'X. Schauffele', shortName: 'XSC' }, awayTeam: { id: 504, name: 'C. Young', shortName: 'YOU' }, date: d(4), status: 'scheduled', venue: 'Augusta National' },
  ];

  return getMockMatches(2, 5);
}

// SEASON is imported from constants

// ══════════════════════════════════════
// STATS MOCK POR DEPORTE (no-fútbol)
// ══════════════════════════════════════
export function getMockStatsBySport(
  teamId: number,
  teamName: string,
  sport: string
): TeamStats {
  const shortName = teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);

  // Resultados genéricos adaptados al deporte
  const results: FormMatch['result'][] = ['W', 'W', 'L', 'W', 'W'];
  const opponents: string[] = sport === 'tennis'
    ? ['Medvedev', 'Zverev', 'Rublev', 'Fritz', 'Tsitsipas']
    : sport === 'basketball'
    ? ['Lakers', 'Celtics', 'Heat', 'Nuggets', 'Bucks']
    : sport === 'f1'
    ? ['Verstappen', 'Hamilton', 'Leclerc', 'Norris', 'Sainz']
    : ['Opponent A', 'Opponent B', 'Opponent C', 'Opponent D', 'Opponent E'];

  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({
    opponent:     opponents[i] ?? 'Rival',
    result,
    goalsFor:     result === 'W' ? 2 : 1,
    goalsAgainst: result === 'L' ? 2 : 1,
    date:         new Date(now - (i + 1) * 7 * 86400000).toISOString(),
    isHome:       i % 2 === 0,
  }));

  // Métricas adaptadas por deporte
  const scored   = sport === 'basketball' ? 108 + Math.random() * 10 : 1.8 + Math.random() * 0.8;
  const conceded = sport === 'basketball' ? 102 + Math.random() * 10 : 1.2 + Math.random() * 0.6;

  return {
    team: { id: teamId, name: teamName, shortName },
    form,
    goalsScored:   scored,
    goalsConceded: conceded,
    cleanSheets:   sport === 'football' ? 5 : 0,
    btts:          50,
    over25:        55,
    possession:    undefined,
    shotsOnTarget: undefined,
    homeRecord:    { w: 8, d: 0, l: 2 },
    awayRecord:    { w: 6, d: 0, l: 4 },
  };
}
