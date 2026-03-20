// ── PLANS ──
export type Plan = 'free' | 'pro' | 'elite';

// ── SPORTS ──
export type Sport = 'football' | 'basketball' | 'tennis' | 'f1' | 'golf';

export type Competition = {
  id: number;
  name: string;
  sport: Sport;
  country: string;
  logo: string;
  emoji: string;
};

// ── TEAMS / PLAYERS ──
export interface Team {
  id: number;
  name: string;
  shortName: string;
  logo?: string;
  emoji?: string;
}

export interface Player {
  id: number;
  name: string;
  country: string;
  ranking?: number;
}

// ── MATCH ──
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface Match {
  id: number;
  sport: Sport;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  date: string;           // ISO string
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  round?: string;
  minute?: number;
  clockDisplay?: string;
  period?: string;
  espnEventId?: string;
  // Golf-specific
  leaderboard?: Array<{pos: string; name: string; score: string; thru: string}>;
  totalPlayers?: number;
}

// ── FORM (últimos partidos) ──
export type MatchResult = 'W' | 'D' | 'L';

export interface FormMatch {
  opponent: string;
  result: MatchResult;
  goalsFor: number;
  goalsAgainst: number;
  date: string;
  isHome: boolean;
}

export interface TeamStats {
  team: Team;
  form: FormMatch[];           // últimos 5
  goalsScored: number;         // promedio
  goalsConceded: number;       // promedio
  cleanSheets: number;
  btts: number;                // Both Teams To Score %
  over25: number;              // Over 2.5 goals %
  homeRecord?: { w: number; d: number; l: number };
  awayRecord?: { w: number; d: number; l: number };
  possession?: number;
  shotsOnTarget?: number;
}

// ── PREDICTION MARKETS ──
export interface Market1X2 {
  home: number;        // probabilidad 0-100
  draw: number;
  away: number;
  homeOdds: number;    // cuota estimada
  drawOdds: number;
  awayOdds: number;
  recommendation: 'home' | 'draw' | 'away';
  confidence: number;
}

export interface MarketOverUnder {
  line: number;       // 2.5, 3.5
  over: number;       // probabilidad
  under: number;
  recommendation: 'over' | 'under';
  confidence: number;
}

export interface MarketBTTS {
  yes: number;
  no: number;
  recommendation: 'yes' | 'no';
  confidence: number;
}

export interface MarketHandicap {
  line: number;       // -1, +1, etc.
  home: number;
  away: number;
  recommendation: 'home' | 'away';
  confidence: number;
}

export interface PredictionMarkets {
  result: Market1X2;
  overUnder25: MarketOverUnder;
  overUnder35: MarketOverUnder;
  btts: MarketBTTS;
  handicap: MarketHandicap;
  bestBet: {
    market: string;
    pick: string;
    odds: number;
    confidence: number;
    reasoning: string;
  };
}

// ── FULL ANALYSIS ──
export interface MatchAnalysis {
  id: string;
  matchId: number;
  match: Match;
  homeStats: TeamStats;
  awayStats: TeamStats;
  markets: PredictionMarkets;
  aiSummary: string;
  aiTechnical: string;
  keyFactors: string[];
  risks: string[];
  tier: 'flash' | 'pro';
  generatedAt: string;
}

// ── USER ──
export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  telegramLinked: boolean;
  createdAt: string;
}

// ── API-FOOTBALL ──
export interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string }; venue: { name: string } };
  league:  { id: number; name: string; country: string; logo: string; round: string };
  teams:   { home: { id: number; name: string; logo: string }; away: { id: number; name: string; logo: string } };
  goals:   { home: number | null; away: number | null };
}
