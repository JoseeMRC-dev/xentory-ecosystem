// Global accuracy — deterministic, identical for all users.
// Fetches last 7 days of completed football matches from ESPN (free, no auth),
// predicts the result using team season records + home advantage, then compares
// to the actual scoreline. Result is cached 30 min in-module memory.

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const LEAGUES = [
  'soccer/eng.1',        // Premier League
  'soccer/esp.1',        // LaLiga
  'soccer/ger.1',        // Bundesliga
  'soccer/ita.1',        // Serie A
  'soccer/fra.1',        // Ligue 1
  'soccer/uefa.champions', // UCL
  'soccer/por.1',        // Primeira Liga
];

function espnDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

interface FinishedMatch {
  homeScore: number;
  awayScore: number;
  homeRecord: string; // e.g. "15-3-5" (W-D-L) or "15-5" (W-L)
  awayRecord: string;
}

function parseRecord(summary: string): { w: number; d: number; l: number } {
  const parts = (summary ?? '').split('-').map(Number);
  if (parts.length >= 3) return { w: parts[0] || 0, d: parts[1] || 0, l: parts[2] || 0 };
  if (parts.length === 2) return { w: parts[0] || 0, d: 0, l: parts[1] || 0 };
  return { w: 5, d: 3, l: 2 }; // neutral default
}

function predictResult(homeRecord: string, awayRecord: string): 'home' | 'away' | 'draw' {
  const hr = parseRecord(homeRecord);
  const ar = parseRecord(awayRecord);
  const hGames = (hr.w + hr.d + hr.l) || 10;
  const aGames = (ar.w + ar.d + ar.l) || 10;
  // Win rate + partial draw credit + home advantage boost (+8%)
  const hStrength = ((hr.w + hr.d * 0.33) / hGames) * 1.08;
  const aStrength = (ar.w + ar.d * 0.33) / aGames;
  const diff = hStrength - aStrength;
  if (diff > 0.07) return 'home';
  if (diff < -0.07) return 'away';
  return 'draw';
}

async function fetchLeagueFinishedMatches(slug: string): Promise<FinishedMatch[]> {
  const dateRange = `${espnDateStr(-7)}-${espnDateStr(-1)}`;
  try {
    const res = await fetch(`${ESPN_BASE}/${slug}/scoreboard?dates=${dateRange}`);
    if (!res.ok) return [];
    const json = await res.json();
    const results: FinishedMatch[] = [];
    for (const ev of json?.events ?? []) {
      if (ev.status?.type?.state !== 'post') continue;
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      results.push({
        homeScore: parseInt(home.score ?? '0', 10),
        awayScore: parseInt(away.score ?? '0', 10),
        homeRecord: home.records?.[0]?.summary ?? '',
        awayRecord:  away.records?.[0]?.summary ?? '',
      });
    }
    return results;
  } catch { return []; }
}

export interface GlobalAccuracyResult {
  percent: number | null; // null if < 3 resolved matches
  correct: number;
  total: number;
}

let _cache: (GlobalAccuracyResult & { ts: number }) | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function calculateGlobalAccuracy(): Promise<GlobalAccuracyResult> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return { percent: _cache.percent, correct: _cache.correct, total: _cache.total };
  }

  const allMatches = (await Promise.all(LEAGUES.map(fetchLeagueFinishedMatches))).flat();

  let correct = 0;
  let total = 0;

  for (const m of allMatches) {
    const predicted = predictResult(m.homeRecord, m.awayRecord);
    const actual = m.homeScore > m.awayScore ? 'home'
                 : m.homeScore < m.awayScore ? 'away'
                 : 'draw';
    total++;
    if (predicted === actual) correct++;
  }

  if (total < 3) {
    _cache = { percent: null, correct: 0, total, ts: Date.now() };
    return { percent: null, correct: 0, total };
  }

  const percent = Math.round((correct / total) * 100);
  _cache = { percent, correct, total, ts: Date.now() };
  return { percent, correct, total };
}
