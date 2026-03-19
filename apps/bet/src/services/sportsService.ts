import type { Match, TeamStats, FormMatch, Competition } from '../types';
import { SEASON, COMPETITIONS } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE PROXY (used for football team stats only — keeps api-sports.io calls minimal)
// ─────────────────────────────────────────────────────────────────────────────
const PROXY    = 'https://mtgatdmrpfysqphdgaue.supabase.co/functions/v1/sports-proxy';
const cache    = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

async function proxyFetch(sport: string, path: string): Promise<any> {
  const key = `${sport}${path}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  try {
    const res = await fetch(`${PROXY}?sport=${sport}&path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error || (json?.errors && Object.keys(json.errors).length > 0)) return null;
    cache.set(key, { data: json, ts: Date.now() });
    return json;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN API — direct fetch, CORS-free, no key required
// ─────────────────────────────────────────────────────────────────────────────
const ESPN_BASE  = 'https://site.api.espn.com/apis/site/v2/sports';
const espnCache  = new Map<string, { data: any; ts: number }>();

// Live fetch — very short TTL for in-progress polling
const liveCache = new Map<string, { data: any; ts: number }>();
const LIVE_TTL  = 15_000; // 15 s
async function espnFetchLive(path: string): Promise<any> {
  const hit = liveCache.get(path);
  if (hit && Date.now() - hit.ts < LIVE_TTL) return hit.data;
  try {
    const res  = await fetch(`${ESPN_BASE}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    liveCache.set(path, { data: json, ts: Date.now() });
    return json;
  } catch { return null; }
}

async function espnFetch(path: string): Promise<any> {
  const hit = espnCache.get(path);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  try {
    const res = await fetch(`${ESPN_BASE}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    espnCache.set(path, { data: json, ts: Date.now() });
    return json;
  } catch { return null; }
}

// ESPN date string YYYYMMDD
function espnDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function parseClock(ev: any): { minute?: number; clockDisplay?: string; period?: string } {
  const state = ev.status?.type?.state ?? 'pre';
  if (state !== 'in') return {};
  const detail  = ev.status?.type?.shortDetail ?? '';   // e.g. "45:00" | "HT" | "90+3'"
  const clock   = ev.status?.clock ?? 0;                // seconds elapsed in period
  const period  = ev.status?.period ?? 1;
  if (detail === 'HT' || detail.includes('Half')) return { clockDisplay: 'HT', period: 'HT', minute: 45 };
  const mins = Math.floor(clock / 60);
  const periodMins = period === 1 ? mins : 45 + mins;
  return {
    minute:       Math.min(periodMins, 120),
    clockDisplay: detail || `${periodMins}'`,
    period:       period === 1 ? '1H' : period === 2 ? '2H' : 'ET',
  };
}

function mapEspnStatus(s: string): Match['status'] {
  if (s === 'in')   return 'live';
  if (s === 'post') return 'finished';
  return 'scheduled';
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTBALL — ESPN with multi-day window so there's always data
// ─────────────────────────────────────────────────────────────────────────────

interface LeagueCfg { slug: string; name: string; emoji: string; country: string; id: number; }
const FOOTBALL_LEAGUES: LeagueCfg[] = [
  { id: 2,   slug: 'soccer/uefa.champions', name: 'UEFA Champions League', emoji: '🏆', country: 'Europe'    },
  { id: 3,   slug: 'soccer/uefa.europa',    name: 'UEFA Europa League',    emoji: '🟠', country: 'Europe'    },
  { id: 140, slug: 'soccer/esp.1',          name: 'LaLiga',                emoji: '🇪🇸', country: 'Spain'    },
  { id: 141, slug: 'soccer/esp.2',          name: 'LaLiga 2',              emoji: '🇪🇸', country: 'Spain'    },
  { id: 39,  slug: 'soccer/eng.1',          name: 'Premier League',        emoji: '⚽',  country: 'England'  },
  { id: 135, slug: 'soccer/ita.1',          name: 'Serie A',               emoji: '🇮🇹', country: 'Italy'   },
  { id: 78,  slug: 'soccer/ger.1',          name: 'Bundesliga',            emoji: '🇩🇪', country: 'Germany' },
  { id: 61,  slug: 'soccer/fra.1',          name: 'Ligue 1',               emoji: '🇫🇷', country: 'France'  },
  { id: 94,  slug: 'soccer/por.1',          name: 'Primeira Liga',         emoji: '🇵🇹', country: 'Portugal'},
  { id: 128, slug: 'soccer/arg.1',          name: 'Liga Profesional',      emoji: '🇦🇷', country: 'Argentina'},
  { id: 262, slug: 'soccer/mex.1',          name: 'Liga MX',               emoji: '🇲🇽', country: 'Mexico'  },
];

function parseEspnFootballEvents(events: any[], cfg: LeagueCfg): Match[] {
  const matches: Match[] = [];
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;
    const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
    const clk = parseClock(ev);
    matches.push({
      id: parseInt(ev.id ?? '0') + cfg.id * 100,
      espnEventId: ev.id,
      sport: 'football',
      competition: { id: cfg.id, name: cfg.name, sport: 'football', country: cfg.country, logo: '', emoji: cfg.emoji },
      homeTeam: { id: parseInt(home.team?.id ?? '0'), name: home.team?.displayName ?? 'Home', shortName: home.team?.abbreviation ?? 'HOM', logo: home.team?.logo },
      awayTeam: { id: parseInt(away.team?.id ?? '0'), name: away.team?.displayName ?? 'Away', shortName: away.team?.abbreviation ?? 'AWY', logo: away.team?.logo },
      date: ev.date ?? new Date().toISOString(),
      status,
      homeScore: status !== 'scheduled' ? parseInt(home.score ?? '0') : undefined,
      awayScore: status !== 'scheduled' ? parseInt(away.score ?? '0') : undefined,
      venue: comp.venue?.fullName,
      round: ev.status?.type?.shortDetail ?? ev.name,
      ...clk,
    });
  }
  return matches;
}

// Fetch a league from ESPN using range requests (fast, max 3 HTTP calls)
async function fetchLeagueMatches(cfg: LeagueCfg, limit: number): Promise<Match[]> {
  // 1. Forward range: tomorrow → +14 days (skips today's finished games)
  const fwdJson = await espnFetch(`/${cfg.slug}/scoreboard?dates=${espnDate(1)}-${espnDate(14)}`);
  let events: any[] = fwdJson?.events ?? [];

  // 2. If nothing ahead, check today for live/scheduled games
  if (events.length === 0) {
    const todayJson = await espnFetch(`/${cfg.slug}/scoreboard`);
    events = (todayJson?.events ?? []).filter((e: any) => e.status?.type?.state !== 'post');
  }

  // 3. Last resort: recent past (3-day range backward)
  if (events.length === 0) {
    const bwdJson = await espnFetch(`/${cfg.slug}/scoreboard?dates=${espnDate(-3)}-${espnDate(0)}`);
    events = bwdJson?.events ?? [];
  }

  if (events.length === 0) return [];
  return parseEspnFootballEvents(events, cfg).slice(0, limit);
}

export async function fetchUpcomingMatches(leagueId: number, limit = 10): Promise<Match[]> {
  const cfg = FOOTBALL_LEAGUES.find(l => l.id === leagueId);
  if (!cfg) return [];
  const matches = await fetchLeagueMatches(cfg, limit);
  if (matches.length > 0) return matches;
  return getMockMatches(leagueId, limit);   // only if ESPN fails entirely
}

export async function fetchLiveMatches(leagueId?: number): Promise<Match[]> {
  if (leagueId) {
    const cfg = FOOTBALL_LEAGUES.find(l => l.id === leagueId);
    if (!cfg) return [];
    const json = await espnFetch(`/${cfg.slug}/scoreboard`);
    const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
    return parseEspnFootballEvents(events, cfg);
  }
  const allResults = await Promise.all(
    FOOTBALL_LEAGUES.slice(0, 4).map(async cfg => {
      const json = await espnFetch(`/${cfg.slug}/scoreboard`);
      const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
      return parseEspnFootballEvents(events, cfg);
    })
  );
  return allResults.flat();
}

// ── LIVE POLLING: fetch single event by ESPN event ID ────────────────────────
export async function fetchLiveMatchById(
  sport: string, slug: string, espnEventId: string
): Promise<Partial<Match> | null> {
  const json = await espnFetchLive(`/${slug}/scoreboard`);
  const events: any[] = json?.events ?? [];
  const ev = events.find((e: any) => e.id === espnEventId);
  if (!ev) return null;
  const comp = ev.competitions?.[0];
  const state  = ev.status?.type?.state ?? 'pre';
  const status = mapEspnStatus(state);
  const clk    = parseClock(ev);
  if (sport === 'football') {
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    return {
      status,
      homeScore: state !== 'pre' ? parseInt(home?.score ?? '0') : undefined,
      awayScore: state !== 'pre' ? parseInt(away?.score ?? '0') : undefined,
      ...clk,
    };
  }
  if (sport === 'tennis') {
    const p1 = comp?.competitors?.[0];
    const p2 = comp?.competitors?.[1];
    return {
      status,
      homeScore: state !== 'pre' ? parseInt(p1?.score ?? '0') : undefined,
      awayScore: state !== 'pre' ? parseInt(p2?.score ?? '0') : undefined,
      clockDisplay: status === 'live' ? `Set ${(p1?.linescores?.length ?? 0) + 1}` : undefined,
    };
  }
  if (sport === 'basketball') {
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    return {
      status,
      homeScore: state !== 'pre' ? parseInt(home?.score ?? '0') : undefined,
      awayScore: state !== 'pre' ? parseInt(away?.score ?? '0') : undefined,
      ...clk,
    };
  }
  return null;
}

// ── FETCH ALL LIVE MATCHES ACROSS SPORTS for Bet ticker ──────────────────────
export async function fetchAllLiveMatches(): Promise<Match[]> {
  const results: Match[] = [];
  // Football top leagues
  const topLeagues = FOOTBALL_LEAGUES.slice(0, 6);
  const footPromises = topLeagues.map(async cfg => {
    const json = await espnFetchLive(`/${cfg.slug}/scoreboard`);
    const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
    return parseEspnFootballEvents(events, cfg);
  });
  const footResults = await Promise.all(footPromises);
  results.push(...footResults.flat());

  // Tennis live
  for (const tour of TENNIS_LEAGUES) {
    const json = await espnFetchLive(`/${tour.slug}/scoreboard`);
    const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
    for (const ev of events.slice(0, 6)) {
      const comp = ev.competitions?.[0];
      const p1   = comp?.competitors?.[0];
      const p2   = comp?.competitors?.[1];
      if (!p1 || !p2) continue;
      results.push({
        id: parseInt(ev.id ?? '0') + tour.baseId,
        espnEventId: ev.id,
        sport: 'tennis',
        competition: { id: tour.baseId, name: ev.name ?? tour.name, sport: 'tennis', country: tour.country, logo: '', emoji: tour.emoji },
        homeTeam: { id: parseInt(p1.id ?? '0'), name: p1.athlete?.displayName ?? 'P1', shortName: p1.athlete?.shortName ?? 'P1' },
        awayTeam: { id: parseInt(p2.id ?? '0'), name: p2.athlete?.displayName ?? 'P2', shortName: p2.athlete?.shortName ?? 'P2' },
        date: ev.date ?? new Date().toISOString(),
        status: 'live',
        homeScore: parseInt(p1.score ?? '0'),
        awayScore: parseInt(p2.score ?? '0'),
        clockDisplay: `Set ${(p1.linescores?.length ?? 0) + 1}`,
      });
    }
  }

  // Basketball live
  const baskLeagues = [
    { slug: 'basketball/nba', name: 'NBA', emoji: '🏀', country: 'USA', id: 12, baseId: 20000 },
  ];
  for (const league of baskLeagues) {
    const json = await espnFetchLive(`/${league.slug}/scoreboard`);
    const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
    for (const ev of events.slice(0, 6)) {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      const clk = parseClock(ev);
      results.push({
        id: parseInt(ev.id ?? '0') + league.baseId,
        espnEventId: ev.id,
        sport: 'basketball',
        competition: { id: league.id, name: league.name, sport: 'basketball', country: league.country, logo: '', emoji: league.emoji },
        homeTeam: { id: parseInt(home.team?.id ?? '0'), name: home.team?.displayName ?? 'Home', shortName: home.team?.abbreviation ?? 'HOM' },
        awayTeam: { id: parseInt(away.team?.id ?? '0'), name: away.team?.displayName ?? 'Away', shortName: away.team?.abbreviation ?? 'AWY' },
        date: ev.date ?? new Date().toISOString(),
        status: 'live',
        homeScore: parseInt(home.score ?? '0'),
        awayScore: parseInt(away.score ?? '0'),
        ...clk,
      });
    }
  }

  return results;
}

export async function fetchRecentMatches(leagueId: number, limit = 5): Promise<Match[]> {
  const cfg = FOOTBALL_LEAGUES.find(l => l.id === leagueId);
  if (!cfg) return [];
  // Try yesterday and 2 days ago
  for (let d = 1; d <= 3; d++) {
    const json = await espnFetch(`/${cfg.slug}/scoreboard?dates=${espnDate(-d)}`);
    const events = (json?.events ?? []).filter((e: any) => e.status?.type?.state === 'post');
    if (events.length > 0) return parseEspnFootballEvents(events, cfg).slice(0, limit);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// TENNIS — ESPN multi-day scan
// ─────────────────────────────────────────────────────────────────────────────
const TENNIS_LEAGUES = [
  { slug: 'tennis/atp-singles', name: 'ATP Tour', emoji: '🎾', country: 'International', baseId: 30000 },
  { slug: 'tennis/wta-singles', name: 'WTA Tour', emoji: '🎾', country: 'International', baseId: 31000 },
];

export async function fetchTennisMatches(): Promise<Match[]> {
  const results: Match[] = [];

  for (const tour of TENNIS_LEAGUES) {
    let events: any[] = [];

    // Single range request: today → +14 days (instead of 15 sequential requests)
    const fwdRange = `${espnDate(0)}-${espnDate(14)}`;
    const fwdJson  = await espnFetch(`/${tour.slug}/scoreboard?dates=${fwdRange}`);
    events = fwdJson?.events ?? [];

    // Also try base scoreboard (returns "current" tournament)
    if (events.length === 0) {
      const baseJson = await espnFetch(`/${tour.slug}/scoreboard`);
      events = baseJson?.events ?? [];
    }

    // Backward 7-day range for live / just-finished tournaments
    if (events.length === 0) {
      const bwdRange = `${espnDate(-7)}-${espnDate(-1)}`;
      const bwdJson  = await espnFetch(`/${tour.slug}/scoreboard?dates=${bwdRange}`);
      events = bwdJson?.events ?? [];
    }

    for (const ev of events.slice(0, 15)) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const p1 = comp.competitors?.[0];
      const p2 = comp.competitors?.[1];
      if (!p1 || !p2) continue;
      const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
      // Tennis score = sets won. linescores has per-set scores
      const setsHome = p1.linescores?.length ?? (status !== 'scheduled' && p1.score !== undefined ? parseInt(p1.score) : undefined);
      const setsAway = p2.linescores?.length ?? (status !== 'scheduled' && p2.score !== undefined ? parseInt(p2.score) : undefined);
      const tennisClock = status === 'live' ? { clockDisplay: `Set ${(p1.linescores?.length ?? 0) + 1}`, period: 'live' } : {};
      results.push({
        id: parseInt(ev.id ?? '0') + tour.baseId,
        espnEventId: ev.id,
        sport: 'tennis',
        competition: { id: tour.baseId, name: ev.name ?? tour.name, sport: 'tennis', country: tour.country, logo: '', emoji: tour.emoji },
        homeTeam: {
          id: parseInt(p1.id ?? '0'),
          name: p1.athlete?.displayName ?? p1.team?.displayName ?? 'Player 1',
          shortName: p1.athlete?.shortName ?? (p1.athlete?.displayName ?? 'P1').split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'P1',
          logo: p1.athlete?.flag?.href,
        },
        awayTeam: {
          id: parseInt(p2.id ?? '0'),
          name: p2.athlete?.displayName ?? p2.team?.displayName ?? 'Player 2',
          shortName: p2.athlete?.shortName ?? (p2.athlete?.displayName ?? 'P2').split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'P2',
          logo: p2.athlete?.flag?.href,
        },
        date: ev.date ?? new Date().toISOString(),
        status,
        homeScore: status !== 'scheduled' ? (p1.score !== undefined ? parseInt(p1.score) : 0) : undefined,
        awayScore: status !== 'scheduled' ? (p2.score !== undefined ? parseInt(p2.score) : 0) : undefined,
        venue: comp.venue?.fullName ?? ev.name,
        round: ev.status?.type?.shortDetail ?? comp.tournament?.displayName,
        ...tennisClock,
      });
    }
  }

  // Fallback to curated mock if ESPN has nothing
  return results.length > 0 ? results : getMockMatchesBySport('tennis');
}

// ─────────────────────────────────────────────────────────────────────────────
// BASKETBALL — ESPN multi-day scan
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchBasketballMatches(): Promise<Match[]> {
  const results: Match[] = [];
  const leagues = [
    { slug: 'basketball/nba',                    name: 'NBA',  emoji: '🏀', country: 'USA', id: 12,  baseId: 20000 },
    { slug: 'basketball/mens-college-basketball', name: 'NCAA', emoji: '🎓', country: 'USA', id: 100, baseId: 21000 },
  ];

  for (const league of leagues) {
    let events: any[] = [];

    for (let d = 0; d <= 7; d++) {
      const path = d === 0
        ? `/${league.slug}/scoreboard`
        : `/${league.slug}/scoreboard?dates=${espnDate(d)}`;
      const json = await espnFetch(path);
      events = json?.events ?? [];
      if (events.length > 0) break;
    }

    for (const ev of events.slice(0, 15)) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
      const baskClock = parseClock(ev);
      results.push({
        id: parseInt(ev.id ?? '0') + league.baseId,
        espnEventId: ev.id,
        sport: 'basketball',
        competition: { id: league.id, name: league.name, sport: 'basketball', country: league.country, logo: '', emoji: league.emoji },
        homeTeam: { id: parseInt(home.team?.id ?? '0'), name: home.team?.displayName ?? 'Home', shortName: home.team?.abbreviation ?? 'HOM', logo: home.team?.logo },
        awayTeam: { id: parseInt(away.team?.id ?? '0'), name: away.team?.displayName ?? 'Away', shortName: away.team?.abbreviation ?? 'AWY', logo: away.team?.logo },
        date: ev.date ?? new Date().toISOString(),
        status,
        homeScore: status !== 'scheduled' ? parseInt(home.score ?? '0') : undefined,
        awayScore: status !== 'scheduled' ? parseInt(away.score ?? '0') : undefined,
        venue: comp.venue?.fullName,
        ...baskClock,
      });
    }
  }

  return results.length > 0 ? results : getMockMatchesBySport('basketball');
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA 1 — ESPN
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchF1Matches(): Promise<Match[]> {
  const json = await espnFetch('/racing/f1/scoreboard');
  const events: any[] = json?.events ?? [];
  if (events.length === 0) return getMockMatchesBySport('f1');
  const season = new Date().getFullYear();
  return events.slice(0, 10).map((ev: any, idx: number) => {
    const comp  = ev.competitions?.[0];
    const status = mapEspnStatus(ev.status?.type?.state ?? 'pre');
    return {
      id: parseInt(ev.id ?? String(40000 + idx)),
      sport: 'f1' as const,
      competition: { id: 50, name: `Formula 1 ${season}`, sport: 'f1' as const, country: 'Global', logo: '', emoji: '🏎️' },
      homeTeam: { id: 300 + idx * 2, name: ev.name ?? ev.shortName ?? 'Gran Premio', shortName: ev.shortName?.substring(0, 6) ?? 'GP' },
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
  const events: any[] = json?.events ?? [];
  if (events.length === 0) return getMockMatchesBySport('golf');
  return events.slice(0, 8).map((ev: any, idx: number) => {
    const comp    = ev.competitions?.[0];
    const status  = mapEspnStatus(ev.status?.type?.state ?? 'pre');
    const players = comp?.competitors ?? [];
    const p1 = players[0];
    const p2 = players[1];
    return {
      id: parseInt(ev.id ?? String(50000 + idx)),
      sport: 'golf' as const,
      competition: { id: 200 + idx, name: ev.name ?? 'PGA Tour', sport: 'golf' as const, country: 'USA', logo: '', emoji: '⛳' },
      homeTeam: { id: 500 + idx * 2, name: p1?.athlete?.displayName ?? ev.name ?? 'Player 1', shortName: p1?.athlete?.shortName ?? 'P1' },
      awayTeam: { id: 500 + idx * 2 + 1, name: p2?.athlete?.displayName ?? 'Field', shortName: p2?.athlete?.shortName ?? 'FLD' },
      date: ev.date ?? new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
      status,
      venue: comp?.venue?.fullName ?? ev.name,
      round: ev.status?.type?.shortDetail,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM STATS (api-sports via proxy — only called when user opens analysis)
// ─────────────────────────────────────────────────────────────────────────────
export async function getApiStatus() {
  const json = await proxyFetch('football', '/status');
  if (!json) return null;
  return { remaining: json.response?.requests?.current ?? 0, limit: json.response?.requests?.limit_day ?? 100 };
}

export async function fetchTeamStats(teamId: number, leagueId: number): Promise<TeamStats | null> {
  const [statsJson, formJson] = await Promise.all([
    proxyFetch('football', `/teams/statistics?team=${teamId}&league=${leagueId}&season=${SEASON}`),
    proxyFetch('football', `/fixtures?team=${teamId}&league=${leagueId}&season=${SEASON}&last=5`),
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
// MAPPERS
// ─────────────────────────────────────────────────────────────────────────────
function mapFixtureToMatch(f: any): Match {
  const comp = COMPETITIONS.find(c => c.id === f.league?.id) ?? {
    id: f.league?.id ?? 0, name: f.league?.name ?? 'Unknown', sport: 'football' as const,
    country: f.league?.country ?? '', logo: f.league?.logo ?? '', emoji: '⚽',
  };
  return {
    id: f.fixture.id, sport: 'football', competition: comp,
    homeTeam: { id: f.teams.home.id, name: f.teams.home.name, shortName: f.teams.home.name.slice(0, 3).toUpperCase(), logo: f.teams.home.logo },
    awayTeam: { id: f.teams.away.id, name: f.teams.away.name, shortName: f.teams.away.name.slice(0, 3).toUpperCase(), logo: f.teams.away.logo },
    date: f.fixture.date, status: mapApiStatus(f.fixture.status.short),
    homeScore: f.goals.home ?? undefined, awayScore: f.goals.away ?? undefined,
    venue: f.fixture.venue?.name, round: f.league?.round,
  };
}

function mapApiStatus(s: string): Match['status'] {
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
    awayRecord:  { w: stats?.fixtures?.wins?.away ?? 3, d: stats?.fixtures?.draws?.away ?? 3, l: stats?.fixtures?.loses?.away ?? 3 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FALLBACKS (curated real fixtures — used only when ESPN is unreachable)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_COMP_MAP: Record<number, Competition> = {
  2:   { id: 2,   name: 'UEFA Champions League', sport: 'football', country: 'Europe',    logo: '', emoji: '🏆' },
  3:   { id: 3,   name: 'UEFA Europa League',    sport: 'football', country: 'Europe',    logo: '', emoji: '🟠' },
  140: { id: 140, name: 'LaLiga',                sport: 'football', country: 'Spain',     logo: '', emoji: '🇪🇸' },
  39:  { id: 39,  name: 'Premier League',        sport: 'football', country: 'England',   logo: '', emoji: '⚽'  },
  135: { id: 135, name: 'Serie A',               sport: 'football', country: 'Italy',     logo: '', emoji: '🇮🇹' },
  78:  { id: 78,  name: 'Bundesliga',            sport: 'football', country: 'Germany',   logo: '', emoji: '🇩🇪' },
  61:  { id: 61,  name: 'Ligue 1',               sport: 'football', country: 'France',    logo: '', emoji: '🇫🇷' },
};

const MOCK_FIXTURES: Record<number, { home: string; away: string; date: string; round: string }[]> = {
  2:   [
    { home: 'Arsenal',           away: 'Real Madrid',        date: '2026-03-18T20:00:00+00:00', round: 'Round of 16' },
    { home: 'Bayern Munich',     away: 'Inter Milan',        date: '2026-04-09T20:00:00+01:00', round: 'Quarter-finals' },
    { home: 'Manchester City',   away: 'PSG',                date: '2026-04-08T20:00:00+01:00', round: 'Quarter-finals' },
  ],
  140: [
    { home: 'Real Madrid',       away: 'Sevilla',            date: '2026-03-15T21:00:00+01:00', round: 'Jornada 28' },
    { home: 'Barcelona',         away: 'Atletico Madrid',    date: '2026-03-16T21:00:00+01:00', round: 'Jornada 28' },
    { home: 'Villarreal',        away: 'Real Sociedad',      date: '2026-03-16T18:30:00+01:00', round: 'Jornada 28' },
  ],
  39:  [
    { home: 'Arsenal',           away: 'Liverpool',          date: '2026-03-14T17:30:00+00:00', round: 'Matchweek 29' },
    { home: 'Manchester City',   away: 'Chelsea',            date: '2026-03-14T15:00:00+00:00', round: 'Matchweek 29' },
    { home: 'Tottenham',         away: 'Man United',         date: '2026-03-15T14:00:00+00:00', round: 'Matchweek 29' },
  ],
  78:  [
    { home: 'Bayern Munich',     away: 'Bayer Leverkusen',   date: '2026-03-14T18:30:00+01:00', round: 'Spieltag 26' },
    { home: 'Dortmund',          away: 'RB Leipzig',         date: '2026-03-14T15:30:00+01:00', round: 'Spieltag 26' },
  ],
  135: [
    { home: 'Inter Milan',       away: 'Juventus',           date: '2026-03-15T20:45:00+01:00', round: 'Giornata 29' },
    { home: 'Napoli',            away: 'AC Milan',           date: '2026-03-15T18:00:00+01:00', round: 'Giornata 29' },
  ],
  61:  [
    { home: 'PSG',               away: 'Marseille',          date: '2026-03-15T21:00:00+01:00', round: 'Journee 27' },
  ],
};

function getMockMatches(leagueId: number, limit: number): Match[] {
  const comp  = MOCK_COMP_MAP[leagueId] ?? MOCK_COMP_MAP[2];
  const fixts = MOCK_FIXTURES[leagueId] ?? MOCK_FIXTURES[2];
  return fixts.slice(0, Math.min(limit, fixts.length)).map((f, i) => ({
    id: 10000 + leagueId * 10 + i, sport: 'football' as const, competition: comp,
    homeTeam: { id: 9000 + i * 2,     name: f.home, shortName: f.home.substring(0, 3).toUpperCase() },
    awayTeam: { id: 9000 + i * 2 + 1, name: f.away, shortName: f.away.substring(0, 3).toUpperCase() },
    date: f.date, status: 'scheduled' as const, round: f.round, venue: `${f.home} Stadium`,
  }));
}

const d = (days: number, h = 20, m = 0) => { const dt = new Date(); dt.setDate(dt.getDate() + days); dt.setHours(h, m, 0, 0); return dt.toISOString(); };

export function getMockMatchesBySport(sport: string): Match[] {
  if (sport === 'tennis') return [
    { id: 3001, sport: 'tennis', competition: { id: 1, name: 'ATP Miami Open', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 201, name: 'C. Alcaraz', shortName: 'ALC' }, awayTeam: { id: 202, name: 'J. Sinner', shortName: 'SIN' }, date: d(1, 19), status: 'scheduled', venue: 'Hard Rock Stadium, Miami' },
    { id: 3002, sport: 'tennis', competition: { id: 1, name: 'ATP Miami Open', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 203, name: 'N. Djokovic', shortName: 'DJO' }, awayTeam: { id: 204, name: 'D. Medvedev', shortName: 'MED' }, date: d(1, 21), status: 'scheduled', venue: 'Hard Rock Stadium, Miami' },
    { id: 3003, sport: 'tennis', competition: { id: 2, name: 'WTA Miami Open', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 205, name: 'I. Swiatek', shortName: 'SWI' }, awayTeam: { id: 206, name: 'A. Sabalenka', shortName: 'SAB' }, date: d(2, 20), status: 'scheduled', venue: 'Hard Rock Stadium, Miami' },
    { id: 3004, sport: 'tennis', competition: { id: 1, name: 'ATP Miami Open', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 207, name: 'A. Zverev', shortName: 'ZVE' }, awayTeam: { id: 208, name: 'H. Hurkacz', shortName: 'HUR' }, date: d(2, 17, 30), status: 'scheduled', venue: 'Hard Rock Stadium, Miami' },
    { id: 3005, sport: 'tennis', competition: { id: 1, name: 'ATP Miami Open', sport: 'tennis', country: 'USA', logo: '', emoji: '🎾' }, homeTeam: { id: 209, name: 'T. Fritz', shortName: 'FRI' }, awayTeam: { id: 210, name: 'S. Tsitsipas', shortName: 'TSI' }, date: d(3, 19), status: 'scheduled', venue: 'Hard Rock Stadium, Miami' },
  ];

  if (sport === 'basketball') return [
    { id: 2001, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 101, name: 'Oklahoma City Thunder', shortName: 'OKC' }, awayTeam: { id: 102, name: 'Cleveland Cavaliers', shortName: 'CLE' }, date: d(0, 20, 30), status: 'scheduled', venue: 'Paycom Center' },
    { id: 2002, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 103, name: 'Boston Celtics', shortName: 'BOS' }, awayTeam: { id: 104, name: 'Golden State Warriors', shortName: 'GSW' }, date: d(0, 22), status: 'scheduled', venue: 'TD Garden' },
    { id: 2003, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 105, name: 'Denver Nuggets', shortName: 'DEN' }, awayTeam: { id: 106, name: 'Minnesota Timberwolves', shortName: 'MIN' }, date: d(1, 21), status: 'scheduled', venue: 'Ball Arena' },
    { id: 2004, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 107, name: 'LA Lakers', shortName: 'LAL' }, awayTeam: { id: 108, name: 'Memphis Grizzlies', shortName: 'MEM' }, date: d(1, 22, 30), status: 'scheduled', venue: 'Crypto.com Arena' },
  ];

  if (sport === 'f1') return [
    { id: 4001, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 401, name: 'Australian Grand Prix', shortName: 'AUS' }, awayTeam: { id: 402, name: 'Melbourne — Albert Park', shortName: 'MEL' }, date: '2026-03-15T06:00:00+00:00', status: 'scheduled', venue: 'Albert Park Circuit, Melbourne' },
    { id: 4002, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 403, name: 'Chinese Grand Prix', shortName: 'CHN' }, awayTeam: { id: 404, name: 'Shanghai Int. Circuit', shortName: 'SHA' }, date: '2026-03-22T07:00:00+00:00', status: 'scheduled', venue: 'Shanghai International Circuit' },
    { id: 4003, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 405, name: 'Japanese Grand Prix', shortName: 'JPN' }, awayTeam: { id: 406, name: 'Suzuka Int. Racing Course', shortName: 'SUZ' }, date: '2026-04-05T05:00:00+00:00', status: 'scheduled', venue: 'Suzuka International Racing Course' },
  ];

  if (sport === 'golf') return [
    { id: 5001, sport: 'golf', competition: { id: 1, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 501, name: 'S. Scheffler', shortName: 'SCH' }, awayTeam: { id: 502, name: 'R. McIlroy', shortName: 'MCI' }, date: '2026-04-09T14:00:00+00:00', status: 'scheduled', venue: 'Augusta National' },
    { id: 5002, sport: 'golf', competition: { id: 1, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' }, homeTeam: { id: 503, name: 'X. Schauffele', shortName: 'XSC' }, awayTeam: { id: 504, name: 'C. Young', shortName: 'YOU' }, date: '2026-04-10T14:00:00+00:00', status: 'scheduled', venue: 'Augusta National' },
  ];

  return getMockMatches(2, 6);
}

const MOCK_TEAMS = [
  { id: 541, name: 'Real Madrid', shortName: 'RMA' }, { id: 529, name: 'FC Barcelona', shortName: 'BAR' },
  { id: 50, name: 'Manchester City', shortName: 'MCI' }, { id: 42, name: 'Arsenal', shortName: 'ARS' },
];

function getMockTeamStats(teamId: number): TeamStats {
  const team = MOCK_TEAMS.find(t => t.id === teamId) ?? MOCK_TEAMS[0];
  const results: FormMatch['result'][] = ['W','W','D','W','L'];
  const opponents = MOCK_TEAMS.filter(t => t.id !== teamId).slice(0, 5);
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({
    opponent: opponents[i]?.name ?? 'Opponent', result,
    goalsFor: result === 'W' ? 2 : result === 'D' ? 1 : 0, goalsAgainst: result === 'L' ? 2 : result === 'D' ? 1 : 0,
    date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0,
  }));
  return { team: { id: team.id, name: team.name, shortName: team.shortName }, form, goalsScored: 1.8, goalsConceded: 0.9, cleanSheets: 10, btts: 50, over25: 60, possession: 58, shotsOnTarget: 6, homeRecord: { w: 7, d: 2, l: 1 }, awayRecord: { w: 5, d: 3, l: 2 } };
}

export function getMockStatsBySport(teamId: number, teamName: string, sport: string): TeamStats {
  const shortName = teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  const results: FormMatch['result'][] = ['W','W','L','W','W'];
  const opponents: string[] = sport === 'tennis' ? ['Medvedev','Zverev','Rublev','Fritz','Tsitsipas'] : sport === 'basketball' ? ['Lakers','Celtics','Heat','Nuggets','Bucks'] : sport === 'f1' ? ['Verstappen','Hamilton','Leclerc','Norris','Sainz'] : ['Opponent A','Opponent B','Opponent C','Opponent D','Opponent E'];
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({ opponent: opponents[i] ?? 'Opponent', result, goalsFor: result === 'W' ? 2 : 1, goalsAgainst: result === 'L' ? 2 : 1, date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0 }));
  const scored   = sport === 'basketball' ? 108 : 1.8;
  const conceded = sport === 'basketball' ? 102 : 1.2;
  return { team: { id: teamId, name: teamName, shortName }, form, goalsScored: scored, goalsConceded: conceded, cleanSheets: 5, btts: 50, over25: 55, possession: undefined, shotsOnTarget: undefined, homeRecord: { w: 8, d: 0, l: 2 }, awayRecord: { w: 6, d: 0, l: 4 } };
}
