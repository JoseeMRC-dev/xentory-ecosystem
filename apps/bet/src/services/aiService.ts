import type { Match, TeamStats, MatchAnalysis, PredictionMarkets, Plan } from '../types';
import { supabase } from '../lib/supabase';

const GEMINI_FLASH = 'gemini-2.0-flash';
const GEMINI_PRO   = 'gemini-2.5-pro';
const PROXY_URL = `${(import.meta as any).env?.VITE_SUPABASE_URL ?? 'https://mtgatdmrpfysqphdgaue.supabase.co'}/functions/v1/gemini-proxy`;

// ── DERIVE MARKETS FROM STATS ──
function deriveMarkets(home: TeamStats, away: TeamStats, sport = 'football'): PredictionMarkets {
  const isSoccer     = sport === 'football';
  const isBasketball = sport === 'basketball';

  // Safe values — prevent NaN/Infinity
  const hScored    = isFinite(home.goalsScored)    ? home.goalsScored    : (isBasketball ? 108 : 1.5);
  const hConceded  = isFinite(home.goalsConceded)  ? home.goalsConceded  : (isBasketball ? 104 : 1.3);
  const aScored    = isFinite(away.goalsScored)    ? away.goalsScored    : (isBasketball ? 105 : 1.3);
  const aConceded  = isFinite(away.goalsConceded)  ? away.goalsConceded  : (isBasketball ? 107 : 1.5);

  // 1X2 — normalize so extreme values (basketball 108 pts) don't skew probs
  const homeStrength = hScored / Math.max(aConceded, 0.5);
  const awayStrength = aScored / Math.max(hConceded, 0.5);
  const total = homeStrength + awayStrength + (isSoccer ? 0.8 : 0.4);
  const homeProb  = Math.round((homeStrength / total) * 100);
  const awayProb  = Math.round((awayStrength / total) * 100);
  // No draw for basketball/tennis
  const drawProb  = isSoccer ? Math.max(5, 100 - homeProb - awayProb) : 0;
  const adj = isSoccer ? (100 - drawProb) / Math.max(homeProb + awayProb, 1) : 100 / Math.max(homeProb + awayProb, 1);
  const hP = Math.min(95, Math.max(5, Math.round(homeProb * adj)));
  const aP = Math.min(95, Math.max(5, isSoccer ? Math.round(awayProb * adj) : 100 - hP));
  const dP = isSoccer ? Math.max(0, 100 - hP - aP) : 0;

  const result1X2 = hP > aP && hP > dP ? 'home' : aP > hP && aP > dP ? 'away' : 'draw';
  const conf1X2   = Math.max(hP, aP, dP);

  // Over/Under — basket uses pts total, football uses goals
  const expTotal   = hScored + aScored;
  // Historical over% from real form data (0-100). Default 50 when not computed.
  const histOver   = (home.over25 + away.over25) / 2;
  const hasRealHist = home.over25 !== 50 || away.over25 !== 50; // not the empty-form default

  const over25Prob = isBasketball
    ? (() => {
        // Blend: 60% points-based + 40% historical Over-210.5% from real form
        const ptsBased = Math.round(50 + (expTotal - 210.5) * 2);
        return Math.min(90, Math.max(10,
          hasRealHist ? Math.round(ptsBased * 0.6 + histOver * 0.4) : ptsBased
        ));
      })()
    : Math.min(95, Math.round((expTotal / 3.0) * 65 + (home.over25 + away.over25) / 4));
  const over35Prob = Math.min(85, Math.round(over25Prob * 0.55));

  // BTTS — meaningful for football (% games both scored); 3-set rate for tennis
  const bttsProb = isSoccer
    ? Math.round((home.btts + away.btts) / 2)
    : sport === 'tennis'
    ? Math.round((home.btts + away.btts) / 2)  // % going to 3 sets
    : 50;

  // Handicap
  const diff = hP - aP;
  const hcLine = Math.abs(diff) > 25 ? (diff > 0 ? -1 : 1) : 0;

  // Cuotas (1 / prob * margen)
  const toOdds = (p: number) => {
    const safeP = Math.max(5, Math.min(95, p));
    return parseFloat((1 / (safeP / 100) * 0.92).toFixed(2));
  };

  const markets: PredictionMarkets = {
    result: {
      home: hP, draw: dP, away: aP,
      homeOdds: toOdds(hP), drawOdds: isSoccer ? toOdds(dP) : 0, awayOdds: toOdds(aP),
      recommendation: result1X2,
      confidence: conf1X2,
    },
    overUnder25: {
      line: isBasketball ? 210.5 : 2.5,
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

  // Best bet — sport-aware candidates (no "goles"/"BTTS" para basket/tenis)
  const winnerPick = result1X2 === 'home' ? `${home.team.name} gana` : result1X2 === 'away' ? `${away.team.name} gana` : 'Empate';
  const winnerOdds = result1X2 === 'home' ? markets.result.homeOdds : result1X2 === 'away' ? markets.result.awayOdds : markets.result.drawOdds;

  const candidates = isSoccer ? [
    { market: 'Resultado 1X2',       pick: winnerPick, odds: winnerOdds, confidence: conf1X2 },
    { market: 'Más de 2.5 goles',    pick: `Over 2.5 (${over25Prob}%)`, odds: toOdds(over25Prob), confidence: markets.overUnder25.confidence },
    { market: 'Ambos equipos marcan', pick: `BTTS ${bttsProb >= 50 ? 'Sí' : 'No'}`, odds: toOdds(bttsProb >= 50 ? bttsProb : 100 - bttsProb), confidence: markets.btts.confidence },
  ] : isBasketball ? [
    { market: 'Ganador del partido',      pick: winnerPick, odds: winnerOdds, confidence: conf1X2 },
    { market: 'Puntos Over/Under 210.5',  pick: `${over25Prob >= 50 ? 'Over' : 'Under'} 210.5 (${over25Prob >= 50 ? over25Prob : 100 - over25Prob}%)`, odds: toOdds(Math.max(over25Prob, 100 - over25Prob)), confidence: markets.overUnder25.confidence },
    { market: 'Hándicap', pick: `${hcLine <= 0 ? home.team.name : away.team.name} (${hcLine > 0 ? '+' : ''}${hcLine})`, odds: toOdds(Math.max(markets.handicap.home, markets.handicap.away)), confidence: markets.handicap.confidence },
  ] : [
    { market: 'Ganador del partido', pick: winnerPick, odds: winnerOdds, confidence: conf1X2 },
    { market: 'Hándicap',            pick: `${hcLine <= 0 ? home.team.name : away.team.name} (${hcLine > 0 ? '+' : ''}${hcLine})`, odds: toOdds(Math.max(markets.handicap.home, markets.handicap.away)), confidence: markets.handicap.confidence },
  ];

  const best = candidates.reduce((a, b) => a.confidence > b.confidence ? a : b);
  const sportReasoning = isSoccer
    ? `Basado en el rendimiento goleador y estadísticas defensivas de los últimos partidos. Confianza estadística: ${best.confidence}%`
    : isBasketball
    ? `Basado en el diferencial de puntos y el historial de los últimos encuentros en la NBA. Confianza: ${best.confidence}%`
    : `Basado en el historial reciente de resultados. Confianza estadística: ${best.confidence}%`;
  markets.bestBet = { ...best, reasoning: sportReasoning };

  return markets;
}

function buildPrompt(match: Match, home: TeamStats, away: TeamStats, markets: PredictionMarkets, isPro: boolean): string {
  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;

  const sport = match.sport;
  const isSoccer = sport === 'football';
  const isBasketball = sport === 'basketball';
  const isTennis = sport === 'tennis';
  const sportLabel = sport === 'football' ? 'fútbol'
    : sport === 'basketball' ? 'baloncesto'
    : sport === 'tennis' ? 'tenis'
    : sport === 'f1' ? 'Fórmula 1'
    : sport === 'golf' ? 'golf'
    : sport;

  const formStr = (stats: TeamStats) =>
    stats.form.length === 0
      ? 'Sin datos'
      : stats.form.map(f =>
          `${f.result} ${f.isHome ? 'vs' : 'en'} ${f.opponent} (${f.goalsFor}-${f.goalsAgainst})`
        ).join(', ');

  const winRatePct = (stats: TeamStats) => {
    if (stats.form.length === 0) return 'N/D';
    const w = stats.form.filter(f => f.result === 'W').length;
    return `${Math.round((w / stats.form.length) * 100)}%`;
  };

  const statsBlock = isSoccer
    ? `== ${homeName.toUpperCase()} ==
• Últimos ${home.form.length} partidos: ${formStr(home)}
• Racha: ${home.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(home)}
• Goles marcados/partido: ${home.goalsScored.toFixed(2)}  |  Goles encajados: ${home.goalsConceded.toFixed(2)}
• Porterías a cero: ${home.cleanSheets}  |  BTTS histórico: ${home.btts}%  |  Over 2.5 histórico: ${home.over25}%
${home.possession ? `• Posesión media: ${home.possession}%` : ''}
${home.shotsOnTarget ? `• Disparos a puerta/partido: ${home.shotsOnTarget}` : ''}
${home.homeRecord ? `• Récord en casa: ${home.homeRecord.w}V-${home.homeRecord.d}E-${home.homeRecord.l}D` : ''}

== ${awayName.toUpperCase()} ==
• Últimos ${away.form.length} partidos: ${formStr(away)}
• Racha: ${away.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(away)}
• Goles marcados/partido: ${away.goalsScored.toFixed(2)}  |  Goles encajados: ${away.goalsConceded.toFixed(2)}
• Porterías a cero: ${away.cleanSheets}  |  BTTS histórico: ${away.btts}%  |  Over 2.5 histórico: ${away.over25}%
${away.possession ? `• Posesión media: ${away.possession}%` : ''}
${away.shotsOnTarget ? `• Disparos a puerta/partido: ${away.shotsOnTarget}` : ''}
${away.awayRecord ? `• Récord fuera de casa: ${away.awayRecord.w}V-${away.awayRecord.d}E-${away.awayRecord.l}D` : ''}`
    : isBasketball
    ? `== ${homeName.toUpperCase()} ==
• Últimos ${home.form.length} partidos: ${formStr(home)}
• Racha: ${home.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(home)}
• Puntos anotados/partido: ${home.goalsScored.toFixed(1)}  |  Puntos encajados: ${home.goalsConceded.toFixed(1)}
• Diferencial pts/partido: ${(home.goalsScored - home.goalsConceded).toFixed(1)}

== ${awayName.toUpperCase()} ==
• Últimos ${away.form.length} partidos: ${formStr(away)}
• Racha: ${away.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(away)}
• Puntos anotados/partido: ${away.goalsScored.toFixed(1)}  |  Puntos encajados: ${away.goalsConceded.toFixed(1)}
• Diferencial pts/partido: ${(away.goalsScored - away.goalsConceded).toFixed(1)}`
    : isTennis
    ? `== ${homeName.toUpperCase()} ==
• Últimos ${home.form.length} partidos: ${formStr(home)}
• Racha: ${home.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(home)}
• Sets ganados/partido: ${home.goalsScored.toFixed(1)}  |  Sets cedidos: ${home.goalsConceded.toFixed(1)}

== ${awayName.toUpperCase()} ==
• Últimos ${away.form.length} partidos: ${formStr(away)}
• Racha: ${away.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(away)}
• Sets ganados/partido: ${away.goalsScored.toFixed(1)}  |  Sets cedidos: ${away.goalsConceded.toFixed(1)}`
    : `== ${homeName.toUpperCase()} ==
• Últimos resultados: ${formStr(home)}
• Racha: ${home.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(home)}
• Rendimiento ofensivo: ${home.goalsScored.toFixed(2)}  |  Defensivo: ${home.goalsConceded.toFixed(2)}

== ${awayName.toUpperCase()} ==
• Últimos resultados: ${formStr(away)}
• Racha: ${away.form.map(f => f.result).join('')}  |  % victorias: ${winRatePct(away)}
• Rendimiento ofensivo: ${away.goalsScored.toFixed(2)}  |  Defensivo: ${away.goalsConceded.toFixed(2)}`;

  const marketsBlock = isSoccer
    ? `MERCADOS:
• ${homeName} gana (1): ${markets.result.home}% → cuota ${markets.result.homeOdds}
• Empate (X): ${markets.result.draw}% → cuota ${markets.result.drawOdds}
• ${awayName} gana (2): ${markets.result.away}% → cuota ${markets.result.awayOdds}
• Over 2.5 goles: ${markets.overUnder25.over}%  |  Under 2.5: ${markets.overUnder25.under}%
• Over 3.5 goles: ${markets.overUnder35.over}%  |  Under 3.5: ${markets.overUnder35.under}%
• BTTS Sí: ${markets.btts.yes}%  |  BTTS No: ${markets.btts.no}%
• Hándicap (${markets.handicap.line}): ${homeName} ${markets.handicap.home}% / ${awayName} ${markets.handicap.away}%
• Apuesta destacada del modelo: ${markets.bestBet.pick} @ ${markets.bestBet.odds} (confianza ${markets.bestBet.confidence}%)`
    : `MERCADOS:
• ${homeName} gana: ${markets.result.home}% → cuota ${markets.result.homeOdds}
• ${awayName} gana: ${markets.result.away}% → cuota ${markets.result.awayOdds}
• Apuesta destacada del modelo: ${markets.bestBet.pick} @ ${markets.bestBet.odds} (confianza ${markets.bestBet.confidence}%)`;

  const depthNote = isPro
    ? 'Profundiza al máximo en el análisis — el usuario es un apostante avanzado que quiere contexto, tendencias históricas, factores tácticos y de motivación, e impacto de la competición.'
    : 'Sé claro y concreto. El usuario quiere entender los puntos clave sin tecnicismos excesivos.';

  return `Eres un analista deportivo senior especializado en ${sportLabel}. Tu tarea es generar un análisis predictivo COMPLETO, PROFUNDO y EN ESPAÑOL para el siguiente evento.

REGLAS IMPORTANTES:
- Responde EXCLUSIVAMENTE como experto en ${sportLabel} — nunca menciones otro deporte
- Sé específico con datos reales: menciona a los jugadores, la forma, el contexto de la competición
- ${depthNote}
- Responde SOLO en JSON puro (sin markdown, sin backticks, sin texto extra)

═══ DATOS DEL EVENTO ═══
Deporte: ${sportLabel.toUpperCase()}
Partido: ${homeName} vs ${awayName}
Competición: ${match.competition.name}
Fecha: ${new Date(match.date).toLocaleDateString('es-ES')}
${match.venue ? `Estadio/Sede: ${match.venue}` : ''}
${match.round ? `Jornada/Ronda: ${match.round}` : ''}
Estado: ${match.status === 'live' ? '🔴 EN DIRECTO' : match.status === 'finished' ? '✅ FINALIZADO' : '📅 Próximo'}

═══ ESTADÍSTICAS ═══
${statsBlock}

═══ PROBABILIDADES DEL MODELO ═══
${marketsBlock}

═══ FORMATO DE RESPUESTA (JSON) ═══
{
  "summary": "Párrafo de 5-6 frases: presenta el contexto del partido, el momento de forma de cada equipo/jugador, la importancia del encuentro en la competición, y el clima previo al partido. Sé concreto con nombres y datos.",
  "technical": "${isPro
    ? 'Tres párrafos bien desarrollados. PÁRRAFO 1: Análisis profundo de la forma reciente de ambos equipos/jugadores, detallando victorias/derrotas clave y tendencias de las últimas semanas. PÁRRAFO 2: Evaluación estadística detallada (ataque vs defensa, eficiencia, patrones de juego) y análisis de cada mercado de apuestas con razonamiento. PÁRRAFO 3: Factores tácticos, motivacionales, de calendarios, lesiones potenciales y cómo afectan al resultado esperado.'
    : 'Un párrafo sólido de 4-5 frases analizando la forma reciente, las estadísticas más relevantes y el factor determinante del partido.'
  }",
  "keyFactors": [
    "Factor clave 1 — muy específico con datos concretos",
    "Factor clave 2 — tendencia o estadística relevante",
    "Factor clave 3 — ventaja o desventaja táctica",
    "Factor clave 4 — contexto de competición o motivación",
    "Factor clave 5 — historial reciente o enfrentamientos directos"
  ],
  "risks": [
    "Riesgo 1 — factor que podría invalidar la predicción principal",
    "Riesgo 2 — incertidumbre o variable desconocida",
    "Riesgo 3 — escenario de sorpresa o resultado atípico"
  ],
  "prediction": "Predicción concreta del resultado: indica el ganador más probable${isSoccer ? ', un marcador estimado (ej. 2-1)' : isBasketball ? ', el resultado aproximado (ej. 112-105)' : ''} y el nivel de confianza. Justifica brevemente con los 2-3 datos más relevantes."
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
  const markets  = deriveMarkets(homeStats, awayStats, match.sport);
  const prompt   = buildPrompt(match, homeStats, awayStats, markets, isPro);

  let summary        = '';
  let technical      = '';
  let prediction     = '';
  let keyFactors: string[] = [];
  let risks: string[]      = [];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model,
          payload: {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: isPro ? 2500 : 1200, responseMimeType: 'application/json' },
            ...(isPro && { tools: [{ googleSearch: {} }] }),
          },
        }),
      });
      if (res.ok) {
        const data  = await res.json();
        const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        summary    = parsed.summary    ?? '';
        technical  = parsed.technical  ?? '';
        prediction = parsed.prediction ?? '';
        keyFactors = parsed.keyFactors ?? [];
        risks      = parsed.risks      ?? [];
      }
    }
  } catch { /* use mock below */ }

  // Mock fallback — sport-aware, more detailed
  if (!summary) {
    const h = homeStats;
    const a = awayStats;
    const winner = markets.result.recommendation;
    const isSoccer = match.sport === 'football';
    const isBasketball = match.sport === 'basketball';
    const isTennis = match.sport === 'tennis';
    const sportLabel = match.sport === 'basketball' ? 'baloncesto'
      : match.sport === 'tennis' ? 'tenis'
      : match.sport === 'f1' ? 'Fórmula 1'
      : match.sport === 'golf' ? 'golf'
      : 'fútbol';
    const favorito = winner === 'home' ? h.team.name : winner === 'away' ? a.team.name : 'Ninguno';
    const hForm = h.form.map(f => f.result).join('') || 'N/D';
    const aForm = a.form.map(f => f.result).join('') || 'N/D';
    const hWins = h.form.filter(f => f.result === 'W').length;
    const aWins = a.form.filter(f => f.result === 'W').length;
    const confPct = Math.max(markets.result.home, markets.result.away, markets.result.draw);

    summary = isSoccer
      ? `${h.team.name} y ${a.team.name} se miden en ${match.competition.name}${match.round ? ` (${match.round})` : ''}, un encuentro con implicaciones directas en la clasificación. ${h.team.name} llega a este partido con una racha de ${hForm} en sus últimos ${h.form.length} encuentros, mientras que ${a.team.name} acumula ${aForm}. Los locales promedian ${h.goalsScored.toFixed(1)} goles marcados y ${h.goalsConceded.toFixed(1)} encajados por partido, frente a ${a.goalsScored.toFixed(1)} y ${a.goalsConceded.toFixed(1)} de los visitantes. El modelo estadístico otorga a ${favorito} la ventaja con un ${confPct}% de probabilidad de victoria. La línea Over/Under 2.5 se sitúa en el ${markets.overUnder25.over}% favorable al sobre, apoyado por el promedio de ${(h.goalsScored + a.goalsScored).toFixed(1)} goles esperados entre ambos equipos.`
      : isBasketball
      ? `${h.team.name} recibe a ${a.team.name} en un partido de ${match.competition.name} de gran relevancia para la clasificación. ${h.team.name} llega en racha ${hForm} con ${hWins}/${h.form.length} victorias en sus últimos partidos, promediando ${h.goalsScored.toFixed(0)} puntos por encuentro. ${a.team.name} presenta una racha ${aForm} con ${aWins}/${a.form.length} victorias y ${a.goalsScored.toFixed(0)} puntos de media. El diferencial de puntuación por partido es de ${(h.goalsScored - h.goalsConceded).toFixed(1)} para los locales vs ${(a.goalsScored - a.goalsConceded).toFixed(1)} para los visitantes. El modelo estadístico favorece a ${favorito} con un ${confPct}% de probabilidad.`
      : isTennis
      ? `${h.team.name} y ${a.team.name} se enfrentan en ${match.competition.name}${match.round ? ` — ${match.round}` : ''}, un duelo muy esperado en el circuito. ${h.team.name} llega con una racha de ${hForm} en sus últimos enfrentamientos, ganando ${hWins} de ${h.form.length} partidos disputados. ${a.team.name} presenta ${aForm} con ${aWins}/${a.form.length} victorias. El modelo otorga a ${favorito} una probabilidad del ${confPct}% de avanzar en el torneo.`
      : `${h.team.name} y ${a.team.name} se miden en ${match.competition.name}. ${h.team.name} llega con racha ${hForm} y ${a.team.name} con ${aForm}. El modelo estadístico favorece a ${favorito} con un ${confPct}% de probabilidad.`;

    technical = isSoccer
      ? `${h.team.name} muestra un rendimiento ofensivo sólido con ${h.goalsScored.toFixed(2)} goles/partido y una tasa histórica de BTTS del ${h.btts}%, indicador de que dejan espacios defensivos con frecuencia. Su récord en casa es de ${h.homeRecord ? `${h.homeRecord.w}V-${h.homeRecord.d}E-${h.homeRecord.l}D` : 'N/D'}, lo que refuerza su condición de local. ${a.team.name} encaja ${a.goalsConceded.toFixed(2)} goles por encuentro fuera de casa, con un Over 2.5 histórico del ${a.over25}%. La suma de promedios goleadores arroja ${(h.goalsScored + a.goalsScored).toFixed(1)} goles esperados, lo que sitúa el Over 2.5 con un ${markets.overUnder25.over}% de probabilidad. El mercado 1X2 otorga las siguientes cuotas: ${h.team.name} @${markets.result.homeOdds}, empate @${markets.result.drawOdds}, ${a.team.name} @${markets.result.awayOdds}.`
      : isBasketball
      ? `${h.team.name} promedia ${h.goalsScored.toFixed(0)} puntos anotados y ${h.goalsConceded.toFixed(0)} encajados por partido, con un diferencial de ${(h.goalsScored - h.goalsConceded).toFixed(1)} puntos. ${a.team.name} anota ${a.goalsScored.toFixed(0)} y encaja ${a.goalsConceded.toFixed(0)}, diferencial de ${(a.goalsScored - a.goalsConceded).toFixed(1)}. El total esperado de puntos en el partido es de ${(h.goalsScored + a.goalsScored).toFixed(0)}, lo que puede servir de referencia para el mercado Over/Under. La ventaja de localía en la NBA históricamente supone 3-4 puntos adicionales para el equipo local.`
      : `${h.team.name} llega con rendimiento ${h.form.map(f=>f.result).join('')} en sus últimos ${h.form.length} encuentros, registrando ${hWins} victorias. ${a.team.name} acumula ${aWins}/${a.form.length} victorias en el mismo periodo. El modelo estadístico, basado en el rendimiento reciente y patrones históricos, sitúa a ${favorito} como claro favorito con ${confPct}% de probabilidad. Las cuotas estimadas reflejan esta ventaja: ${h.team.name} @${markets.result.homeOdds} y ${a.team.name} @${markets.result.awayOdds}.`;

    keyFactors = [
      `Forma reciente — ${h.team.name}: ${hForm} (${hWins}/${h.form.length} victorias) vs ${a.team.name}: ${aForm} (${aWins}/${a.form.length} victorias)`,
      isSoccer
        ? `Potencial goleador combinado: ${(h.goalsScored + a.goalsScored).toFixed(1)} goles/partido esperados — Over 2.5 al ${markets.overUnder25.over}%`
        : isBasketball
        ? `Diferencial de puntuación: ${h.team.name} ${(h.goalsScored - h.goalsConceded).toFixed(1)} vs ${a.team.name} ${(a.goalsScored - a.goalsConceded).toFixed(1)}`
        : `Rendimiento ofensivo: ${h.team.name} ${h.goalsScored.toFixed(1)} vs ${a.team.name} ${a.goalsScored.toFixed(1)}`,
      `Probabilidades del modelo: ${h.team.name} ${markets.result.home}% — Empate ${markets.result.draw}% — ${a.team.name} ${markets.result.away}%`,
      isSoccer
        ? `BTTS histórico: ${h.team.name} ${h.btts}% / ${a.team.name} ${a.btts}% — probabilidad combinada ${markets.btts.yes}%`
        : `Ventaja estadística neta a favor de ${favorito} basada en los últimos ${Math.max(h.form.length, a.form.length)} partidos`,
      `Apuesta de valor del modelo: ${markets.bestBet.pick} @ ${markets.bestBet.odds} — confianza ${markets.bestBet.confidence}%`,
    ];

    risks = [
      `Lesiones o ausencias de último momento podrían alterar radicalmente el rendimiento esperado`,
      isSoccer
        ? `Alta varianza en resultados de fútbol: el ${Math.min(markets.result.draw, 30)}% de probabilidad de empate representa un riesgo de valor nulo para las apuestas al ganador`
        : `La forma reciente puede no reflejar el nivel real si los últimos rivales eran claramente inferiores o superiores`,
      `Factores externos no contemplados: condiciones meteorológicas, desgaste físico por saturación de calendario, o motivación diferencial según posición en la tabla`,
    ];

    prediction = isSoccer
      ? `Se espera victoria de ${favorito} con mayor probabilidad. Marcador estimado: ${winner === 'home' ? `${Math.round(h.goalsScored)} - ${Math.round(a.goalsConceded * 0.8)}` : winner === 'away' ? `${Math.round(h.goalsConceded * 0.8)} - ${Math.round(a.goalsScored)}` : '1 - 1'}. Confianza: ${confPct}%. Los datos de forma y estadísticas apuntan a ${favorito} como favorito claro, con mercado Over 2.5 al ${markets.overUnder25.over}% como apuesta complementaria.`
      : isBasketball
      ? `Victoria probable de ${favorito} por aproximadamente ${Math.abs(Math.round(h.goalsScored - a.goalsScored) + 3)} puntos. Resultado estimado: ${winner === 'home' ? `${Math.round(h.goalsScored)} - ${Math.round(a.goalsScored - 3)}` : `${Math.round(h.goalsScored - 3)} - ${Math.round(a.goalsScored)}`}. Confianza: ${confPct}%.`
      : `${favorito} tiene ${confPct}% de probabilidad de victoria según el modelo. La forma reciente y el historial de rendimiento respaldan esta predicción.`;
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
    prediction:  prediction || undefined,
    keyFactors,
    risks,
    tier:        isPro ? 'pro' : 'flash',
    generatedAt: new Date().toISOString(),
  };
}
