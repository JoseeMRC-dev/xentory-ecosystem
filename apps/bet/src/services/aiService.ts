import type { Match, TeamStats, MatchAnalysis, PredictionMarkets, Plan } from '../types';

const GEMINI_FLASH = 'gemini-2.0-flash';
const GEMINI_PRO   = 'gemini-2.5-pro';
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY ?? '';

// ── DERIVE MARKETS FROM STATS ──
function deriveMarkets(home: TeamStats, away: TeamStats): PredictionMarkets {
  // 1X2
  const homeStrength = home.goalsScored / Math.max(away.goalsConceded, 0.5);
  const awayStrength = away.goalsScored / Math.max(home.goalsConceded, 0.5);
  const total = homeStrength + awayStrength + 0.8;
  const homeProb  = Math.round((homeStrength / total) * 100);
  const awayProb  = Math.round((awayStrength / total) * 100);
  const drawProb  = Math.max(5, 100 - homeProb - awayProb);
  const adj = (100 - drawProb) / (homeProb + awayProb);
  const hP = Math.round(homeProb * adj);
  const aP = Math.round(awayProb * adj);
  const dP = 100 - hP - aP;

  const result1X2 = hP > aP && hP > dP ? 'home' : aP > hP && aP > dP ? 'away' : 'draw';
  const conf1X2   = Math.max(hP, aP, dP);

  // Over/Under
  const expGoals   = home.goalsScored + away.goalsScored;
  const over25Prob = Math.min(95, Math.round((expGoals / 3.0) * 65 + (home.over25 + away.over25) / 4));
  const over35Prob = Math.min(85, Math.round(over25Prob * 0.55));

  // BTTS
  const bttsProb = Math.round((home.btts + away.btts) / 2);

  // Handicap
  const diff = hP - aP;
  const hcLine = Math.abs(diff) > 25 ? (diff > 0 ? -1 : 1) : 0;

  // Cuotas (1 / prob * 0.9 de margen)
  const toOdds = (p: number) => parseFloat((1 / (p / 100) * 0.92).toFixed(2));

  const markets: PredictionMarkets = {
    result: {
      home: hP, draw: dP, away: aP,
      homeOdds: toOdds(hP), drawOdds: toOdds(dP), awayOdds: toOdds(aP),
      recommendation: result1X2,
      confidence: conf1X2,
    },
    overUnder25: {
      line: 2.5,
      over: over25Prob, under: 100 - over25Prob,
      recommendation: over25Prob >= 50 ? 'over' : 'under',
      confidence: Math.abs(over25Prob - 50) + 50,
    },
    overUnder35: {
      line: 3.5,
      over: over35Prob, under: 100 - over35Prob,
      recommendation: over35Prob >= 50 ? 'over' : 'under',
      confidence: Math.abs(over35Prob - 50) + 50,
    },
    btts: {
      yes: bttsProb, no: 100 - bttsProb,
      recommendation: bttsProb >= 50 ? 'yes' : 'no',
      confidence: Math.abs(bttsProb - 50) + 50,
    },
    handicap: {
      line: hcLine,
      home: hcLine <= 0 ? hP + 10 : aP + 10,
      away: hcLine >= 0 ? aP + 10 : hP + 10,
      recommendation: hcLine <= 0 ? 'home' : 'away',
      confidence: Math.abs(diff) + 55,
    },
    bestBet: { market: '', pick: '', odds: 0, confidence: 0, reasoning: '' },
  };

  // Best bet
  const candidates = [
    { market: 'Resultado 1X2', pick: result1X2 === 'home' ? `${home.team.name} gana` : result1X2 === 'away' ? `${away.team.name} gana` : 'Empate', odds: result1X2 === 'home' ? markets.result.homeOdds : result1X2 === 'away' ? markets.result.awayOdds : markets.result.drawOdds, confidence: conf1X2 },
    { market: 'Más de 2.5 goles', pick: `Over 2.5 (${over25Prob}%)`, odds: toOdds(over25Prob), confidence: markets.overUnder25.confidence },
    { market: 'Ambos equipos marcan', pick: `BTTS ${bttsProb >= 50 ? 'Sí' : 'No'}`, odds: toOdds(bttsProb >= 50 ? bttsProb : 100 - bttsProb), confidence: markets.btts.confidence },
  ];
  const best = candidates.reduce((a, b) => a.confidence > b.confidence ? a : b);
  markets.bestBet = { ...best, reasoning: `Basado en el rendimiento reciente y estadísticas de los últimos 5 partidos. Confianza estadística: ${best.confidence}%` };

  return markets;
}

