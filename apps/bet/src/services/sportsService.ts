import type { Match, TeamStats, FormMatch, Competition } from '../types';
import { SEASON, COMPETITIONS } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// PROXY — all API calls go through Supabase Edge Function to avoid CORS
// ─────────────────────────────────────────────────────────────────────────────
const PROXY = 'https://mtgatdmrpfysqphdgaue.supabase.co/functions/v1/sports-proxy';
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

async function proxyFetch(sport: string, path: string): Promise<any> {
  const cacheKey = `${sport}${path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  const url = `${PROXY}?sport=${sport}&path=${encodeURIComponent(path)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[Sports API] ${sport} ${path} → HTTP ${res.status}`); return null; }
    const json = await res.json();
    if (json?.error) { console.warn('[Sports API] proxy error:', json.error); return null; }
    if (json?.errors && Object.keys(json.errors).length > 0) { console.warn('[Sports API] error:', json.errors); return null; }
    console.info(`[Sports API] ✅ ${sport} ${path} → ${json?.results ?? 0} results`);
    cache.set(cacheKey, { data: json, ts: Date.now() });
    return json;
  } catch (err) {
    console.warn(`[Sports API] fetch failed (${sport}):`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTBALL
// ─────────────────────────────────────────────────────────────────────────────
export async function getApiStatus() {
  const json = await proxyFetch('football', '/status');
  if (!json) return null;
  return { remaining: json.response?.requests?.current ?? 0, limit: json.response?.requests?.limit_day ?? 100 };
}

export async function fetchUpcomingMatches(leagueId: number, limit = 10): Promise<Match[]> {
  const allMatches: Match[] = [];
  for (let day = 0; day <= 14 && allMatches.length < limit; day++) {
    const date = new Date(Date.now() + day * 86400000).toISOString().split('T')[0];
    const json = await proxyFetch('football', `/fixtures?date=${date}&league=${leagueId}&season=${SEASON}`);
    if (!json) continue;
    const fixtures = (json.response ?? []).filter((f: any) => f.fixture?.status?.short === 'NS' || f.fixture?.status?.short === 'TBD');
    allMatches.push(...fixtures.map(mapFixtureToMatch));
  }
  return allMatches.slice(0, limit);
}

export async function fetchLiveMatches(leagueId?: number): Promise<Match[]> {
  const path = leagueId ? `/fixtures?live=all&league=${leagueId}` : '/fixtures?live=all';
  const json = await proxyFetch('football', path);
  if (!json) return [];
  return (json.response ?? []).map(mapFixtureToMatch);
}

export async function fetchRecentMatches(leagueId: number, limit = 5): Promise<Match[]> {
  const allMatches: Match[] = [];
  for (let day = 0; day <= 7 && allMatches.length < limit; day++) {
    const date = new Date(Date.now() - day * 86400000).toISOString().split('T')[0];
    const json = await proxyFetch('football', `/fixtures?date=${date}&league=${leagueId}&season=${SEASON}`);
    if (!json) continue;
    const fixtures = (json.response ?? []).filter((f: any) => f.fixture?.status?.short === 'FT' || f.fixture?.status?.short === 'AET');
    allMatches.push(...fixtures.map(mapFixtureToMatch));
  }
  return allMatches.slice(0, limit);
}

export async function fetchTeamStats(teamId: number, leagueId: number): Promise<TeamStats | null> {
  const [statsJson, formJson] = await Promise.all([
    proxyFetch('football', `/teams/statistics?team=${teamId}&league=${leagueId}&season=${SEASON}`),
    proxyFetch('football', `/fixtures?team=${teamId}&league=${leagueId}&season=${SEASON}&date=${new Date().toISOString().split('T')[0]}`),
  ]);
  if (!statsJson) return getMockTeamStats(teamId);
  return mapApiStatsToTeamStats(statsJson.response, formJson?.response ?? [], teamId);
}

export async function fetchH2H(team1Id: number, team2Id: number): Promise<Match[]> {
  const json = await proxyFetch('football', `/fixtures/headtohead?h2h=${team1Id}-${team2Id}`);
  if (!json) return [];
  return (json.response ?? []).slice(0, 5).map(mapFixtureToMatch);
}

export async function searchTeams(query: string) {
  const json = await proxyFetch('football', `/teams?search=${encodeURIComponent(query)}`);
  if (!json) return [];
  return (json.response ?? []).map((t: any) => ({ id: t.team.id, name: t.team.name, logo: t.team.logo, country: t.team.country ?? '' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TENNIS
// ─────────────────────────────────────────────────────────────────────────────
function formatPlayerName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export async function fetchTennisMatches(): Promise<Match[]> {
  const allMatches: Match[] = [];
  for (let day = 0; day <= 3 && allMatches.length < 12; day++) {
    const date = new Date(Date.now() + day * 86400000).toISOString().split('T')[0];
    const json = await proxyFetch('tennis', `/games?date=${date}`);
    if (!json) continue;
    const scheduled = (json.response ?? []).filter((g: any) => g?.status?.short === 'NS');
    allMatches.push(...scheduled.map((g: any, idx: number) => ({
      id: g.id ?? 30000 + idx,
      sport: 'tennis' as const,
      competition: { id: g.tournament?.id ?? idx, name: g.tournament?.name ?? 'ATP/WTA Tour', sport: 'tennis' as const, country: g.country?.name ?? 'International', logo: '', emoji: '🎾' },
      homeTeam: { id: g.players?.home?.id ?? 20000 + idx * 2, name: formatPlayerName(g.players?.home?.name ?? 'Player 1'), shortName: (g.players?.home?.name ?? 'P1').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3) },
      awayTeam: { id: g.players?.away?.id ?? 20001 + idx * 2, name: formatPlayerName(g.players?.away?.name ?? 'Player 2'), shortName: (g.players?.away?.name ?? 'P2').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3) },
      date: g.date ?? new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled' as const,
      venue: g.venue ?? g.tournament?.name,
    })));
  }
  return allMatches;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN API — direct fetch, no key needed, no CORS issues
// ─────────────────────────────────────────────────────────────────────────────
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const espnCache = new Map<string, { data: any; ts: number }>();

async function espnFetch(path: string): Promise<any> {
  const cached = espnCache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const res = await fetch(`${ESPN_BASE}${path}`);
    if (!res.ok) { console.warn(`[ESPN] ${path} → HTTP ${res.status}`); return null; }
    const json = await res.json();
    espnCache.set(path, { data: json, ts: Date.now() });
    console.info(`[ESPN] ✅ ${path}`);
    return json;
  } catch (err) {
    console.warn(`[ESPN] fetch failed:`, err);
    return null;
  }
}

function mapEspnStatus(s: string): Match['status'] {
  if (s === 'in') return 'live';
  if (s === 'post') return 'finished';
  return 'scheduled';
}

// ─────────────────────────────────────────────────────────────────────────────
// BASKETBALL — ESPN (NBA + WNBA + NCB)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchBasketballMatches(): Promise<Match[]> {
  const results: Match[] = [];

  // NBA scoreboard (upcoming + live + recent)
  const leagues = [
    { path: '/basketball/nba/scoreboard', name: 'NBA', emoji: '🏀', country: 'USA' },
    { path: '/basketball/mens-college-basketball/scoreboard', name: 'NCAA', emoji: '🎓', country: 'USA' },
  ];

  for (const league of leagues) {
    const json = await espnFetch(league.path);
    if (!json) continue;
    const events: any[] = json.events ?? [];
    for (const ev of events.slice(0, 8)) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
      results.push({
        id: parseInt(ev.id) + 20000,
        sport: 'basketball',
        competition: { id: league.name === 'NBA' ? 12 : 100, name: league.name, sport: 'basketball', country: league.country, logo: '', emoji: league.emoji },
        homeTeam: { id: parseInt(home.team?.id ?? '0'), name: home.team?.displayName ?? 'Home', shortName: home.team?.abbreviation ?? 'HOM', logo: home.team?.logo },
        awayTeam: { id: parseInt(away.team?.id ?? '0'), name: away.team?.displayName ?? 'Away', shortName: away.team?.abbreviation ?? 'AWY', logo: away.team?.logo },
        date: ev.date ?? new Date().toISOString(),
        status,
        homeScore: status !== 'scheduled' ? parseInt(home.score ?? '0') : undefined,
        awayScore: status !== 'scheduled' ? parseInt(away.score ?? '0') : undefined,
        venue: comp.venue?.fullName,
      });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA 1 — ESPN
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchF1Matches(): Promise<Match[]> {
  const json = await espnFetch('/racing/f1/scoreboard');
  if (!json) return [];
  const events: any[] = json.events ?? [];
  const season = new Date().getFullYear();
  return events.slice(0, 10).map((ev: any, idx: number) => {
    const comp = ev.competitions?.[0];
    const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
    return {
      id: parseInt(ev.id ?? String(40000 + idx)),
      sport: 'f1' as const,
      competition: { id: 50, name: `Formula 1 ${season}`, sport: 'f1' as const, country: 'Global', logo: '', emoji: '🏎️' },
      homeTeam: { id: 300 + idx * 2, name: ev.name ?? ev.shortName ?? `Gran Premio`, shortName: ev.shortName?.substring(0, 6) ?? 'GP' },
      awayTeam: { id: 300 + idx * 2 + 1, name: comp?.venue?.fullName ?? 'Circuito', shortName: 'F1' },
      date: ev.date ?? new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
      status,
      venue: comp?.venue?.fullName ?? ev.name,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GOLF — ESPN
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchGolfMatches(): Promise<Match[]> {
  const json = await espnFetch('/golf/pga/scoreboard');
  if (!json) return [];
  const events: any[] = json.events ?? [];
  return events.slice(0, 8).map((ev: any, idx: number) => {
    const comp = ev.competitions?.[0];
    const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
    // Golf: competitors are individual players
    const players: any[] = comp?.competitors ?? [];
    const p1 = players[0];
    const p2 = players[1];
    return {
      id: parseInt(ev.id ?? String(50000 + idx)),
      sport: 'golf' as const,
      competition: { id: 200 + idx, name: ev.name ?? 'PGA Tour', sport: 'golf' as const, country: 'USA', logo: '', emoji: '⛳' },
      homeTeam: { id: 500 + idx * 2, name: p1?.athlete?.displayName ?? p1?.team?.displayName ?? ev.name ?? 'Player 1', shortName: p1?.athlete?.shortName ?? 'P1' },
      awayTeam: { id: 500 + idx * 2 + 1, name: p2?.athlete?.displayName ?? p2?.team?.displayName ?? 'Field', shortName: p2?.athlete?.shortName ?? 'FLD' },
      date: ev.date ?? new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
      status,
      venue: comp?.venue?.fullName ?? ev.name,
      round: ev.status?.type?.shortDetail,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS
// ─────────────────────────────────────────────────────────────────────────────
function mapFixtureToMatch(f: any): Match {
  const comp = COMPETITIONS.find(c => c.id === f.league?.id) ?? {
    id: f.league?.id ?? 0, name: f.league?.name ?? 'Unknown League',
    sport: 'football' as const, country: f.league?.country ?? '', logo: f.league?.logo ?? '', emoji: '⚽',
  };
  return {
    id: f.fixture.id, sport: 'football', competition: comp,
    homeTeam: { id: f.teams.home.id, name: f.teams.home.name, shortName: f.teams.home.name.slice(0, 3).toUpperCase(), logo: f.teams.home.logo },
    awayTeam: { id: f.teams.away.id, name: f.teams.away.name, shortName: f.teams.away.name.slice(0, 3).toUpperCase(), logo: f.teams.away.logo },
    date: f.fixture.date, status: mapStatus(f.fixture.status.short),
    homeScore: f.goals.home ?? undefined, awayScore: f.goals.away ?? undefined,
    venue: f.fixture.venue?.name, round: f.league?.round,
  };
}

function mapStatus(s: string): Match['status'] {
  if (['1H','2H','HT','ET','BT','P'].includes(s)) return 'live';
  if (['FT','AET','PEN'].includes(s)) return 'finished';
  if (['PST','CANC','SUSP','ABD','AWD','WO'].includes(s)) return 'postponed';
  return 'scheduled';
}

function mapApiStatsToTeamStats(stats: any, fixtures: any[], teamId: number): TeamStats {
  const form: FormMatch[] = (fixtures ?? []).map((f: any) => {
    const isHome = f.teams.home.id === teamId;
    const gf = isHome ? f.goals.home : f.goals.away;
    const ga = isHome ? f.goals.away : f.goals.home;
    let result: FormMatch['result'] = 'D';
    if (isHome && f.teams.home.winner) result = 'W';
    else if (!isHome && f.teams.away.winner) result = 'W';
    else if (isHome && f.teams.away.winner) result = 'L';
    else if (!isHome && f.teams.home.winner) result = 'L';
    return { opponent: isHome ? f.teams.away.name : f.teams.home.name, opponentLogo: isHome ? f.teams.away.logo : f.teams.home.logo, result, goalsFor: gf ?? 0, goalsAgainst: ga ?? 0, date: f.fixture.date, isHome };
  });
  const gs = stats?.goals?.for?.average?.total ?? '1.5';
  const gc = stats?.goals?.against?.average?.total ?? '1.2';
  return {
    team: { id: teamId, name: stats?.team?.name ?? 'Team', shortName: (stats?.team?.name ?? 'TEM').slice(0, 3).toUpperCase(), logo: stats?.team?.logo },
    form, goalsScored: parseFloat(gs), goalsConceded: parseFloat(gc),
    cleanSheets: stats?.clean_sheet?.total ?? 0, btts: 48, over25: Math.round(parseFloat(gs) * 28),
    possession: stats?.ball_possession ? parseInt(stats.ball_possession) : undefined,
    shotsOnTarget: stats?.shots?.on?.total ?? undefined,
    homeRecord: { w: stats?.fixtures?.wins?.home ?? 5, d: stats?.fixtures?.draws?.home ?? 2, l: stats?.fixtures?.loses?.home ?? 2 },
    awayRecord: { w: stats?.fixtures?.wins?.away ?? 3, d: stats?.fixtures?.draws?.away ?? 3, l: stats?.fixtures?.loses?.away ?? 3 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — real upcoming fixtures (2026 season)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_COMP_MAP: Record<number, Competition> = {
  2:   { id: 2,   name: 'UEFA Champions League', sport: 'football', country: 'Europe',  logo: '', emoji: '🏆' },
  3:   { id: 3,   name: 'UEFA Europa League',    sport: 'football', country: 'Europe',  logo: '', emoji: '🟠' },
  140: { id: 140, name: 'LaLiga',                sport: 'football', country: 'Spain',   logo: '', emoji: '🇪🇸' },
  39:  { id: 39,  name: 'Premier League',        sport: 'football', country: 'England', logo: '', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  135: { id: 135, name: 'Serie A',               sport: 'football', country: 'Italy',   logo: '', emoji: '🇮🇹' },
  78:  { id: 78,  name: 'Bundesliga',            sport: 'football', country: 'Germany', logo: '', emoji: '🇩🇪' },
  61:  { id: 61,  name: 'Ligue 1',               sport: 'football', country: 'France',  logo: '', emoji: '🇫🇷' },
};

const MOCK_FIXTURES: Record<number, { home: string; away: string; date: string; round: string }[]> = {
  2: [
    { home: 'Bayer Leverkusen',  away: 'Arsenal',          date: '2026-03-11T17:45:00+00:00', round: 'Round of 16' },
    { home: 'Real Madrid',       away: 'Manchester City',  date: '2026-03-11T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Paris Saint Germain',away: 'Chelsea',         date: '2026-03-11T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Bodo/Glimt',        away: 'Sporting CP',      date: '2026-03-11T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Arsenal',           away: 'Bayer Leverkusen', date: '2026-03-18T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Manchester City',   away: 'Real Madrid',      date: '2026-03-18T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Real Madrid',       away: 'Atlético Madrid',  date: '2026-04-08T20:00:00+01:00', round: 'Quarter-finals' },
    { home: 'Bayern Munich',     away: 'Inter Milan',      date: '2026-04-09T20:00:00+01:00', round: 'Quarter-finals' },
  ],
  140: [
    { home: 'Real Madrid',       away: 'Sevilla',          date: '2026-03-15T21:00:00+01:00', round: 'Jornada 28' },
    { home: 'Barcelona',         away: 'Atlético Madrid',  date: '2026-03-16T21:00:00+01:00', round: 'Jornada 28' },
    { home: 'Athletic Bilbao',   away: 'Valencia',         date: '2026-03-15T17:00:00+01:00', round: 'Jornada 28' },
    { home: 'Villarreal',        away: 'Real Sociedad',    date: '2026-03-16T18:30:00+01:00', round: 'Jornada 28' },
    { home: 'Atlético Madrid',   away: 'Real Madrid',      date: '2026-03-22T21:00:00+01:00', round: 'Jornada 29' },
  ],
  39: [
    { home: 'Arsenal',           away: 'Liverpool',        date: '2026-03-14T17:30:00+00:00', round: 'Matchweek 29' },
    { home: 'Manchester City',   away: 'Chelsea',          date: '2026-03-14T15:00:00+00:00', round: 'Matchweek 29' },
    { home: 'Tottenham',         away: 'Man United',       date: '2026-03-15T14:00:00+00:00', round: 'Matchweek 29' },
    { home: 'Newcastle',         away: 'Aston Villa',      date: '2026-03-15T16:30:00+00:00', round: 'Matchweek 29' },
  ],
  78: [
    { home: 'Bayern Munich',     away: 'Bayer Leverkusen', date: '2026-03-14T18:30:00+01:00', round: 'Spieltag 26' },
    { home: 'Dortmund',          away: 'RB Leipzig',       date: '2026-03-14T15:30:00+01:00', round: 'Spieltag 26' },
    { home: 'Bayer Leverkusen',  away: 'Bayern Munich',    date: '2026-03-21T18:30:00+01:00', round: 'Spieltag 27' },
  ],
  135: [
    { home: 'Inter Milan',       away: 'Juventus',         date: '2026-03-15T20:45:00+01:00', round: 'Giornata 29' },
    { home: 'Napoli',            away: 'AC Milan',         date: '2026-03-15T18:00:00+01:00', round: 'Giornata 29' },
    { home: 'Roma',              away: 'Lazio',            date: '2026-03-22T18:00:00+01:00', round: 'Giornata 30' },
  ],
  61: [
    { home: 'PSG',               away: 'Marseille',        date: '2026-03-15T21:00:00+01:00', round: 'Journée 27' },
    { home: 'Lyon',              away: 'Monaco',           date: '2026-03-15T17:00:00+01:00', round: 'Journée 27' },
  ],
};

function getMockMatches(leagueId: number, limit: number): Match[] {
  const comp = MOCK_COMP_MAP[leagueId] ?? MOCK_COMP_MAP[2];
  const fixtures = MOCK_FIXTURES[leagueId] ?? MOCK_FIXTURES[2];
  return fixtures.slice(0, Math.min(limit, fixtures.length)).map((f, i) => ({
    id: 10000 + leagueId * 10 + i, sport: 'football' as const, competition: comp,
    homeTeam: { id: 9000 + i * 2, name: f.home, shortName: f.home.substring(0, 3).toUpperCase() },
    awayTeam: { id: 9000 + i * 2 + 1, name: f.away, shortName: f.away.substring(0, 3).toUpperCase() },
    date: f.date, status: 'scheduled' as const, round: f.round, venue: `${f.home} Stadium`,
  }));
}

export function getMockMatchesBySport(sport: string): Match[] {
  const d = (days: number, h = 20, m = 0) => { const dt = new Date(); dt.setDate(dt.getDate() + days); dt.setHours(h, m, 0, 0); return dt.toISOString(); };

  if (sport === 'tennis') return [
    { id: 3001, sport: 'tennis', competition: { id: 1, name: 'ATP Indian Wells Masters', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 201, name: 'C. Alcaraz', shortName: 'ALC' }, awayTeam: { id: 202, name: 'J. Sinner', shortName: 'SIN' }, date: d(1, 19), status: 'scheduled', venue: 'Indian Wells Tennis Garden' },
    { id: 3002, sport: 'tennis', competition: { id: 1, name: 'ATP Indian Wells Masters', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 203, name: 'N. Djokovic', shortName: 'DJO' }, awayTeam: { id: 204, name: 'D. Medvedev', shortName: 'MED' }, date: d(1, 21), status: 'scheduled', venue: 'Indian Wells Tennis Garden' },
    { id: 3003, sport: 'tennis', competition: { id: 2, name: 'WTA Indian Wells Masters', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 205, name: 'I. Swiatek', shortName: 'SWI' }, awayTeam: { id: 206, name: 'A. Sabalenka', shortName: 'SAB' }, date: d(2, 20), status: 'scheduled', venue: 'Indian Wells Tennis Garden' },
    { id: 3004, sport: 'tennis', competition: { id: 1, name: 'ATP Indian Wells Masters', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 207, name: 'A. Zverev', shortName: 'ZVE' }, awayTeam: { id: 208, name: 'H. Hurkacz', shortName: 'HUR' }, date: d(2, 17, 30), status: 'scheduled', venue: 'Indian Wells Tennis Garden' },
    { id: 3005, sport: 'tennis', competition: { id: 1, name: 'ATP Indian Wells Masters', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 209, name: 'T. Fritz', shortName: 'FRI' }, awayTeam: { id: 210, name: 'S. Tsitsipas', shortName: 'TSI' }, date: d(3, 19), status: 'scheduled', venue: 'Indian Wells Tennis Garden' },
  ];

  if (sport === 'basketball') return [
    { id: 2001, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 101, name: 'Oklahoma City Thunder', shortName: 'OKC' }, awayTeam: { id: 102, name: 'Cleveland Cavaliers', shortName: 'CLE' }, date: d(0, 20, 30), status: 'scheduled', venue: 'Paycom Center, Oklahoma City' },
    { id: 2002, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 103, name: 'Boston Celtics', shortName: 'BOS' }, awayTeam: { id: 104, name: 'Golden State Warriors', shortName: 'GSW' }, date: d(0, 22), status: 'scheduled', venue: 'TD Garden, Boston' },
    { id: 2003, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 105, name: 'Denver Nuggets', shortName: 'DEN' }, awayTeam: { id: 106, name: 'Minnesota Timberwolves', shortName: 'MIN' }, date: d(1, 21), status: 'scheduled', venue: 'Ball Arena, Denver' },
    { id: 2004, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 107, name: 'LA Lakers', shortName: 'LAL' }, awayTeam: { id: 108, name: 'Memphis Grizzlies', shortName: 'MEM' }, date: d(1, 22, 30), status: 'scheduled', venue: 'Crypto.com Arena, Los Angeles' },
    { id: 2005, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 109, name: 'Miami Heat', shortName: 'MIA' }, awayTeam: { id: 110, name: 'Chicago Bulls', shortName: 'CHI' }, date: d(2, 19, 30), status: 'scheduled', venue: 'Kaseya Center, Miami' },
  ];

  if (sport === 'f1') return [
    { id: 4001, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 401, name: 'Australian Grand Prix', shortName: 'AUS' }, awayTeam: { id: 402, name: 'Melbourne — Albert Park', shortName: 'MEL' }, date: '2026-03-15T06:00:00+00:00', status: 'scheduled', venue: 'Albert Park Circuit, Melbourne' },
    { id: 4002, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 403, name: 'Chinese Grand Prix', shortName: 'CHN' }, awayTeam: { id: 404, name: 'Shanghai — Int. Circuit', shortName: 'SHA' }, date: '2026-03-22T07:00:00+00:00', status: 'scheduled', venue: 'Shanghai International Circuit' },
    { id: 4003, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 405, name: 'Japanese Grand Prix', shortName: 'JPN' }, awayTeam: { id: 406, name: 'Suzuka — Int. Racing Course', shortName: 'SUZ' }, date: '2026-04-05T05:00:00+00:00', status: 'scheduled', venue: 'Suzuka International Racing Course' },
    { id: 4004, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 407, name: 'Bahrain Grand Prix', shortName: 'BAH' }, awayTeam: { id: 408, name: 'Sakhir — Bahrain Int. Circuit', shortName: 'SAK' }, date: '2026-04-19T15:00:00+00:00', status: 'scheduled', venue: 'Bahrain International Circuit' },
  ];

  if (sport === 'golf') return [
    { id: 5001, sport: 'golf', competition: { id: 1, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 501, name: 'S. Scheffler', shortName: 'SCH' }, awayTeam: { id: 502, name: 'R. McIlroy', shortName: 'MCI' }, date: '2026-04-09T14:00:00+00:00', status: 'scheduled', venue: 'Augusta National, Augusta GA' },
    { id: 5002, sport: 'golf', competition: { id: 1, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 503, name: 'X. Schauffele', shortName: 'XSC' }, awayTeam: { id: 504, name: 'C. Young', shortName: 'YOU' }, date: '2026-04-10T14:00:00+00:00', status: 'scheduled', venue: 'Augusta National, Augusta GA' },
    { id: 5003, sport: 'golf', competition: { id: 1, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 505, name: 'J. Rahm', shortName: 'RAH' }, awayTeam: { id: 506, name: 'B. DeChambeau', shortName: 'DEC' }, date: '2026-04-10T16:30:00+00:00', status: 'scheduled', venue: 'Augusta National, Augusta GA' },
  ];

  return getMockMatches(2, 6);
}

const MOCK_TEAMS = [
  { id: 541, name: 'Real Madrid', shortName: 'RMA' }, { id: 529, name: 'FC Barcelona', shortName: 'BAR' },
  { id: 50,  name: 'Manchester City', shortName: 'MCI' }, { id: 42, name: 'Arsenal', shortName: 'ARS' },
  { id: 157, name: 'Bayern Munich', shortName: 'BAY' }, { id: 85, name: 'Paris Saint-Germain', shortName: 'PSG' },
];

function getMockTeamStats(teamId: number): TeamStats {
  const team = MOCK_TEAMS.find(t => t.id === teamId) ?? MOCK_TEAMS[0];
  const results: FormMatch['result'][] = ['W', 'W', 'D', 'W', 'L'];
  const opponents = MOCK_TEAMS.filter(t => t.id !== teamId).slice(0, 5);
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({
    opponent: opponents[i]?.name ?? 'Opponent', result,
    goalsFor: result === 'W' ? 2 : result === 'D' ? 1 : 0, goalsAgainst: result === 'L' ? 2 : result === 'D' ? 1 : 0,
    date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0,
  }));
  return {
    team: { id: team.id, name: team.name, shortName: team.shortName },
    form, goalsScored: 1.8, goalsConceded: 0.9, cleanSheets: 10, btts: 50, over25: 60,
    possession: 58, shotsOnTarget: 6, homeRecord: { w: 7, d: 2, l: 1 }, awayRecord: { w: 5, d: 3, l: 2 },
  };
}

export function getMockStatsBySport(teamId: number, teamName: string, sport: string): TeamStats {
  const shortName = teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  const results: FormMatch['result'][] = ['W', 'W', 'L', 'W', 'W'];
  const opponents: string[] = sport === 'tennis' ? ['Medvedev', 'Zverev', 'Rublev', 'Fritz', 'Tsitsipas'] : sport === 'basketball' ? ['Lakers', 'Celtics', 'Heat', 'Nuggets', 'Bucks'] : sport === 'f1' ? ['Verstappen', 'Hamilton', 'Leclerc', 'Norris', 'Sainz'] : ['Opponent A', 'Opponent B', 'Opponent C', 'Opponent D', 'Opponent E'];
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({ opponent: opponents[i] ?? 'Opponent', result, goalsFor: result === 'W' ? 2 : 1, goalsAgainst: result === 'L' ? 2 : 1, date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0 }));
  const scored = sport === 'basketball' ? 108 : 1.8;
  const conceded = sport === 'basketball' ? 102 : 1.2;
  return { team: { id: teamId, name: teamName, shortName }, form, goalsScored: scored, goalsConceded: conceded, cleanSheets: 5, btts: 50, over25: 55, possession: undefined, shotsOnTarget: undefined, homeRecord: { w: 8, d: 0, l: 2 }, awayRecord: { w: 6, d: 0, l: 4 } };
}
