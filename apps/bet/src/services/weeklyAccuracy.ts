import { getLastWeekPicks } from './predictionStore';
import type { StoredPick } from './predictionStore';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

interface EventResult {
  finished: boolean;
  homeScore: number;
  awayScore: number;
}

async function fetchEventResult(pick: StoredPick): Promise<EventResult | null> {
  try {
    const res = await fetch(`${ESPN_BASE}/${pick.leagueSlug}/summary?event=${pick.matchId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const comp = json?.header?.competitions?.[0];
    if (!comp) return null;
    if (comp.status?.type?.state !== 'post') return { finished: false, homeScore: 0, awayScore: 0 };
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    return {
      finished: true,
      homeScore: parseInt(home?.score ?? '0', 10),
      awayScore: parseInt(away?.score ?? '0', 10),
    };
  } catch { return null; }
}

function isCorrect(pick: StoredPick, homeScore: number, awayScore: number): boolean {
  switch (pick.market) {
    case 'result': {
      const actual = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
      return actual === pick.pick;
    }
    case 'overUnder25': {
      const total = homeScore + awayScore;
      return pick.pick === 'over' ? total >= 3 : total <= 2;
    }
    case 'btts': {
      const btts = homeScore > 0 && awayScore > 0;
      return pick.pick === 'yes' ? btts : !btts;
    }
    default: return false;
  }
}

export interface AccuracyResult {
  percent: number | null; // null = not enough resolved picks yet
  correct: number;
  total: number;
}

export async function calculateWeeklyAccuracy(): Promise<AccuracyResult> {
  const picks = getLastWeekPicks();
  if (picks.length === 0) return { percent: null, correct: 0, total: 0 };

  let correct = 0, total = 0;

  await Promise.all(picks.map(async pick => {
    const result = await fetchEventResult(pick);
    if (!result?.finished) return;
    total++;
    if (isCorrect(pick, result.homeScore, result.awayScore)) correct++;
  }));

  if (total < 2) return { percent: null, correct: 0, total };
  return { percent: Math.round((correct / total) * 100), correct, total };
}