function buildPrompt(match: Match, home: TeamStats, away: TeamStats, markets: PredictionMarkets, isPro: boolean): string {
  const formStr = (stats: TeamStats) =>
    stats.form.map(f => `${f.result} vs ${f.opponent} (${f.goalsFor}-${f.goalsAgainst}${f.isHome ? ' C' : ' F'})`).join(', ');

  const sport = match.sport;
  const isSoccer = sport === 'football';
  const sportLabel = sport === 'football' ? 'fútbol'
    : sport === 'basketball' ? 'baloncesto'
    : sport === 'tennis' ? 'tenis'
    : sport === 'f1' ? 'Fórmula 1'
    : sport === 'golf' ? 'golf'
    : sport;

  const statsBlock = isSoccer
    ? `ESTADÍSTICAS ${home.team.name}:
- Forma reciente (últimos ${home.form.length}): ${formStr(home)}
- Goles por partido: ${home.goalsScored.toFixed(2)} marcados / ${home.goalsConceded.toFixed(2)} encajados
- BTTS %: ${home.btts}% | Over 2.5 %: ${home.over25}%
- Porterías a cero: ${home.cleanSheets}
${home.possession ? `- Posesión media: ${home.possession}%` : ''}

ESTADÍSTICAS ${away.team.name}:
- Forma reciente (últimos ${away.form.length}): ${formStr(away)}
- Goles por partido: ${away.goalsScored.toFixed(2)} marcados / ${away.goalsConceded.toFixed(2)} encajados
- BTTS %: ${away.btts}% | Over 2.5 %: ${away.over25}%
- Porterías a cero: ${away.cleanSheets}`
    : `RENDIMIENTO RECIENTE ${home.team.name}:
- Últimos resultados: ${formStr(home)}
- Media puntos/sets/goles por partido: ${home.goalsScored.toFixed(2)}
- Media encajados: ${home.goalsConceded.toFixed(2)}

RENDIMIENTO RECIENTE ${away.team.name}:
- Últimos resultados: ${formStr(away)}
- Media puntos/sets/goles por partido: ${away.goalsScored.toFixed(2)}
- Media encajados: ${away.goalsConceded.toFixed(2)}`;

  const marketsBlock = isSoccer
    ? `PROBABILIDADES:
- ${home.team.name} gana: ${markets.result.home}% (cuota ${markets.result.homeOdds})
- Empate: ${markets.result.draw}% (cuota ${markets.result.drawOdds})
- ${away.team.name} gana: ${markets.result.away}% (cuota ${markets.result.awayOdds})
- Over 2.5: ${markets.overUnder25.over}% | Under 2.5: ${markets.overUnder25.under}%
- BTTS Sí: ${markets.btts.yes}% | No: ${markets.btts.no}%
- Mejor apuesta: ${markets.bestBet.pick} @ ${markets.bestBet.odds}`
    : `PROBABILIDADES:
- ${home.team.name} gana: ${markets.result.home}% (cuota ${markets.result.homeOdds})
- ${away.team.name} gana: ${markets.result.away}% (cuota ${markets.result.awayOdds})
- Mejor apuesta: ${markets.bestBet.pick} @ ${markets.bestBet.odds}`;

  return `Eres un analista experto en ${sportLabel}. Analiza el siguiente evento y genera un análisis predictivo en español. Responde como especialista en ${sportLabel}, NO hables de fútbol si el deporte es otro.

DEPORTE: ${sportLabel.toUpperCase()}
PARTIDO: ${home.team.name} vs ${away.team.name}
COMPETICIÓN: ${match.competition.name}
FECHA: ${new Date(match.date).toLocaleDateString('es-ES')}

${statsBlock}

${marketsBlock}

Responde SOLO en JSON puro (sin markdown ni backticks):
{
  "summary": "Resumen de 2-3 frases del contexto de este evento de ${sportLabel}",
  "technical": "Análisis técnico específico de ${sportLabel}: rendimiento, estadísticas clave y factores decisivos${isPro ? ' con contexto de competición' : ''}",
  "keyFactors": ["factor 1 específico de ${sportLabel}", "factor 2", "factor 3"],
  "risks": ["riesgo 1", "riesgo 2"]
}`;
}

