import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';

// ─── SVG ICONS ─────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0, opacity: 0.6 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── TYPES ─────────────────────────────────────────────────────────────────
interface Topic {
  id: string;
  level: 'basic' | 'intermediate' | 'advanced';
  titleEs: string; titleEn: string;
  bodyEs: string[]; bodyEn: string[];
}
interface Category {
  id: string;
  labelEs: string; labelEn: string;
  descEs: string; descEn: string;
  topics: Topic[];
}

const LEVEL_COLOR: Record<string, string> = {
  basic: '#00c896', intermediate: '#c9a84c', advanced: '#e05c5c',
};
const LEVEL_LABEL: Record<string, { es: string; en: string }> = {
  basic:        { es: 'Básico',     en: 'Basic'        },
  intermediate: { es: 'Intermedio', en: 'Intermediate' },
  advanced:     { es: 'Avanzado',   en: 'Advanced'     },
};

// ─── CONTENT ───────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: 'markets',
    labelEs: 'Tipos de Apuesta', labelEn: 'Bet Types',
    descEs: 'Los mercados de apuestas fundamentales que todo apostador debe conocer.',
    descEn: 'The fundamental betting markets every punter should know.',
    topics: [
      {
        id: '1x2', level: 'basic',
        titleEs: 'Resultado 1X2 (partido)',
        titleEn: '1X2 match result',
        bodyEs: [
          'El mercado más sencillo y extendido: apuestas al resultado final del partido en tiempo reglamentario (90 minutos + descuento, sin prórroga).',
          '— 1: victoria del equipo local.',
          '— X: empate.',
          '— 2: victoria del equipo visitante.',
          'Las cuotas reflejan la probabilidad implícita que la casa asigna a cada resultado. Cuota 2.00 = 50% de probabilidad implícita (sin margen de la casa).',
          'Valor esperado (EV): si tu probabilidad estimada supera la probabilidad implícita de la cuota, tienes una apuesta de valor positivo. Apostar con valor es el objetivo a largo plazo.',
          'Error frecuente: apostar siempre al favorito. Los favoritos con cuotas bajas ofrecen poca rentabilidad y raramente tienen valor.',
        ],
        bodyEn: [
          'The simplest and most widespread market: bets on the final result of the match in regular time (90 minutes + stoppage, no extra time).',
          '— 1: home team win.',
          '— X: draw.',
          '— 2: away team win.',
          'Odds reflect the implied probability the bookmaker assigns to each outcome. Odds of 2.00 = 50% implied probability (before bookmaker margin).',
          'Expected Value (EV): if your estimated probability exceeds the implied probability in the odds, you have a positive-value bet. Betting with value is the long-term goal.',
          'Common mistake: always betting on the favourite. Low-odds favourites offer little return and rarely have value.',
        ],
      },
      {
        id: 'over-under', level: 'basic',
        titleEs: 'Over/Under (Más/Menos goles)',
        titleEn: 'Over/Under goals',
        bodyEs: [
          'Apuesta sobre el total de goles del partido, sin importar quién los marque ni el resultado final.',
          'Línea más común: Over/Under 2.5 goles.',
          '— Over 2.5: el partido termina con 3 o más goles. Cuota habitual 1.80-2.10.',
          '— Under 2.5: el partido termina con 0, 1 o 2 goles.',
          'También existen líneas de 0.5, 1.5, 3.5, 4.5... Cuanto mayor sea la línea, más difícil es el over y más fácil el under.',
          'Claves para analizar: media de goles de ambos equipos de local/visitante, racha de goles en los últimos 5 partidos, enfrentamientos directos históricos y bajas de jugadores clave.',
          'Mercados derivados: over/under de tarjetas, corners y goles en cada tiempo.',
        ],
        bodyEn: [
          'Bet on the total goals in the match, regardless of who scores or the final result.',
          'Most common line: Over/Under 2.5 goals.',
          '— Over 2.5: the match ends with 3 or more goals. Typical odds 1.80-2.10.',
          '— Under 2.5: the match ends with 0, 1 or 2 goals.',
          'Lines also exist at 0.5, 1.5, 3.5, 4.5... The higher the line, the harder the over and the easier the under.',
          'Keys to analyse: average goals for both teams at home/away, goal streak in last 5 matches, historical head-to-head and key player absences.',
          'Derivative markets: over/under on cards, corners and goals in each half.',
        ],
      },
      {
        id: 'btts', level: 'basic',
        titleEs: 'Ambos equipos marcan (BTTS)',
        titleEn: 'Both Teams To Score (BTTS)',
        bodyEs: [
          'Apuesta sobre si los dos equipos anotarán al menos un gol cada uno, independientemente del resultado.',
          '— BTTS Sí: ambos equipos marcan. Cuota habitual 1.70-2.00.',
          '— BTTS No: al menos uno de los equipos no marca.',
          'Este mercado no depende del resultado; un partido 1-1 o 3-2 son ganadores de BTTS Sí. Un partido 1-0 o 0-0 es ganador de BTTS No.',
          'Factores clave: porcentaje de partidos BTTS de cada equipo en las últimas jornadas, estilo de juego (defensivo vs ofensivo) y rivalidades históricas.',
          'El BTTS Sí combinado con Over 2.5 requiere que ambos marquen Y que haya al menos 3 goles en total, lo que reduce probabilidad pero eleva la cuota.',
        ],
        bodyEn: [
          'Bet on whether both teams will score at least one goal each, regardless of the result.',
          '— BTTS Yes: both teams score. Typical odds 1.70-2.00.',
          '— BTTS No: at least one team does not score.',
          'This market does not depend on the result; a 1-1 or 3-2 match are both BTTS Yes winners. A 1-0 or 0-0 match are BTTS No winners.',
          'Key factors: each team\'s BTTS percentage in recent fixtures, style of play (defensive vs offensive) and historical rivalries.',
          'BTTS Yes combined with Over 2.5 requires both to score AND at least 3 total goals, which reduces probability but raises the odds.',
        ],
      },
      {
        id: 'handicap', level: 'intermediate',
        titleEs: 'Hándicap asiático y europeo',
        titleEn: 'Asian and European handicap',
        bodyEs: [
          'Los mercados de hándicap otorgan una ventaja o desventaja de goles a un equipo para equilibrar la apuesta.',
          'Hándicap europeo: también llamado hándicap entero. Se aplica un número entero de goles al resultado.',
          '— Ejemplo: Real Madrid -1 vs Alavés. Si apuestas a Real Madrid con -1, necesitas que gane por 2 o más goles.',
          'Hándicap asiático: elimina el empate (reduce a 2 posibles resultados) usando medios goles o cuartos.',
          '— Hándicap -0.5: el equipo favorito debe ganar por cualquier margen.',
          '— Hándicap -1.5: el favorito debe ganar por 2 o más.',
          '— Hándicap -0.25 y -0.75: líneas de cuarto que dividen la apuesta entre dos resultados adyacentes. Si el resultado cae justo en una de las líneas, la mitad de la apuesta se devuelve.',
          'El hándicap asiático es más eficiente porque elimina el empate y ofrece mejores cuotas en favoritos claros.',
        ],
        bodyEn: [
          'Handicap markets give a goal advantage or disadvantage to a team to balance the bet.',
          'European handicap: also called whole handicap. A whole number of goals is applied to the result.',
          '— Example: Real Madrid -1 vs Alavés. If you bet on Real Madrid with -1, you need them to win by 2 or more goals.',
          'Asian handicap: eliminates the draw (reduces to 2 possible outcomes) using half or quarter goals.',
          '— Handicap -0.5: the favourite must win by any margin.',
          '— Handicap -1.5: the favourite must win by 2 or more.',
          '— Handicap -0.25 and -0.75: quarter lines that split the bet between two adjacent outcomes. If the result lands exactly on one of the lines, half the stake is returned.',
          'Asian handicap is more efficient because it eliminates the draw and offers better odds on clear favourites.',
        ],
      },
      {
        id: 'corners-cards', level: 'intermediate',
        titleEs: 'Corners, tarjetas y otros mercados',
        titleEn: 'Corners, cards and other markets',
        bodyEs: [
          'Los mercados de estadísticas del partido ofrecen oportunidades interesantes porque muchos apostadores no los estudian con rigor.',
          'Corners:',
          '— Over/Under corners: el total de córneres del partido. Línea habitual 9.5 o 10.5.',
          '— Primer corner: equipo que lanza el primer córner del partido.',
          'Tarjetas:',
          '— Over/Under tarjetas: total de amarillas (=1 punto) y rojas (=2 puntos). Línea habitual 3.5-4.5 puntos.',
          '— Primer amonestado: jugador que recibe la primera tarjeta.',
          'Claves de análisis: árbitro asignado (algunos pitan muchas más tarjetas que otros), historial de córneres de los equipos, importancia del partido y rivalidad.',
          'Mercados de tiempo: resultado al descanso (HT), gol en la primera/segunda mitad, momento del primer gol.',
        ],
        bodyEn: [
          'Match statistics markets offer interesting opportunities because many bettors do not study them rigorously.',
          'Corners:',
          '— Over/Under corners: total corners in the match. Usual line 9.5 or 10.5.',
          '— First corner: team to win the first corner of the match.',
          'Cards:',
          '— Over/Under cards: total yellows (=1 point) and reds (=2 points). Usual line 3.5-4.5 points.',
          '— First booking: player to receive the first card.',
          'Analysis keys: assigned referee (some award far more cards than others), teams\' corner history, match importance and rivalry.',
          'Time markets: half-time result (HT), goal in first/second half, timing of first goal.',
        ],
      },
    ],
  },
  {
    id: 'strategy',
    labelEs: 'Estrategia y Valor', labelEn: 'Strategy and Value',
    descEs: 'Cómo pensar las apuestas a largo plazo para ser rentable.',
    descEn: 'How to think about betting long-term to be profitable.',
    topics: [
      {
        id: 'value-betting', level: 'basic',
        titleEs: 'Value betting: la única estrategia sostenible',
        titleEn: 'Value betting: the only sustainable strategy',
        bodyEs: [
          'El value betting es la búsqueda de apuestas donde tu probabilidad estimada es superior a la probabilidad implícita de la cuota.',
          'Fórmula de valor esperado (EV):',
          '  EV = (Probabilidad propia × Cuota) − 1',
          'Ejemplo: crees que el equipo A tiene un 60% de probabilidades de ganar. La cuota es 1.90 (probabilidad implícita 52.6%).',
          '  EV = (0.60 × 1.90) − 1 = 0.14 → Valor positivo del 14%.',
          'El value betting no garantiza ganar cada apuesta, pero a largo plazo, apostar con EV positivo genera beneficio.',
          'Cómo estimar tu probabilidad propia: análisis de forma, estadísticas, lesiones, motivación y condiciones del partido.',
          'La disciplina de registrar todas las apuestas y calcular el EV real obtenido es lo que separa al apostador profesional del recreativo.',
        ],
        bodyEn: [
          'Value betting is the search for bets where your estimated probability is higher than the implied probability in the odds.',
          'Expected value (EV) formula:',
          '  EV = (Own probability × Odds) − 1',
          'Example: you believe Team A has a 60% chance of winning. The odds are 1.90 (implied probability 52.6%).',
          '  EV = (0.60 × 1.90) − 1 = 0.14 → Positive value of 14%.',
          'Value betting does not guarantee winning every bet, but in the long run, betting with positive EV generates profit.',
          'How to estimate your own probability: form analysis, statistics, injuries, motivation and match conditions.',
          'The discipline of recording all bets and calculating the actual EV obtained is what separates the professional bettor from the recreational one.',
        ],
      },
      {
        id: 'bankroll', level: 'basic',
        titleEs: 'Gestión del bankroll',
        titleEn: 'Bankroll management',
        bodyEs: [
          'El bankroll es el capital específicamente destinado a apuestas. Gestionarlo bien es la diferencia entre sobrevivir a las rachas y quebrar.',
          'Regla de la unidad fija: apuesta siempre el mismo porcentaje de tu bankroll por apuesta, independientemente del nivel de confianza.',
          '— Recomendado: 1-3% del bankroll por apuesta.',
          '— Con un bankroll de 500 €, cada apuesta debe ser de 5-15 €.',
          'Kelly Criterion: tamaño de apuesta óptimo calculado como:',
          '  f = (EV) / (Cuota − 1)',
          'Donde f es la fracción del bankroll. Muchos apostadores usan medio Kelly o un cuarto Kelly para reducir la volatilidad.',
          'Nunca "perseguir pérdidas": aumentar el tamaño de apuesta para recuperar lo perdido es la causa número uno de ruina.',
          'Registro obligatorio: anota cada apuesta (evento, mercado, cuota, stake, resultado). Sin datos no puedes mejorar.',
        ],
        bodyEn: [
          'The bankroll is the capital specifically allocated to betting. Managing it well is the difference between surviving losing streaks and going bust.',
          'Fixed unit rule: always bet the same percentage of your bankroll per bet, regardless of confidence level.',
          '— Recommended: 1-3% of bankroll per bet.',
          '— With a bankroll of €500, each bet should be €5-15.',
          'Kelly Criterion: optimal bet size calculated as:',
          '  f = (EV) / (Odds − 1)',
          'Where f is the fraction of the bankroll. Many bettors use half Kelly or quarter Kelly to reduce volatility.',
          'Never "chase losses": increasing bet size to recover losses is the number one cause of ruin.',
          'Mandatory records: log every bet (event, market, odds, stake, result). Without data you cannot improve.',
        ],
      },
      {
        id: 'line-movement', level: 'intermediate',
        titleEs: 'Movimiento de líneas y cuotas',
        titleEn: 'Line movement and odds changes',
        bodyEs: [
          'Las cuotas no son fijas; cambian en función del dinero que entra en cada lado y de la nueva información disponible (lesiones, alineaciones, clima).',
          'Tipos de movimiento:',
          '— Movimiento por dinero: la casa mueve la cuota para equilibrar su exposición. Indica dónde está apostando el público.',
          '— Movimiento por información: cambio repentino ligado a una noticia (lesión de un jugador clave, sanción).',
          '— Steam move: múltiples casas mueven simultáneamente, señal de que apostadores sofisticados han actuado.',
          'Aprovechar el movimiento: apostar antes de que las cuotas bajen si tienes información temprana. Comparar cuotas en varios operadores (line shopping) para obtener el mejor precio.',
          'Cuota de apertura vs cierre: históricamente, la cuota de cierre es más eficiente. Si tus apuestas obtienen cuotas mejores que el cierre de forma consistente, tienes una ventaja real.',
        ],
        bodyEn: [
          'Odds are not fixed; they change based on money coming in on each side and new available information (injuries, line-ups, weather).',
          'Types of movement:',
          '— Money movement: the bookmaker moves the odds to balance its exposure. Indicates where the public is betting.',
          '— Information movement: sudden change linked to news (key player injury, suspension).',
          '— Steam move: multiple bookmakers move simultaneously, a signal that sophisticated bettors have acted.',
          'Exploiting movement: bet before odds drop if you have early information. Compare odds across multiple operators (line shopping) to get the best price.',
          'Opening vs closing line: historically the closing line is more efficient. If your bets consistently obtain better odds than the close, you have a genuine edge.',
        ],
      },
      {
        id: 'statistics', level: 'intermediate',
        titleEs: 'Estadísticas clave para analizar partidos',
        titleEn: 'Key statistics for match analysis',
        bodyEs: [
          'Las estadísticas bien utilizadas son la base del análisis deportivo cuantitativo. No todas las métricas tienen el mismo valor predictivo.',
          'Estadísticas de alta relevancia predictiva:',
          '— xG (expected goals): goles esperados basados en la calidad de las ocasiones creadas. Más estable que los goles reales en muestras pequeñas.',
          '— xGA (expected goals against): calidad de las ocasiones concedidas.',
          '— Diferencial xG (xGD): xG − xGA por partido. Indica el rendimiento real del equipo más allá del resultado.',
          '— PPDA (Passes Per Defensive Action): mide la intensidad del pressing.',
          'Estadísticas de relevancia media:',
          '— Posesión: no tiene alta correlación con ganar, especialmente en equipos que juegan al contraataque.',
          '— Tiros totales: menos útil que los tiros a puerta o el xG.',
          'Factores no cuantificables: motivación (¿el partido tiene algo en juego?), fatiga acumulada, distancia viajada y cambios de entrenador recientes.',
        ],
        bodyEn: [
          'Statistics, well used, are the foundation of quantitative sports analysis. Not all metrics have the same predictive value.',
          'High predictive relevance statistics:',
          '— xG (expected goals): expected goals based on the quality of chances created. More stable than actual goals in small samples.',
          '— xGA (expected goals against): quality of chances conceded.',
          '— xG differential (xGD): xG − xGA per match. Indicates the team\'s true performance beyond the result.',
          '— PPDA (Passes Per Defensive Action): measures pressing intensity.',
          'Medium relevance statistics:',
          '— Possession: does not have a high correlation with winning, especially for counter-attacking teams.',
          '— Total shots: less useful than shots on target or xG.',
          'Non-quantifiable factors: motivation (does the match have something at stake?), accumulated fatigue, distance travelled and recent manager changes.',
        ],
      },
    ],
  },
  {
    id: 'sports',
    labelEs: 'Por Deporte', labelEn: 'By Sport',
    descEs: 'Particularidades de cada deporte que cambian el análisis.',
    descEn: 'Specific characteristics of each sport that change the analysis.',
    topics: [
      {
        id: 'football-keys', level: 'basic',
        titleEs: 'Fútbol: claves de análisis',
        titleEn: 'Football: analysis keys',
        bodyEs: [
          'El fútbol es el deporte con mayor oferta de mercados y estadísticas. La varianza es alta: el equipo inferior gana con frecuencia.',
          'Factores esenciales a analizar antes de cada partido:',
          '— Forma reciente: últimos 5 partidos (de local y de visitante por separado).',
          '— Bajas y lesiones: especialmente porteros y delanteros goleadores.',
          '— Motivación: ¿está clasificado para próxima ronda? ¿En descenso? ¿Le importa el resultado?',
          '— Fatiga: ¿jugó entre semana? ¿Cuántas horas viajó?',
          '— Racha local/visitante: algunos equipos rinden mucho mejor o peor fuera de casa.',
          'Mercados que mejor se prestan al análisis: Over/Under goles (alta predictibilidad por estadísticas), hándicap asiático (elimina el factor empate) y BTTS.',
          'Mercados de menor edge para el apostador aficionado: goleador exacto, resultado exacto, primera tarjeta.',
        ],
        bodyEn: [
          'Football has the largest market and statistics offering. Variance is high: the weaker team wins frequently.',
          'Essential factors to analyse before each match:',
          '— Recent form: last 5 matches (home and away separately).',
          '— Absences and injuries: especially goalkeepers and key strikers.',
          '— Motivation: qualified for the next round? Relegation battle? Does the result matter?',
          '— Fatigue: did they play midweek? How many hours did they travel?',
          '— Home/away streak: some teams perform much better or worse away from home.',
          'Markets best suited to analysis: Over/Under goals (high predictability from statistics), Asian handicap (eliminates the draw factor) and BTTS.',
          'Markets with less edge for the amateur bettor: exact scorer, correct score, first card.',
        ],
      },
      {
        id: 'tennis-keys', level: 'basic',
        titleEs: 'Tenis: claves de análisis',
        titleEn: 'Tennis: analysis keys',
        bodyEs: [
          'El tenis es individual; un solo jugador determina el resultado. Esto hace la información específica sobre cada jugador muy valiosa.',
          'Factores esenciales:',
          '— Superficie: arcilla, hierba o pista dura. El rendimiento de muchos jugadores varía drásticamente según la superficie.',
          '— Ranking y forma reciente: los rankings ATP/WTA son una referencia, pero la forma actual pesa más.',
          '— Head-to-head (H2H): el historial de enfrentamientos directos puede reflejar ventajas psicológicas.',
          '— Estado físico: lesiones, partidos recientes (fatiga acumulada en torneos de varios días).',
          '— Condiciones: bola lenta o rápida, temperatura y altitud afectan el juego.',
          'Mercados principales: ganador del partido, hándicap de juegos, over/under de juegos por set y total de juegos.',
          'In-play (en vivo): el tenis es excelente para las apuestas en vivo porque los momentos cambian rápido y las cuotas oscilan mucho.',
        ],
        bodyEn: [
          'Tennis is individual; a single player determines the outcome. This makes specific information about each player very valuable.',
          'Essential factors:',
          '— Surface: clay, grass or hard court. Many players\' performance varies drastically by surface.',
          '— Ranking and recent form: ATP/WTA rankings are a reference, but current form weighs more.',
          '— Head-to-head (H2H): historical record of direct meetings can reflect psychological advantages.',
          '— Physical condition: injuries, recent matches (accumulated fatigue in multi-day tournaments).',
          '— Conditions: slow or fast ball, temperature and altitude affect play.',
          'Main markets: match winner, games handicap, over/under games per set and total games.',
          'In-play (live): tennis is excellent for live betting because momentum changes quickly and odds fluctuate a lot.',
        ],
      },
      {
        id: 'basketball-keys', level: 'basic',
        titleEs: 'Baloncesto: claves de análisis',
        titleEn: 'Basketball: analysis keys',
        bodyEs: [
          'El baloncesto (especialmente la NBA) tiene alta disponibilidad de datos avanzados y mercados de línea muy eficientes.',
          'Factores críticos:',
          '— Back-to-back: equipos que juegan dos partidos en días consecutivos rinden peor en el segundo.',
          '— Descanso: días de descanso entre partidos influyen significativamente.',
          '— Bajas de estrellas: en NBA, la ausencia de un All-Star puede cambiar 8-10 puntos la línea.',
          '— Ritmo de juego (pace): equipos con alto pace generan más posesiones y más puntos.',
          'Métricas avanzadas útiles: Offensive Rating (ORtg), Defensive Rating (DRtg), Net Rating (ORtg − DRtg por 100 posesiones).',
          'Mercados principales: ganador, línea de puntos (hándicap), total de puntos (over/under).',
          'El over/under en baloncesto tiene correlación directa con el pace de ambos equipos: high pace vs high pace → tendencia al over.',
        ],
        bodyEn: [
          'Basketball (especially NBA) has high availability of advanced data and very efficient line markets.',
          'Critical factors:',
          '— Back-to-back: teams playing two games on consecutive days perform worse in the second.',
          '— Rest: days of rest between games significantly influence performance.',
          '— Star absences: in NBA, the absence of an All-Star can move the line 8-10 points.',
          '— Game pace: high-pace teams generate more possessions and more points.',
          'Useful advanced metrics: Offensive Rating (ORtg), Defensive Rating (DRtg), Net Rating (ORtg − DRtg per 100 possessions).',
          'Main markets: winner, point spread (handicap), total points (over/under).',
          'Over/under in basketball has a direct correlation with both teams\' pace: high pace vs high pace → tendency to the over.',
        ],
      },
    ],
  },
  {
    id: 'mindset',
    labelEs: 'Mentalidad y Disciplina', labelEn: 'Mindset and Discipline',
    descEs: 'Los factores mentales que determinan el resultado a largo plazo.',
    descEn: 'The mental factors that determine long-term outcomes.',
    topics: [
      {
        id: 'long-run', level: 'basic',
        titleEs: 'Pensar a largo plazo',
        titleEn: 'Thinking long-term',
        bodyEs: [
          'Las apuestas deportivas son un juego de probabilidades. Incluso con una ventaja real, las rachas de pérdidas son inevitables y normales.',
          'Concepto clave: la varianza. Con una tasa de acierto del 55% y 100 apuestas, es estadísticamente normal perder 10-15 seguidas.',
          'El error más destructivo es cambiar de estrategia durante una racha perdedora si el proceso es correcto.',
          'Cómo medir tu rendimiento real:',
          '— ROI (Return on Investment): beneficio neto dividido por el total apostado. Referencia: +5% es muy bueno a largo plazo.',
          '— Closing Line Value (CLV): comparar tus cuotas con el cierre del mercado. Positivo de forma consistente indica ventaja real.',
          '— Yield: % de beneficio sobre el total apostado.',
          'Horizonte mínimo para juzgar resultados: 500-1000 apuestas. Por debajo de eso, los resultados son principalmente ruido estadístico.',
        ],
        bodyEn: [
          'Sports betting is a probability game. Even with a genuine edge, losing streaks are inevitable and normal.',
          'Key concept: variance. With a 55% win rate and 100 bets, losing 10-15 in a row is statistically normal.',
          'The most destructive mistake is changing strategy during a losing streak if the process is correct.',
          'How to measure your real performance:',
          '— ROI (Return on Investment): net profit divided by total staked. Reference: +5% is very good long-term.',
          '— Closing Line Value (CLV): compare your odds with the market close. Consistently positive indicates a genuine edge.',
          '— Yield: % profit on total staked.',
          'Minimum horizon to judge results: 500-1,000 bets. Below that, results are mainly statistical noise.',
        ],
      },
      {
        id: 'traps', level: 'basic',
        titleEs: 'Trampas mentales en las apuestas',
        titleEn: 'Mental traps in betting',
        bodyEs: [
          'Los sesgos cognitivos son el principal obstáculo para la rentabilidad. Conocerlos no los elimina, pero permite combatirlos.',
          '— Sesgo de recencia: sobreponderar lo que acaba de pasar. Un equipo que ganó 3-0 "tiene que seguir ganando" es una trampa.',
          '— Sesgo del hincha: apostar sistemáticamente por tu equipo favorito. Las emociones y el análisis frío no se mezclan.',
          '— Perseguir pérdidas (tilt): doblar stakes para recuperar lo perdido. Causa la ruina de la mayoría.',
          '— Falacia del apostador: creer que porque algo no ha pasado en mucho tiempo, "le toca". Las probabilidades no tienen memoria.',
          '— Parley trap: las apuestas combinadas dan cuotas altas pero tienen probabilidad real muy inferior a la percibida.',
          'Solución práctica: definir por escrito las reglas antes de cada sesión y no desviarse de ellas. Lo que se decide en frío es mejor que lo que se decide con emociones.',
        ],
        bodyEn: [
          'Cognitive biases are the main obstacle to profitability. Knowing them does not eliminate them, but allows you to combat them.',
          '— Recency bias: overweighting what just happened. A team that won 3-0 "must keep winning" is a trap.',
          '— Fan bias: systematically betting on your favourite team. Emotions and cold analysis do not mix.',
          '— Chasing losses (tilt): doubling stakes to recover losses. Causes the ruin of most.',
          '— Gambler\'s fallacy: believing that because something hasn\'t happened in a long time, "it\'s due". Probabilities have no memory.',
          '— Parlay trap: combination bets give high odds but have a real probability far below what is perceived.',
          'Practical solution: define the rules in writing before each session and do not deviate from them. Cold decisions are better than emotional ones.',
        ],
      },
    ],
  },
];

