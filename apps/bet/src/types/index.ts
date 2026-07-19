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

// ── GOLF — FULL LEADERBOARD / PLAYER ANALYSIS ──
export interface GolfRoundScore {
  round: number;                 // 1-4
  strokes: number | null;        // null = ronda no jugada todavía
  toPar: string;                 // "-3", "E", "+2", "-"
  teeTime?: string;               // ISO
}

export interface GolfPlayerEntry {
  id: string;
  name: string;
  countryFlag?: string;
  position: string;              // "T6", "1", "CUT"...
  isTie: boolean;
  score: string;                 // total a par, ej. "-6"
  thru: string;                  // hoyos jugados en la ronda actual, "F" si terminó, "-" si no ha salido
  teeTime?: string;               // salida de la ronda actual/próxima
  startHole?: number;
  movement?: number;             // posiciones ganadas/perdidas
  statusText?: string;
  rounds: GolfRoundScore[];
}

export interface GolfLeaderboardDetail {
  tournamentName: string;
  currentPeriod: number;         // ronda en curso (1-4)
  players: GolfPlayerEntry[];
}

export interface GolfGroupAnalysisResult {
  summary: string;
  playerNotes: Array<{ name: string; note: string }>;
  prediction: string;
  generatedAt: string;
}

// ── LIVE MATCH STATS ──
export interface LiveMatchStat {
  label:    string;
  home:     string | number;
  away:     string | number;
  homePct:  number;   // 0-100 for bar width
  isPossession?: boolean;
  cardColor?:    string;   // 'var(--gold)' | 'var(--red)'
}

export interface MatchEvent {
  minute: number;
  type:   'goal' | 'yellowCard' | 'redCard' | 'sub' | 'var';
  team:   'home' | 'away';
  player?: string;
  detail?: string;
}

export interface LiveMatchStats {
  stats:    LiveMatchStat[];
  events:   MatchEvent[];
  fetchedAt: number;
}

// ── LIVE AI ANALYSIS ──
export interface LiveBetSuggestion {
  market:     string;
  pick:       string;
  odds:       string;
  reasoning:  string;
  confidence: number;
}

export interface LiveAnalysisResult {
  assessment: string;
  momentum:   'home' | 'away' | 'balanced';
  liveBets:   LiveBetSuggestion[];
  forecast:   string;
  generatedAt: string;
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
  /** Competition name (e.g. "LaLiga", "Champions League"). Populated when the team plays in multiple competitions. */
  competition?: string;
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
  prediction?: string;
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
  ageVerified: boolean;
  createdAt: string;
}

// ── API-FOOTBALL ──
export interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string }; venue: { name: string } };
  league:  { id: number; name: string; country: string; logo: string; round: string };
  teams:   { home: { id: number; name: string; logo: string }; away: { id: number; name: string; logo: string } };
  goals:   { home: number | null; away: number | null };
}