export async function generateMatchAnalysis(
  match: Match,
  homeStats: TeamStats,
  awayStats: TeamStats,
  plan: Plan
): Promise<MatchAnalysis> {
  const isPro    = plan === 'pro' || plan === 'elite';
  const model    = isPro ? GEMINI_PRO : GEMINI_FLASH;
  const markets  = deriveMarkets(homeStats, awayStats);
  const prompt   = buildPrompt(match, homeStats, awayStats, markets, isPro);

  let summary        = '';
  let technical      = '';
  let keyFactors: string[] = [];
  let risks: string[]      = [];

  try {
    if (API_KEY && API_KEY !== 'demo') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: isPro ? 1500 : 800, responseMimeType: 'application/json' },
            ...(isPro && { tools: [{ googleSearch: {} }] }),
          }),
        }
      );
      if (res.ok) {
        const data  = await res.json();
        const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        summary    = parsed.summary    ?? '';
        technical  = parsed.technical  ?? '';
        keyFactors = parsed.keyFactors ?? [];
        risks      = parsed.risks      ?? [];
      }
    }
  } catch { /* use mock below */ }

  // Mock fallback — sport-aware
  if (!summary) {
    const h = homeStats;
    const a = awayStats;
    const winner = markets.result.recommendation;
    const isSoccer = match.sport === 'football';
    const sportLabel = match.sport === 'basketball' ? 'baloncesto'
      : match.sport === 'tennis' ? 'tenis'
      : match.sport === 'f1' ? 'Fórmula 1'
      : match.sport === 'golf' ? 'golf'
      : 'fútbol';
    const favorito = winner === 'home' ? h.team.name : winner === 'away' ? a.team.name : 'ninguno';
    summary = `${h.team.name} se enfrenta a ${a.team.name} en ${match.competition.name} (${sportLabel}). ${h.team.name} llega con forma ${h.form.slice(0,3).map(f=>f.result).join('')} y ${a.team.name} con ${a.form.slice(0,3).map(f=>f.result).join('')}. Las probabilidades favorecen a ${favorito} con un ${Math.max(markets.result.home, markets.result.away)}% de confianza estadística.`;
    technical = isSoccer
      ? `${h.team.name} promedia ${h.goalsScored.toFixed(1)} goles/partido y encaja ${h.goalsConceded.toFixed(1)}. Su BTTS histórico es del ${h.btts}%. ${a.team.name} marca ${a.goalsScored.toFixed(1)} y encaja ${a.goalsConceded.toFixed(1)}, con BTTS del ${a.btts}%. El promedio de goles esperados es ${(h.goalsScored + a.goalsScored).toFixed(1)}, lo que sitúa la línea Over/Under 2.5 con un ${markets.overUnder25.over}% de probabilidad alcista.`
      : `${h.team.name} llega con rendimiento ${h.form.map(f=>f.result).join('')} en sus últimos ${h.form.length} encuentros. ${a.team.name} muestra ${a.form.map(f=>f.result).join('')}. Basado en el historial reciente, ${favorito} tiene ventaja con un ${Math.max(markets.result.home, markets.result.away)}% de probabilidad de victoria.`;
    keyFactors = [
      `Forma reciente: ${h.team.name} ${h.form.map(f=>f.result).join('')} vs ${a.team.name} ${a.form.map(f=>f.result).join('')}`,
      isSoccer ? `Promedio de goles: ${(h.goalsScored + a.goalsScored).toFixed(1)} esperados por partido` : `Rendimiento ofensivo: ${h.team.name} ${h.goalsScored.toFixed(1)} vs ${a.team.name} ${a.goalsScored.toFixed(1)}`,
      `Probabilidad de victoria: ${h.team.name} ${markets.result.home}% — ${a.team.name} ${markets.result.away}%`,
    ];
    risks = [
      `Factor anímico y forma física reciente no contemplados en el modelo estadístico`,
      `Posibles cambios de último momento (lesiones, estrategia, condiciones)`,
    ];
  }

  return {
    id:          `analysis_${Date.now()}`,
    matchId:     match.id,
    match,
    homeStats,
    awayStats,
    markets,
    aiSummary:   summary,
    aiTechnical: technical,
    keyFactors,
    risks,
    tier:        isPro ? 'pro' : 'flash',
    generatedAt: new Date().toISOString(),
  };
}