// ─── TOPIC CARD ─────────────────────────────────────────────────────────────
function TopicCard({ topic, lang }: { topic: Topic; lang: string }) {
  const [open, setOpen] = useState(false);
  const title = lang === 'es' ? topic.titleEs : topic.titleEn;
  const body  = lang === 'es' ? topic.bodyEs  : topic.bodyEn;
  const lc    = LEVEL_COLOR[topic.level];
  const ll    = LEVEL_LABEL[topic.level][lang === 'es' ? 'es' : 'en'];

  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${open ? lc + '28' : 'var(--border)'}`,
      background: open ? `${lc}05` : 'var(--card)',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem',
          padding: '0.9rem 1.1rem', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          padding: '0.15rem 0.48rem', borderRadius: 4,
          fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', flexShrink: 0,
          color: lc, background: `${lc}14`, border: `1px solid ${lc}28`,
        }}>{ll}</span>
        <span style={{ flex: 1, fontSize: '0.87rem', fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>{title}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem', borderTop: '1px solid var(--border)' }}>
          {body.map((line, i) => (
            line.startsWith('—') ? (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', marginTop: i === 0 ? '0.8rem' : 0 }}>
                <span style={{ color: lc, flexShrink: 0, fontWeight: 500 }}>—</span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text2)', lineHeight: 1.65 }}>{line.slice(1).trim()}</span>
              </div>
            ) : line.startsWith('  ') ? (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--cyan)', background: 'var(--card2)', padding: '0.5rem 0.8rem', borderRadius: 6, marginTop: '0.4rem', marginBottom: '0.4rem', border: '1px solid var(--border)' }}>{line.trim()}</div>
            ) : (
              <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.7, marginTop: i === 0 ? '0.8rem' : '0.4rem' }}>{line}</p>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
export function EducationPage() {
  const { lang, t } = useLang();
  const [activeCategory, setActiveCategory] = useState('markets');
  const [levelFilter, setLevelFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');

  const category = CATEGORIES.find(c => c.id === activeCategory) ?? CATEGORIES[0];
  const topics   = levelFilter === 'all' ? category.topics : category.topics.filter(tp => tp.level === levelFilter);

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 860, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {t('CENTRO DE FORMACIÓN', 'EDUCATION CENTER')}
        </div>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {t('Formación en Apuestas', 'Betting Education')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.87rem', maxWidth: 520, lineHeight: 1.65 }}>
          {t(
            'Mercados, estrategia, estadísticas y psicología. Todo lo que necesitas para apostar con criterio.',
            'Markets, strategy, statistics and psychology. Everything you need to bet with judgement.',
          )}
        </p>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '0.38rem 0.85rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: activeCategory === cat.id ? 'var(--gold)' : 'var(--card2)',
              color: activeCategory === cat.id ? '#050810' : 'var(--muted)',
            }}>
            {lang === 'es' ? cat.labelEs : cat.labelEn}
          </button>
        ))}
      </div>

      {/* Category description */}
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1.2rem', lineHeight: 1.5 }}>
        {lang === 'es' ? category.descEs : category.descEn}
      </p>

      {/* Level filter */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginRight: '0.2rem', flexShrink: 0 }}>{t('Nivel:', 'Level:')}</span>
        {(['all', 'basic', 'intermediate', 'advanced'] as const).map(lv => (
          <button key={lv} onClick={() => setLevelFilter(lv)}
            style={{
              padding: '0.22rem 0.65rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${levelFilter === lv ? (lv === 'all' ? 'var(--border2)' : LEVEL_COLOR[lv]) : 'var(--border)'}`,
              background: levelFilter === lv ? (lv === 'all' ? 'var(--card2)' : `${LEVEL_COLOR[lv]}14`) : 'transparent',
              color: levelFilter === lv ? (lv === 'all' ? 'var(--text)' : LEVEL_COLOR[lv]) : 'var(--muted)',
            }}>
            {lv === 'all' ? t('Todos', 'All') : LEVEL_LABEL[lv][lang === 'es' ? 'es' : 'en']}
          </button>
        ))}
      </div>

      {/* Topics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {topics.length === 0
          ? <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.87rem' }}>{t('Sin temas en este nivel.', 'No topics at this level.')}</p>
          : topics.map(tp => <TopicCard key={tp.id} topic={tp} lang={lang} />)
        }
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', fontSize: '0.77rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text2)' }}>{t('Aviso:', 'Disclaimer:')} </strong>
        {t(
          'Este contenido es exclusivamente educativo. No constituye asesoramiento ni incita a las apuestas. Apuesta de forma responsable. Si el juego afecta tu vida, busca ayuda profesional.',
          'This content is for educational purposes only. It does not constitute advice or encourage betting. Bet responsibly. If gambling affects your life, seek professional help.',
        )}
      </div>
    </div>
  );
}
