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
  { id: 135, slug: 'soccer/ita.1',          name: 'Serie A',               emoji: '🇮🇹', country: 'Italy'   },
  { id: 136, slug: 'soccer/ita.2',          name: 'Serie B',               emoji: '🇮🇹', country: 'Italy'   },
  { id: 78,  slug: 'soccer/ger.1',          name: 'Bundesliga',            emoji: '🇩🇪', country: 'Germany' },
  { id: 79,  slug: 'soccer/ger.2',          name: '2. Bundesliga',         emoji: '🇩🇪', country: 'Germany' },
  { id: 39,  slug: 'soccer/eng.1',          name: 'Premier League',        emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England'  },
  { id: 40,  slug: 'soccer/eng.2',          name: 'Championship',          emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England'  },
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

// Fetch a league from ESPN — prefer today's live/scheduled, then look ahead
async function fetchLeagueMatches(cfg: LeagueCfg, limit: number): Promise<Match[]> {
  // 1. Today: live + scheduled (exclude finished)
  const todayJson = await espnFetch(`/${cfg.slug}/scoreboard`);
  let events: any[] = (todayJson?.events ?? []).filter((e: any) => e.status?.type?.state !== 'post');

  // 2. Nothing today → look ahead 14 days (single range request)
  if (events.length === 0) {
    const fwdJson = await espnFetch(`/${cfg.slug}/scoreboard?dates=${espnDate(1)}-${espnDate(14)}`);
    events = fwdJson?.events ?? [];
  }

  // 3. Last resort: recent finished games (backward 3 days)
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

// Returns the Monday→Sunday range of the current calendar week as YYYYMMDD strings
function currentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - daysFromMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return { start: fmt(mon), end: fmt(sun) };
}

/** All matches (finished + scheduled) for a league during the current Mon–Sun week */
export async function fetchWeekMatches(leagueId: number): Promise<Match[]> {
  const cfg = FOOTBALL_LEAGUES.find(l => l.id === leagueId);
  if (!cfg) return [];
  const { start, end } = currentWeekRange();
  const json = await espnFetch(`/${cfg.slug}/scoreboard?dates=${start}-${end}`);
  const events: any[] = json?.events ?? [];
  if (events.length > 0) {
    return parseEspnFootballEvents(events, cfg)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  // Fallback: today's scoreboard (live + nearby)
  const todayJson = await espnFetch(`/${cfg.slug}/scoreboard`);
  const todayEvents: any[] = todayJson?.events ?? [];
  if (todayEvents.length > 0) return parseEspnFootballEvents(todayEvents, cfg);
  return getMockMatches(leagueId, 10);
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
  { slug: 'tennis/atp-singles', altSlug: 'tennis/atp', name: 'ATP Tour', emoji: '🎾', country: 'International', baseId: 30000 },
  { slug: 'tennis/wta-singles', altSlug: 'tennis/wta', name: 'WTA Tour', emoji: '🎾', country: 'International', baseId: 31000 },
];

function parseTennisMatch(ev: any, comp: any, tour: typeof TENNIS_LEAGUES[0]): Match | null {
  const p1 = comp.competitors?.[0];
  const p2 = comp.competitors?.[1];
  if (!p1 || !p2) return null;
  // Prefer comp-level status, fallback to event-level
  const rawState = comp.status?.type?.state ?? ev.status?.type?.state ?? 'pre';
  const status = mapEspnStatus(rawState);
  const tennisClock = status === 'live'
    ? { clockDisplay: `Set ${(p1.linescores?.length ?? 0) + 1}`, period: 'live' }
    : {};
  const compId = parseInt(comp.id ?? ev.id ?? '0');
  const tournamentName = comp.tournament?.displayName ?? ev.name ?? tour.name;
  return {
    id: compId + tour.baseId,
    espnEventId: comp.id ?? ev.id,
    sport: 'tennis',
    competition: { id: tour.baseId, name: tournamentName, sport: 'tennis', country: tour.country, logo: '', emoji: tour.emoji },
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
    date: comp.date ?? ev.date ?? new Date().toISOString(),
    status,
    homeScore: status !== 'scheduled' ? (p1.score !== undefined ? parseInt(p1.score) : 0) : undefined,
    awayScore: status !== 'scheduled' ? (p2.score !== undefined ? parseInt(p2.score) : 0) : undefined,
    venue: comp.venue?.fullName ?? ev.name,
    round: comp.status?.type?.shortDetail ?? ev.status?.type?.shortDetail ?? comp.tournament?.displayName,
    ...tennisClock,
  };
}

async function fetchTennisMatchesFromESPN(): Promise<Match[]> {
  const results: Match[] = [];

  for (const tour of TENNIS_LEAGUES) {
    let events: any[] = [];

    // 1. Base scoreboard — try main slug, then alt slug
    const baseJson = await espnFetch(`/${tour.slug}/scoreboard`);
    events = baseJson?.events ?? [];

    if (events.length === 0) {
      const altJson = await espnFetch(`/${tour.altSlug}/scoreboard`);
      events = altJson?.events ?? [];
    }

    // 2. Day-by-day forward scan (today → +7 days) — try both slugs
    if (events.length === 0) {
      for (let d = 0; d <= 7 && events.length === 0; d++) {
        const json = await espnFetch(`/${tour.slug}/scoreboard?dates=${espnDate(d)}`);
        events = json?.events ?? [];
        if (events.length === 0) {
          const altJson = await espnFetch(`/${tour.altSlug}/scoreboard?dates=${espnDate(d)}`);
          events = altJson?.events ?? [];
        }
      }
    }

    // 3. Backward scan in case we're between rounds
    if (events.length === 0) {
      for (let d = 1; d <= 5 && events.length === 0; d++) {
        const json = await espnFetch(`/${tour.slug}/scoreboard?dates=${espnDate(-d)}`);
        events = json?.events ?? [];
        if (events.length === 0) {
          const altJson = await espnFetch(`/${tour.altSlug}/scoreboard?dates=${espnDate(-d)}`);
          events = altJson?.events ?? [];
        }
      }
    }

    for (const ev of events) {
      // ESPN tennis can have two shapes:
      // A) each event IS a match → competitions[0] has 2 competitors
      // B) each event IS a tournament → competitions[] is the list of matches
      const competitions: any[] = ev.competitions ?? [];
      if (competitions.length === 0) continue;

      const firstComp = competitions[0];
      const isNestedTournament = competitions.length > 1 ||
        (firstComp?.competitors?.length ?? 0) === 2;

      if (isNestedTournament && competitions.length > 1) {
        // Shape B: tournament — iterate all matches
        for (const comp of competitions.slice(0, 15)) {
          const m = parseTennisMatch(ev, comp, tour);
          if (m) results.push(m);
        }
      } else {
        // Shape A: event is the match
        const m = parseTennisMatch(ev, firstComp, tour);
        if (m) results.push(m);
      }

      if (results.length >= 20) break;
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// TENNIS — TheSportsDB (primary, free, no key) + ESPN fallback
// ─────────────────────────────────────────────────────────────────────────────
const sdbCache = new Map<string, { data: any; ts: number }>();
const SDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

async function sdbFetch(path: string): Promise<any> {
  const hit = sdbCache.get(path);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  try {
    const res = await fetch(`${SDB_BASE}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    sdbCache.set(path, { data: json, ts: Date.now() });
    return json;
  } catch { return null; }
}

async function fetchTennisFromSportsDB(): Promise<Match[]> {
  const results: Match[] = [];
  const seen = new Set<string>();

  // Scan past 2 days (ongoing tournaments) + today + next 4 days
  for (let d = -2; d <= 4 && results.length < 20; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    const json = await sdbFetch(`/eventsday.php?d=${dateStr}&s=Tennis`);
    const events: any[] = json?.events ?? [];

    for (const ev of events) {
      if (!ev.strHomeTeam || !ev.strAwayTeam) continue;
      const key = `${ev.strHomeTeam}-${ev.strAwayTeam}-${ev.dateEvent}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isFinished = ev.strStatus === 'Match Finished' || (ev.intHomeScore !== null && ev.intHomeScore !== '');
      const isLive     = ev.strStatus === 'In Progress' || ev.strStatus === 'HT';
      const status: Match['status'] = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';

      const matchId = parseInt(ev.idEvent ?? '0');
      const homeName = ev.strHomeTeam ?? 'Player 1';
      const awayName = ev.strAwayTeam ?? 'Player 2';

      results.push({
        id: matchId + 40000,
        sport: 'tennis',
        competition: {
          id: parseInt(ev.idLeague ?? '0'),
          name: ev.strLeague ?? ev.strSport ?? 'Tennis',
          sport: 'tennis',
          country: 'International',
          logo: '',
          emoji: '🎾',
        },
        homeTeam: {
          id: matchId * 2,
          name: homeName,
          shortName: homeName.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'P1',
        },
        awayTeam: {
          id: matchId * 2 + 1,
          name: awayName,
          shortName: awayName.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'P2',
        },
        date: ev.dateEvent && ev.strTime
          ? `${ev.dateEvent}T${ev.strTime}`
          : (ev.dateEvent ? `${ev.dateEvent}T12:00:00` : new Date().toISOString()),
        status,
        homeScore: (isFinished || isLive) && ev.intHomeScore !== null ? parseInt(ev.intHomeScore) : undefined,
        awayScore: (isFinished || isLive) && ev.intAwayScore !== null ? parseInt(ev.intAwayScore) : undefined,
        venue: ev.strVenue ?? undefined,
        round: ev.strRound ?? undefined,
      });
    }
  }

  return results;
}

// api-sports.io tennis status → our status
const TENNIS_FINISHED = new Set(['FT', 'AOT', 'AO', 'WO', 'RET', 'INT', 'CANC', 'ABD', 'AWD']);
const TENNIS_LIVE     = new Set(['LIVE', 'S1', 'S2', 'S3', 'S4', 'S5', 'BREAK', 'TIE']);

async function fetchTennisFromApiSports(): Promise<Match[]> {
  const results: Match[] = [];
  const seen = new Set<string>();

  // Scan today + next 3 days; stop as soon as we have matches
  for (let d = 0; d <= 3 && results.length < 20; d++) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + d);
    const dateStr = dateObj.toISOString().slice(0, 10);

    const json = await proxyFetch('tennis', `/games?date=${dateStr}`);
    const games: any[] = json?.response ?? [];

    for (const game of games) {
      const hp = game.players?.home;
      const ap = game.players?.away;
      if (!hp?.name || !ap?.name) continue;

      const key = `${hp.name}-${ap.name}-${game.date ?? dateStr}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const short  = game.status?.short ?? 'NS';
      const status: Match['status'] = TENNIS_FINISHED.has(short)
        ? 'finished' : TENNIS_LIVE.has(short) ? 'live' : 'scheduled';

      const gameId   = parseInt(game.id ?? '0');
      const homeName = String(hp.name);
      const awayName = String(ap.name);
      // api-sports returns "C. Alcaraz" — use the last token as shortName
      const shortOf  = (n: string) => n.split(' ').pop()?.slice(0, 4).toUpperCase() ?? n.slice(0, 3).toUpperCase();

      results.push({
        id: gameId + 50000,
        sport: 'tennis',
        competition: {
          id: parseInt(game.league?.id ?? '0'),
          name: game.tournament?.name ?? game.league?.name ?? 'Tennis',
          sport: 'tennis',
          country: game.country?.name ?? 'International',
          logo: game.league?.logo ?? '',
          emoji: '🎾',
        },
        homeTeam: {
          id: parseInt(hp.id ?? '0'),
          name: homeName,
          shortName: shortOf(homeName),
          logo: hp.photo ?? undefined,
        },
        awayTeam: {
          id: parseInt(ap.id ?? '0'),
          name: awayName,
          shortName: shortOf(awayName),
          logo: ap.photo ?? undefined,
        },
        date: game.date && game.time
          ? `${game.date}T${game.time}:00`
          : `${game.date ?? dateStr}T12:00:00`,
        status,
        homeScore: status !== 'scheduled' && game.scores?.home?.current != null
          ? parseInt(game.scores.home.current) : undefined,
        awayScore: status !== 'scheduled' && game.scores?.away?.current != null
          ? parseInt(game.scores.away.current) : undefined,
        round: game.league?.name ?? undefined,
      });
    }
  }

  return results;
}

export async function fetchTennisMatches(): Promise<Match[]> {
  // 1. api-sports.io via Supabase proxy — same key as football, real data
  const apiSports = await fetchTennisFromApiSports();
  if (apiSports.length > 0) return apiSports;

  // 2. TheSportsDB — free public API
  const sdb = await fetchTennisFromSportsDB();
  if (sdb.length > 0) return sdb;

  // 3. ESPN fallback
  const espn = await fetchTennisMatchesFromESPN();
  if (espn.length > 0) return espn;

  // 4. Last resort: mocks
  return getMockMatchesBySport('tennis');
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
// GOLF — ESPN (tournaments with leaderboard)
// ─────────────────────────────────────────────────────────────────────────────
function parseGolfScore(score: string): number {
  if (!score || score === '--' || score === 'WD' || score === 'CUT' || score === 'MC') return 9999;
  if (score === 'E') return 0;
  const n = parseInt(score.replace('+', ''));
  return isNaN(n) ? 9999 : n;
}

export async function fetchGolfMatches(): Promise<Match[]> {
  const results: Match[] = [];
  const golfTours = [
    { slug: 'golf/pga',  name: 'PGA Tour',      emoji: '⛳', country: 'USA',    id: 200, baseId: 50000 },
    { slug: 'golf/euro', name: 'DP World Tour',  emoji: '🌍', country: 'Europe', id: 201, baseId: 51000 },
  ];

  for (const tour of golfTours) {
    let events: any[] = [];

    // Current scoreboard (active tournament)
    const json = await espnFetch(`/${tour.slug}/scoreboard`);
    events = json?.events ?? [];

    // If nothing active, look ahead up to 3 weeks
    if (events.length === 0) {
      for (let w = 1; w <= 3 && events.length === 0; w++) {
        const j = await espnFetch(`/${tour.slug}/scoreboard?dates=${espnDate(w * 7 - 6)}-${espnDate(w * 7)}`);
        events = j?.events ?? [];
      }
    }

    for (const ev of events.slice(0, 3)) {
      const comp    = ev.competitions?.[0];
      // ESPN golf competitors are already sorted by leaderboard position
      const players: any[] = comp?.competitors ?? [];
      const status  = mapEspnStatus(ev.status?.type?.state ?? 'pre');

      const leaderboard: Match['leaderboard'] = players.slice(0, 10).map((p: any) => ({
        pos:   p.status?.type?.shortDetail ?? '-',
        name:  p.athlete?.displayName ?? p.athlete?.shortName ?? 'Player',
        score: p.score ?? 'E',
        thru:  String(p.thru ?? p.status?.type?.detail ?? '-'),
      }));

      const leader = players[0];
      const second = players[1];

      results.push({
        id: parseInt(ev.id ?? '0') + tour.baseId,
        espnEventId: ev.id,
        sport: 'golf',
        competition: { id: tour.id, name: ev.name ?? tour.name, sport: 'golf', country: tour.country, logo: '', emoji: tour.emoji },
        homeTeam: {
          id: parseInt(leader?.id ?? '0'),
          name: leader?.athlete?.displayName ?? 'TBD',
          shortName: leader?.athlete?.shortName ?? leader?.athlete?.displayName?.split(' ').pop()?.slice(0, 4) ?? 'TBD',
        },
        awayTeam: {
          id: parseInt(second?.id ?? '1'),
          name: second?.athlete?.displayName ?? 'Field',
          shortName: second?.athlete?.shortName ?? second?.athlete?.displayName?.split(' ').pop()?.slice(0, 4) ?? 'FLD',
        },
        date: ev.date ?? new Date().toISOString(),
        status,
        homeScore: leader ? parseGolfScore(leader.score ?? 'E') : undefined,
        awayScore: second ? parseGolfScore(second.score ?? 'E') : undefined,
        venue: comp?.venue?.fullName ?? ev.name,
        round: ev.status?.type?.shortDetail,
        leaderboard: leaderboard.length > 0 ? leaderboard : undefined,
        totalPlayers: players.length > 0 ? players.length : undefined,
      });
    }
  }

  return results.length > 0 ? results : getMockMatchesBySport('golf');
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-FOOTBALL STATS — real per-team data from ESPN schedule/eventlog endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes real historical percentages from a FormMatch array.
 * - football  → btts (both scored), over25 (total > 2.5), cleanSheets (0 conceded)
 * - basketball → over25 stores Over-210.5% (total pts > 210.5); btts is irrelevant
 * - tennis    → over25 stores Over-2.5-sets% (total sets > 2); btts irrelevant
 * All values are 0-100 integers. Returns 50/50 defaults when form is empty.
 */
function computeFormStats(
  form: FormMatch[],
  sport: string
): { btts: number; over25: number; cleanSheets: number } {
  if (form.length === 0) return { btts: 50, over25: 50, cleanSheets: 0 };
  let btts = 0, over = 0, cs = 0;
  for (const f of form) {
    const total = f.goalsFor + f.goalsAgainst;
    if (sport === 'basketball') {
      if (total > 210.5) over++;
    } else if (sport === 'tennis') {
      if (total > 2) over++;   // 3-set match
    } else {
      // football
      if (f.goalsFor > 0 && f.goalsAgainst > 0) btts++;
      if (total > 2.5) over++;
      if (f.goalsAgainst === 0) cs++;
    }
  }
  const n = form.length;
  return {
    btts:        Math.round((btts / n) * 100),
    over25:      Math.round((over / n) * 100),
    cleanSheets: Math.round((cs   / n) * 100),
  };
}

/**
 * Safe team-name comparison.
 * Strips punctuation, requires ≥4 chars for partial/last-word matches.
 * Never matches empty strings (avoids the classic `"any".includes("") === true` trap).
 */
function teamNameMatch(espnName: string, searchName: string): boolean {
  if (!espnName || !searchName) return false;
  const clean = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  const a = clean(espnName);
  const b = clean(searchName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  const sigLast = (s: string) => s.split(' ').filter(w => w.length >= 4).pop() ?? '';
  const aLast = sigLast(a);
  const bLast = sigLast(b);
  return !!aLast && !!bLast && aLast === bLast;
}

/**
 * Resolves the real ESPN team/athlete ID by searching the ESPN roster.
 * Returns 0 if not found.
 */
async function resolveEspnId(name: string, sport: string): Promise<number> {
  try {
    if (sport === 'basketball') {
      const json = await espnFetch('/basketball/nba/teams?limit=100');
      const teams: any[] = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
      for (const t of teams) {
        const team = t.team ?? t;
        if (
          teamNameMatch(team.displayName, name) ||
          teamNameMatch(team.shortDisplayName, name) ||
          teamNameMatch(team.name, name)
        ) return parseInt(team.id ?? '0');
      }
    }
    if (sport === 'tennis') {
      for (const slug of ['tennis/atp-singles', 'tennis/wta-singles']) {
        const json = await espnFetch(`/${slug}/athletes?limit=300`);
        const athletes: any[] = json?.athletes ?? [];
        for (const a of athletes) {
          if (teamNameMatch(a.displayName, name) || teamNameMatch(a.shortName, name))
            return parseInt(a.id ?? '0');
        }
      }
    }
  } catch { /* */ }
  return 0;
}

/** Extract FormMatch entries from an NBA team schedule response. */
function extractBasketballForm(events: any[], espnTeamId: number): FormMatch[] {
  const form: FormMatch[] = [];
  // Sort descending by date, take last 5 completed
  const completed = [...events]
    .filter((ev: any) => {
      const state = ev.status?.type?.state ?? ev.competitions?.[0]?.status?.type?.state;
      return state === 'post';
    })
    .sort((a: any, b: any) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 5);

  for (const ev of completed) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;
    const homeId  = parseInt(home.team?.id ?? '0');
    const isHome  = homeId === espnTeamId;
    const us      = isHome ? home : away;
    const them    = isHome ? away : home;
    const ourScore   = Number(us.score)   || 0;
    const theirScore = Number(them.score) || 0;
    if (ourScore === 0 && theirScore === 0) continue;
    form.push({
      opponent:     them.team?.displayName ?? 'Opponent',
      result:       ourScore > theirScore ? 'W' : ourScore < theirScore ? 'L' : 'D',
      goalsFor:     ourScore,
      goalsAgainst: theirScore,
      date:         ev.date ?? comp.date ?? new Date().toISOString(),
      isHome,
    });
  }
  return form;
}

export async function fetchNonFootballStats(
  teamId: number, teamName: string, sport: string
): Promise<TeamStats> {
  const sn = (n: string) =>
    n.split(' ').length > 1
      ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
      : n.slice(0, 3).toUpperCase();

  // ── BASKETBALL ──────────────────────────────────────────────────────────────
  if (sport === 'basketball') {
    let form: FormMatch[] = [];

    // Strategy 1: Direct schedule endpoint with the given teamId
    try {
      const json = await espnFetch(`/basketball/nba/teams/${teamId}/schedule`);
      const events: any[] = json?.events ?? [];
      if (events.length > 0) form = extractBasketballForm(events, teamId);
    } catch { /* */ }

    // Strategy 2: Resolve real ESPN team ID by name, then fetch schedule
    if (form.length === 0) {
      const espnId = await resolveEspnId(teamName, 'basketball');
      if (espnId > 0) {
        try {
          const json = await espnFetch(`/basketball/nba/teams/${espnId}/schedule`);
          const events: any[] = json?.events ?? [];
          if (events.length > 0) form = extractBasketballForm(events, espnId);
        } catch { /* */ }
      }
    }

    // Strategy 3: Scoreboard day-by-day scan (backward up to 14 days)
    if (form.length === 0) {
      const seen = new Set<string>();
      for (let d = 1; d <= 14 && form.length < 5; d++) {
        try {
          const json = await espnFetch(`/basketball/nba/scoreboard?dates=${espnDate(-d)}`);
          const events: any[] = json?.events ?? [];
          for (const ev of events) {
            if (form.length >= 5) break;
            const state = ev.status?.type?.state ?? ev.competitions?.[0]?.status?.type?.state;
            if (state !== 'post') continue;
            const comp = ev.competitions?.[0];
            const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
            const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
            if (!home || !away) continue;
            const homeEspnId = parseInt(home.team?.id ?? '0');
            const awayEspnId = parseInt(away.team?.id ?? '0');
            const isHomeTeam = (homeEspnId > 0 && homeEspnId === teamId) || teamNameMatch(home.team?.displayName, teamName);
            const isAwayTeam = (awayEspnId > 0 && awayEspnId === teamId) || teamNameMatch(away.team?.displayName, teamName);
            if (!isHomeTeam && !isAwayTeam) continue;
            if (seen.has(ev.id)) continue;
            seen.add(ev.id);
            const isHome     = isHomeTeam;
            const us         = isHome ? home : away;
            const them       = isHome ? away : home;
            const ourScore   = Number(us.score)   || 0;
            const theirScore = Number(them.score) || 0;
            if (ourScore === 0 && theirScore === 0) continue;
            form.push({
              opponent:     them.team?.displayName ?? 'Opponent',
              result:       ourScore > theirScore ? 'W' : ourScore < theirScore ? 'L' : 'D',
              goalsFor:     ourScore,
              goalsAgainst: theirScore,
              date:         ev.date ?? new Date().toISOString(),
              isHome,
            });
          }
        } catch { /* skip day */ }
      }
    }

    if (form.length >= 1) {
      const avgFor     = form.reduce((s, f) => s + f.goalsFor,     0) / form.length;
      const avgAgainst = form.reduce((s, f) => s + f.goalsAgainst, 0) / form.length;
      const wins       = form.filter(f => f.result === 'W').length;
      const homeGames  = form.filter(f => f.isHome);
      const awayGames  = form.filter(f => !f.isHome);
      const bkFormStats = computeFormStats(form, 'basketball');
      return {
        team: { id: teamId, name: teamName, shortName: sn(teamName) },
        form,
        goalsScored:   parseFloat(avgFor.toFixed(1)),
        goalsConceded: parseFloat(avgAgainst.toFixed(1)),
        cleanSheets: 0,
        btts:   bkFormStats.btts,    // % partidos con >210.5 pts combinados
        over25: bkFormStats.over25,  // % partidos con >210.5 pts combinados
        homeRecord: { w: homeGames.filter(f => f.result === 'W').length, d: 0, l: homeGames.filter(f => f.result === 'L').length },
        awayRecord:  { w: awayGames.filter(f => f.result === 'W').length, d: 0, l: awayGames.filter(f => f.result === 'L').length },
      };
    }
  }

  // ── TENNIS ──────────────────────────────────────────────────────────────────
  if (sport === 'tennis') {
    const form: FormMatch[] = [];
    const seen = new Set<string>();
    const tennisSlugs = ['tennis/atp-singles', 'tennis/wta-singles'];

    // Strategy 1: Resolve athlete ID and fetch their event log
    const espnAthleteId = teamId > 0 && teamId < 100000
      ? teamId
      : await resolveEspnId(teamName, 'tennis');

    if (espnAthleteId > 0) {
      for (const slug of tennisSlugs) {
        if (form.length >= 5) break;
        try {
          const json = await espnFetch(`/${slug}/athletes/${espnAthleteId}/eventlog`);
          const events: any[] = json?.events?.previous ?? json?.events ?? [];
          for (const ev of [...events].reverse()) {
            if (form.length >= 5) break;
            const competitions: any[] = ev.competitions ?? [ev];
            for (const comp of competitions) {
              if (form.length >= 5) break;
              const state = comp.status?.type?.state ?? ev.status?.type?.state;
              if (state !== 'post') continue;
              const p1 = comp.competitors?.[0];
              const p2 = comp.competitors?.[1];
              if (!p1 || !p2) continue;
              const p1Id = parseInt(p1.athlete?.id ?? p1.id ?? '0');
              const isP1 = p1Id === espnAthleteId || teamNameMatch(p1.athlete?.displayName ?? '', teamName);
              const us   = isP1 ? p1 : p2;
              const them = isP1 ? p2 : p1;
              const key  = `${ev.id ?? ''}-${them.athlete?.displayName}`;
              if (seen.has(key)) continue;
              seen.add(key);
              form.push({
                opponent:     them.athlete?.displayName ?? 'Opponent',
                result:       us.winner === true ? 'W' : 'L',
                goalsFor:     Number(us.score)   || 0,
                goalsAgainst: Number(them.score) || 0,
                date:         comp.date ?? ev.date ?? new Date().toISOString(),
                isHome:       true,
              });
            }
          }
        } catch { /* try next slug */ }
      }
    }

    // Strategy 2: Scoreboard day-by-day scan across all tennis slugs
    if (form.length === 0) {
      const allSlugs = ['tennis/atp-singles', 'tennis/wta-singles', 'tennis/atp', 'tennis/wta'];
      for (let d = 1; d <= 21 && form.length < 5; d++) {
        for (const slug of allSlugs) {
          if (form.length >= 5) break;
          try {
            const json = await espnFetch(`/${slug}/scoreboard?dates=${espnDate(-d)}`);
            const events: any[] = json?.events ?? [];
            for (const ev of events) {
              if (form.length >= 5) break;
              for (const comp of (ev.competitions ?? [])) {
                if (form.length >= 5) break;
                const state = comp.status?.type?.state ?? ev.status?.type?.state;
                if (state !== 'post') continue;
                const p1 = comp.competitors?.[0];
                const p2 = comp.competitors?.[1];
                if (!p1 || !p2) continue;
                const p1Id = parseInt(p1.athlete?.id ?? p1.id ?? '0');
                const p2Id = parseInt(p2.athlete?.id ?? p2.id ?? '0');
                const p1Name = p1.athlete?.displayName ?? '';
                const p2Name = p2.athlete?.displayName ?? '';
                const isP1 = (p1Id > 0 && p1Id === teamId) || teamNameMatch(p1Name, teamName);
                const isP2 = (p2Id > 0 && p2Id === teamId) || teamNameMatch(p2Name, teamName);
                if (!isP1 && !isP2) continue;
                const key = `${ev.id ?? ''}-${p1Name}-${p2Name}`;
                if (seen.has(key)) continue;
                seen.add(key);
                const us   = isP1 ? p1 : p2;
                const them = isP1 ? p2 : p1;
                form.push({
                  opponent:     them.athlete?.displayName ?? 'Opponent',
                  result:       us.winner === true ? 'W' : 'L',
                  goalsFor:     Number(us.score)   || 0,
                  goalsAgainst: Number(them.score) || 0,
                  date:         comp.date ?? ev.date ?? new Date().toISOString(),
                  isHome:       true,
                });
              }
            }
          } catch { /* skip */ }
        }
      }
    }

    if (form.length >= 1) {
      const wins = form.filter(f => f.result === 'W').length;
      const tnFormStats = computeFormStats(form, 'tennis');
      return {
        team: { id: teamId, name: teamName, shortName: teamName.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'PLY' },
        form,
        goalsScored:   parseFloat((wins / form.length * 2).toFixed(2)),
        goalsConceded: parseFloat(((form.length - wins) / form.length * 2).toFixed(2)),
        cleanSheets: 0,
        btts:   tnFormStats.btts,    // % partidos a 3 sets
        over25: tnFormStats.over25,  // % partidos a 3 sets
        homeRecord: { w: wins, d: 0, l: form.length - wins },
        awayRecord:  { w: wins, d: 0, l: form.length - wins },
      };
    }
  }

  // Absolute last resort — all ESPN strategies returned zero data
  return getMockStatsBySport(teamId, teamName, sport);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM STATS (api-sports via proxy — only called when user opens analysis)
// ─────────────────────────────────────────────────────────────────────────────
export async function getApiStatus() {
  const json = await proxyFetch('football', '/status');
  if (!json) return null;
  return { remaining: json.response?.requests?.current ?? 0, limit: json.response?.requests?.limit_day ?? 100 };
}

/**
 * Scans the ESPN football scoreboard backward up to 21 days across ALL
 * configured leagues to find real completed games for the given team.
 * Per-day we fetch all leagues in parallel so that games played in any
 * competition (league, cups, continental) are captured in chronological order.
 */
async function fetchFootballFormFromEspn(
  teamId: number, teamName: string, leagueId: number
): Promise<FormMatch[]> {
  const form: FormMatch[] = [];
  const seen = new Set<string>();

  // Own league first so its scoreboard hits the cache when already loaded
  const ownSlug = FOOTBALL_LEAGUES.find(l => l.id === leagueId)?.slug;
  const allSlugs = [
    ...(ownSlug ? [ownSlug] : []),
    ...FOOTBALL_LEAGUES.filter(l => l.slug !== ownSlug).map(l => l.slug),
  ];

  // Iterate day by day (most recent first). For each day fetch ALL leagues
  // concurrently so we don't miss a Champions League/Europa match played
  // on the same day as a league fixture.
  // Collect up to 10 so that when filtering by one competition we can always
  // show 5 matches even if the team also played in other cups/leagues.
  for (let d = 1; d <= 35 && form.length < 10; d++) {
    const dateStr = espnDate(-d);
    // Fetch all leagues for this day in parallel, preserving slug context
    const results = await Promise.allSettled(
      allSlugs.map(async slug => ({ slug, json: await espnFetch(`/${slug}/scoreboard?dates=${dateStr}`) }))
    );

    for (const res of results) {
      if (form.length >= 10) break;
      if (res.status !== 'fulfilled' || !res.value?.json) continue;
      const { slug, json } = res.value;
      const cfg = FOOTBALL_LEAGUES.find(l => l.slug === slug);
      const competitionName = cfg?.name ?? slug.split('/').pop() ?? 'Cup';
      const events: any[] = json.events ?? [];

      for (const ev of events) {
        if (form.length >= 10) break;
        const state = ev.status?.type?.state ?? ev.competitions?.[0]?.status?.type?.state;
        if (state !== 'post') continue;
        const comp = ev.competitions?.[0];
        const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
        const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
        if (!home || !away) continue;
        const homeEspnId = parseInt(home.team?.id ?? '0');
        const awayEspnId = parseInt(away.team?.id ?? '0');
        const isHomeTeam = (homeEspnId > 0 && homeEspnId === teamId) || teamNameMatch(home.team?.displayName, teamName);
        const isAwayTeam = (awayEspnId > 0 && awayEspnId === teamId) || teamNameMatch(away.team?.displayName, teamName);
        if (!isHomeTeam && !isAwayTeam) continue;
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        const isHome     = isHomeTeam;
        const us         = isHome ? home : away;
        const them       = isHome ? away : home;
        const ourScore   = Number(us.score)   || 0;
        const theirScore = Number(them.score) || 0;
        if (ourScore === 0 && theirScore === 0) continue;
        form.push({
          opponent:     them.team?.displayName ?? 'Opponent',
          result:       ourScore > theirScore ? 'W' : ourScore < theirScore ? 'L' : 'D',
          goalsFor:     ourScore,
          goalsAgainst: theirScore,
          date:         ev.date ?? new Date().toISOString(),
          isHome,
          competition:  competitionName,
        });
      }
    }
  }
  return form;
}

export async function fetchTeamStats(teamId: number, teamName: string, leagueId: number): Promise<TeamStats | null> {
  const [statsJson, formJson] = await Promise.all([
    proxyFetch('football', `/teams/statistics?team=${teamId}&league=${leagueId}&season=${SEASON}`),
    proxyFetch('football', `/fixtures?team=${teamId}&season=${SEASON}&last=10`),
  ]);
  // Primary: api-sports proxy returned stats
  if (statsJson) {
    return mapApiStatsToTeamStats(statsJson.response, formJson?.response ?? [], teamId);
  }

  // Secondary: proxy failed — try ESPN football scoreboard for real recent form
  const espnForm = await fetchFootballFormFromEspn(teamId, teamName, leagueId);
  if (espnForm.length >= 1) {
    const scored   = espnForm.reduce((s, f) => s + f.goalsFor,     0) / espnForm.length;
    const conceded = espnForm.reduce((s, f) => s + f.goalsAgainst, 0) / espnForm.length;
    const sn       = teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'TEM';
    const fs       = computeFormStats(espnForm, 'football');
    const hG       = espnForm.filter(f => f.isHome);
    const aG       = espnForm.filter(f => !f.isHome);
    return {
      team: { id: teamId, name: teamName, shortName: sn },
      form: espnForm,
      goalsScored:   parseFloat(scored.toFixed(2)),
      goalsConceded: parseFloat(conceded.toFixed(2)),
      cleanSheets: fs.cleanSheets, btts: fs.btts, over25: fs.over25,
      possession: undefined, shotsOnTarget: undefined,
      homeRecord: { w: hG.filter(f => f.result === 'W').length, d: hG.filter(f => f.result === 'D').length, l: hG.filter(f => f.result === 'L').length },
      awayRecord:  { w: aG.filter(f => f.result === 'W').length, d: aG.filter(f => f.result === 'D').length, l: aG.filter(f => f.result === 'L').length },
    };
  }

  // Last resort — no data from any source
  return getMockStatsBySport(teamId, teamName, 'football');
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
    return { opponent: isHome ? f.teams.away.name : f.teams.home.name, opponentLogo: isHome ? f.teams.away.logo : f.teams.home.logo, result, goalsFor: gf ?? 0, goalsAgainst: ga ?? 0, date: f.fixture.date, isHome, competition: f.league?.name as string | undefined };
  });
  const gs = stats?.goals?.for?.average?.total ?? '1.5';
  const gc = stats?.goals?.against?.average?.total ?? '1.2';
  // Compute real BTTS% and Over-2.5% from the actual match results
  const formStats = computeFormStats(form, 'football');
  return {
    team: { id: teamId, name: stats?.team?.name ?? 'Team', shortName: (stats?.team?.name ?? 'TEM').slice(0, 3).toUpperCase(), logo: stats?.team?.logo },
    form, goalsScored: parseFloat(gs), goalsConceded: parseFloat(gc),
    cleanSheets: stats?.clean_sheet?.total ?? formStats.cleanSheets,
    btts:  formStats.btts,
    over25: formStats.over25,
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
    { id: 2004, sport: 'basketball', competition: { id: 12, name: 'NBA', sport: 'basketball', country: 'USA', logo: '', emoji: '🏀' }, homeTeam: { id: 107, name: 'Los Angeles Lakers', shortName: 'LAL' }, awayTeam: { id: 108, name: 'Memphis Grizzlies', shortName: 'MEM' }, date: d(1, 22, 30), status: 'scheduled', venue: 'Crypto.com Arena' },
  ];

  if (sport === 'f1') return [
    { id: 4001, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 401, name: 'Australian Grand Prix', shortName: 'AUS' }, awayTeam: { id: 402, name: 'Melbourne — Albert Park', shortName: 'MEL' }, date: '2026-03-15T06:00:00+00:00', status: 'scheduled', venue: 'Albert Park Circuit, Melbourne' },
    { id: 4002, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 403, name: 'Chinese Grand Prix', shortName: 'CHN' }, awayTeam: { id: 404, name: 'Shanghai Int. Circuit', shortName: 'SHA' }, date: '2026-03-22T07:00:00+00:00', status: 'scheduled', venue: 'Shanghai International Circuit' },
    { id: 4003, sport: 'f1', competition: { id: 1, name: 'Formula 1 2026', sport: 'f1', country: 'Global', logo: '', emoji: '🏎️' }, homeTeam: { id: 405, name: 'Japanese Grand Prix', shortName: 'JPN' }, awayTeam: { id: 406, name: 'Suzuka Int. Racing Course', shortName: 'SUZ' }, date: '2026-04-05T05:00:00+00:00', status: 'scheduled', venue: 'Suzuka International Racing Course' },
  ];

  if (sport === 'golf') return [
    {
      id: 5001, sport: 'golf',
      competition: { id: 200, name: 'Valero Texas Open', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' },
      homeTeam: { id: 501, name: 'Scottie Scheffler', shortName: 'SCH' },
      awayTeam: { id: 502, name: 'Rory McIlroy', shortName: 'MCI' },
      date: d(0, 14), status: 'live', venue: 'TPC San Antonio (Oaks Course)', round: 'Round 3',
      leaderboard: [
        { pos: '1',   name: 'Scottie Scheffler',  score: '-12', thru: 'F'  },
        { pos: 'T2',  name: 'Rory McIlroy',        score: '-9',  thru: 'F'  },
        { pos: 'T2',  name: 'Collin Morikawa',     score: '-9',  thru: '15' },
        { pos: '4',   name: 'Xander Schauffele',   score: '-8',  thru: '12' },
        { pos: 'T5',  name: 'Jon Rahm',            score: '-7',  thru: 'F'  },
        { pos: 'T5',  name: 'Wyndham Clark',       score: '-7',  thru: '9'  },
      ],
      totalPlayers: 156,
    },
    {
      id: 5002, sport: 'golf',
      competition: { id: 200, name: 'The Masters Tournament', sport: 'golf', country: 'USA', logo: '', emoji: '⛳' },
      homeTeam: { id: 503, name: 'TBD', shortName: 'TBD' },
      awayTeam: { id: 504, name: 'Field', shortName: 'FLD' },
      date: '2026-04-09T14:00:00+00:00', status: 'scheduled',
      venue: 'Augusta National Golf Club', round: 'April 9–12, 2026',
      totalPlayers: 88,
    },
    {
      id: 5003, sport: 'golf',
      competition: { id: 201, name: 'Porsche European Open', sport: 'golf', country: 'Germany', logo: '', emoji: '🌍' },
      homeTeam: { id: 505, name: 'Tommy Fleetwood', shortName: 'FLT' },
      awayTeam: { id: 506, name: 'Shane Lowry', shortName: 'LOW' },
      date: d(7, 12), status: 'scheduled',
      venue: 'Hamburg Country Club', round: d(7, 12).slice(0, 10),
      totalPlayers: 120,
    },
  ];

  return getMockMatches(2, 6);
}

const MOCK_TEAMS = [
  { id: 541, name: 'Real Madrid', shortName: 'RMA' }, { id: 529, name: 'FC Barcelona', shortName: 'BAR' },
  { id: 50, name: 'Manchester City', shortName: 'MCI' }, { id: 42, name: 'Arsenal', shortName: 'ARS' },
];

function getMockTeamStats(teamId: number): TeamStats {
  const team = MOCK_TEAMS.find(t => t.id === teamId) ?? MOCK_TEAMS[0];
  // Vary form pattern per team so home and away don't look identical
  const formPatterns: FormMatch['result'][][] = [
    ['W','W','D','W','L'],
    ['W','L','W','W','D'],
    ['D','W','W','L','W'],
    ['L','W','W','D','W'],
    ['W','W','L','W','W'],
    ['W','D','L','W','W'],
  ];
  const results = formPatterns[teamId % formPatterns.length];
  const opponents = MOCK_TEAMS.filter(t => t.id !== teamId).slice(0, 5);
  const now = Date.now();
  const form: FormMatch[] = results.map((result, i) => ({
    opponent: opponents[i]?.name ?? 'Opponent', result,
    goalsFor: result === 'W' ? 2 : result === 'D' ? 1 : 0, goalsAgainst: result === 'L' ? 2 : result === 'D' ? 1 : 0,
    date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0,
  }));
  const wins = results.filter(r => r === 'W').length;
  const scored = 1.2 + (wins / results.length) * 1.2;
  const conceded = 1.8 - (wins / results.length) * 0.9;
  return { team: { id: team.id, name: team.name, shortName: team.shortName }, form, goalsScored: parseFloat(scored.toFixed(2)), goalsConceded: parseFloat(conceded.toFixed(2)), cleanSheets: wins, btts: 40 + teamId % 25, over25: 45 + teamId % 30, possession: 48 + teamId % 15, shotsOnTarget: 4 + teamId % 4, homeRecord: { w: wins + 1, d: 1, l: results.length - wins }, awayRecord: { w: Math.max(0, wins - 1), d: 2, l: results.length - wins + 1 } };
}

export function getMockStatsBySport(teamId: number, teamName: string, sport: string): TeamStats {
  const shortName = (teamName || 'TEM').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'TEM';
  // Vary form pattern by teamId
  const formPatterns: FormMatch['result'][][] = [
    ['W','W','L','W','W'],
    ['W','L','W','W','D'],
    ['D','W','W','L','W'],
    ['L','W','W','D','W'],
    ['W','D','W','L','W'],
    ['L','W','D','W','W'],
    ['W','W','W','L','D'],
    ['D','L','W','W','W'],
  ];
  const results = formPatterns[teamId % formPatterns.length];

  // Large opponent pools — pick 5 unique opponents based on teamId so each team sees different opponents
  const allBasketball = [
    'Los Angeles Lakers','Boston Celtics','Miami Heat','Denver Nuggets','Milwaukee Bucks',
    'Golden State Warriors','Phoenix Suns','Dallas Mavericks','Brooklyn Nets','Chicago Bulls',
    'Philadelphia 76ers','Cleveland Cavaliers','Memphis Grizzlies','New Orleans Pelicans','Atlanta Hawks',
    'Toronto Raptors','Minnesota Timberwolves','Sacramento Kings','Oklahoma City Thunder','Indiana Pacers',
  ];
  const allTennis = [
    'D. Medvedev','A. Zverev','A. Rublev','T. Fritz','S. Tsitsipas',
    'H. Hurkacz','C. Ruud','F. Auger-Aliassime','B. Shelton','U. Humbert',
    'J. Sinner','C. Alcaraz','N. Djokovic','A. Musetti','G. Dimitrov',
  ];
  const allF1 = [
    'M. Verstappen','L. Hamilton','C. Leclerc','L. Norris','C. Sainz',
    'G. Russell','F. Alonso','O. Piastri','L. Stroll','V. Bottas',
    'E. Ocon','P. Gasly','Y. Tsunoda','N. Hülkenberg','K. Magnussen',
  ];

  // Deterministic shuffle based on teamId — pick 5 opponents that are NOT this team's name
  function pickOpponents(pool: string[], count: number): string[] {
    const cleanSelf = teamName.toLowerCase().trim();
    const available = pool.filter(p => !p.toLowerCase().includes(cleanSelf.split(' ').pop() ?? ''));
    const start = (teamId * 7 + 3) % Math.max(1, available.length);
    const picked: string[] = [];
    for (let i = 0; picked.length < count && i < available.length; i++) {
      picked.push(available[(start + i) % available.length]);
    }
    // If pool is too small, fill with generic names
    while (picked.length < count) picked.push(`Rival ${picked.length + 1}`);
    return picked;
  }

  const allFootball = [
    'Real Madrid','FC Barcelona','Atletico Madrid','Sevilla FC','Real Betis',
    'Villarreal','Athletic Club','Real Sociedad','Valencia','Getafe',
    'Manchester City','Arsenal','Liverpool','Chelsea','Manchester United',
    'Tottenham','Newcastle','Aston Villa','Inter Milan','AC Milan',
    'Juventus','Napoli','Roma','Lazio','Bayern Munich',
    'Borussia Dortmund','Bayer Leverkusen','RB Leipzig','Paris Saint-Germain','Marseille',
    'Benfica','Porto','Sporting CP','Ajax','Feyenoord',
    'Celtic','Rangers','Club Brugge','Galatasaray','Fenerbahce',
  ];
  const opponents: string[] = sport === 'tennis'
    ? pickOpponents(allTennis, 5)
    : sport === 'basketball'
    ? pickOpponents(allBasketball, 5)
    : sport === 'f1'
    ? pickOpponents(allF1, 5)
    : pickOpponents(allFootball, 5);
  const now = Date.now();
  // Sport-appropriate scores
  const form: FormMatch[] = results.map((result, i) => {
    let goalsFor: number, goalsAgainst: number;
    if (sport === 'basketball') {
      const base = 100 + (teamId % 12);
      goalsFor     = result === 'W' ? base + 8 + (i % 5) : base - 4 + (i % 3);
      goalsAgainst = result === 'L' ? base + 8 + (i % 4) : base - 5 + (i % 4);
    } else {
      goalsFor     = result === 'W' ? 2 : result === 'D' ? 1 : 0;
      goalsAgainst = result === 'L' ? 2 : result === 'D' ? 1 : 0;
    }
    return { opponent: opponents[i] ?? 'Opponent', result, goalsFor, goalsAgainst, date: new Date(now - (i + 1) * 7 * 86400000).toISOString(), isHome: i % 2 === 0 };
  });
  const wins = results.filter(r => r === 'W').length;
  const scored   = sport === 'basketball'
    ? parseFloat((form.reduce((s, f) => s + f.goalsFor,     0) / form.length).toFixed(1))
    : 1.4 + (wins / results.length) * 0.9;
  const conceded = sport === 'basketball'
    ? parseFloat((form.reduce((s, f) => s + f.goalsAgainst, 0) / form.length).toFixed(1))
    : 1.8 - (wins / results.length) * 0.7;
  // Even for mock data, compute stats from the generated form so the percentages
  // reflect the W/L/score pattern rather than being hardcoded constants.
  const mockFormStats = computeFormStats(form, sport);
  return {
    team: { id: teamId, name: teamName, shortName }, form,
    goalsScored: scored, goalsConceded: conceded,
    cleanSheets: mockFormStats.cleanSheets,
    btts:   mockFormStats.btts,
    over25: mockFormStats.over25,
    possession: undefined, shotsOnTarget: undefined,
    homeRecord: { w: wins + 1, d: sport === 'basketball' ? 0 : 1, l: Math.max(0, results.length - wins - 1) },
    awayRecord:  { w: Math.max(0, wins - 1), d: sport === 'basketball' ? 0 : 1, l: Math.min(results.length, results.length - wins + 1) },
  };
}
