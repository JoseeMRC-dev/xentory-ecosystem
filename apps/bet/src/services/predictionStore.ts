// Stores AI predictions in localStorage so we can compare against real results later

const KEY = 'xentory_picks_v1';
const RETENTION_DAYS = 60;

export interface StoredPick {
  matchId: string;      // espnEventId
  leagueSlug: string;   // e.g. "soccer/esp.1"
  sport: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;    // ISO — when the match is scheduled/was played
  savedAt: string;      // ISO — when we generated the prediction
  market: 'result' | 'overUnder25' | 'btts';
  pick: string;         // 'home'|'draw'|'away' | 'over'|'under' | 'yes'|'no'
  confidence: number;
}

function load(): StoredPick[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function save(picks: StoredPick[]) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const pruned = picks.filter(p => new Date(p.savedAt).getTime() > cutoff);
  localStorage.setItem(KEY, JSON.stringify(pruned));
}

export function savePick(
  matchId: string,
  leagueSlug: string,
  sport: string,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  market: StoredPick['market'],
  pick: string,
  confidence: number,
) {
  const picks = load();
  if (picks.some(p => p.matchId === matchId)) return; // already saved
  picks.push({ matchId, leagueSlug, sport, homeTeam, awayTeam, matchDate, savedAt: new Date().toISOString(), market, pick, confidence });
  save(picks);
}

/** Returns picks whose match date falls within the last 7 days (i.e. should already be finished) */
export function getLastWeekPicks(): StoredPick[] {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return load().filter(p => {
    const d = new Date(p.matchDate).getTime();
    return d >= weekAgo && d <= now;
  });
}

/** Returns picks for upcoming matches (match date in the future) */
export function getUpcomingPicks(): StoredPick[] {
  const now = Date.now();
  return load().filter(p => new Date(p.matchDate).getTime() > now);
}

/** Find a stored pick for a specific match ID */
export function getPickForMatch(matchId: string | number): StoredPick | undefined {
  return load().find(p => p.matchId === String(matchId));
}
