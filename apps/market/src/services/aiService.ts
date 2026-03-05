import type { Asset, TechnicalIndicators, AIAnalysis, SignalStrength, Plan } from '../types';
import { GEMINI_FLASH, GEMINI_PRO } from '../constants';

function deriveSignal(indicators: TechnicalIndicators, asset: Asset): SignalStrength {
  let score = 0;
  if (indicators.rsi < 30) score += 2;
  else if (indicators.rsi < 45) score += 1;
  else if (indicators.rsi > 70) score -= 2;
  else if (indicators.rsi > 60) score -= 1;

  if (indicators.macd.histogram > 0) score += 1;
  else score -= 1;

  if (asset.price > indicators.ema20) score += 1;
  if (asset.price > indicators.ema50) score += 1;
  if (indicators.ema20 > indicators.ema50) score += 1;

  if (asset.changePercent24h > 3) score += 1;
  else if (asset.changePercent24h < -3) score -= 1;

  if (score >= 4) return 'strong_buy';
  if (score >= 2) return 'buy';
  if (score <= -4) return 'strong_sell';
  if (score <= -2) return 'sell';
  return 'neutral';
}

function formatIndicatorsForPrompt(ind: TechnicalIndicators, asset: Asset): string {
  return `
Activo: ${asset.name} (${asset.symbol})
Precio actual: ${asset.price}
Cambio 24h: ${asset.changePercent24h > 0 ? '+' : ''}${asset.changePercent24h}%
RSI(14): ${ind.rsi}
MACD: ${ind.macd.value.toFixed(4)} | Signal: ${ind.macd.signal.toFixed(4)} | Histogram: ${ind.macd.histogram.toFixed(4)}
EMA20: ${ind.ema20} | EMA50: ${ind.ema50} | EMA200: ${ind.ema200}
Bollinger Superior: ${ind.bollingerBands.upper} | Medio: ${ind.bollingerBands.middle} | Inferior: ${ind.bollingerBands.lower}
ATR(14): ${ind.atr}
Volumen promedio 20 velas: ${ind.volumeAvg20}
Max 24h: ${asset.high24h} | Min 24h: ${asset.low24h}
`.trim();
}

export async function generateAnalysis(
  asset: Asset,
  indicators: TechnicalIndicators,
  userPlan: Plan,
  apiKey: string
): Promise<AIAnalysis> {
  const isPro = userPlan === 'pro' || userPlan === 'elite';
  const model = isPro ? GEMINI_PRO : GEMINI_FLASH;
  const signal = deriveSignal(indicators, asset);

  const systemPrompt = isPro
    ? `Eres un analista financiero institucional senior especializado en análisis técnico y macro. 
Proporciona análisis profundos, precisos y estructurados en español. 
Usa Google Search para contexto de mercado en tiempo real cuando sea relevante.
NUNCA des consejos de inversión directos. Siempre habla de "contexto técnico" y "probabilidades estadísticas".
Sé conciso pero detallado. Máximo 300 palabras por sección.`
    : `Eres un analista de mercados financieros. 
Proporciona resúmenes técnicos claros y concisos en español.
NUNCA des consejos de inversión directos. Habla de "contexto técnico" y "probabilidades estadísticas".
Máximo 150 palabras. Sé directo y útil.`;

  const userPrompt = `Analiza los siguientes datos técnicos y genera un análisis estructurado:

${formatIndicatorsForPrompt(indicators, asset)}

Señal técnica derivada: ${signal}

Responde EXACTAMENTE en este formato JSON (sin markdown, solo JSON puro):
{
  "summary": "Resumen ejecutivo de 2-3 frases del contexto técnico actual",
  "technicalContext": "Análisis detallado de los indicadores técnicos más relevantes",
  "macroContext": "${isPro ? 'Contexto macroeconómico y de mercado global relevante para este activo' : ''}",
  "risks": ["riesgo técnico 1", "riesgo técnico 2", "riesgo técnico 3"],
  "opportunities": ["oportunidad técnica 1", "oportunidad técnica 2"],
  "keyLevels": {
    "support": [nivel1, nivel2],
    "resistance": [nivel3, nivel4]
  },
  "timeframe": "Horizonte temporal relevante para este análisis",
  "confidence": número entre 0 y 100
}`;

  try {
    // Check if API key is available
    if (!apiKey || apiKey === 'demo') {
      return generateMockAnalysis(asset, indicators, signal, isPro);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: isPro ? 2048 : 1024,
            responseMimeType: 'application/json',
          },
          ...(isPro && {
            tools: [{ googleSearch: {} }]
          }),
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini API error');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text);

    return {
      id: `analysis_${Date.now()}`,
      assetId: asset.id,
      assetSymbol: asset.symbol,
      tier: isPro ? 'pro' : 'flash',
      signal,
      confidence: parsed.confidence ?? 65,
      summary: parsed.summary ?? '',
      technicalContext: parsed.technicalContext ?? '',
      macroContext: parsed.macroContext ?? '',
      risks: parsed.risks ?? [],
      opportunities: parsed.opportunities ?? [],
      keyLevels: parsed.keyLevels ?? { support: [], resistance: [] },
      timeframe: parsed.timeframe ?? '4H - 1D',
      createdAt: new Date().toISOString(),
    };
  } catch {
    return generateMockAnalysis(asset, indicators, signal, isPro);
  }
}

function generateMockAnalysis(
  asset: Asset,
  indicators: TechnicalIndicators,
  signal: SignalStrength,
  isPro: boolean
): AIAnalysis {
  const price = asset.price;
  const rsi = indicators.rsi;
  const ema20 = indicators.ema20;

  const rsiContext = rsi < 30 ? 'sobrevendido' : rsi > 70 ? 'sobrecomprado' : 'zona neutral';
  const macdDir = indicators.macd.histogram > 0 ? 'positivo (momentum alcista)' : 'negativo (momentum bajista)';
  const priceVsEma = price > ema20 ? 'por encima de EMA20, estructura técnica positiva' : 'por debajo de EMA20, presión vendedora';

  return {
    id: `analysis_${Date.now()}`,
    assetId: asset.id,
    assetSymbol: asset.symbol,
    tier: isPro ? 'pro' : 'flash',
    signal,
    confidence: Math.round(55 + Math.random() * 30),
    summary: `${asset.name} presenta un RSI(14) en zona ${rsiContext} (${rsi.toFixed(1)}), cotizando ${priceVsEma}. El histograma MACD es ${macdDir}, sugiriendo continuación de la tendencia actual.`,
    technicalContext: `RSI(14) en ${rsi.toFixed(1)} indica ${rsiContext}. MACD muestra histograma ${macdDir}. Precio cotiza ${price > ema20 ? 'sobre' : 'bajo'} EMA20 en ${ema20.toFixed(2)}, con EMA50 en ${indicators.ema50.toFixed(2)}. Bandas de Bollinger con ancho de ${((indicators.bollingerBands.upper - indicators.bollingerBands.lower) / indicators.bollingerBands.middle * 100).toFixed(1)}%, indicando volatilidad ${((indicators.bollingerBands.upper - indicators.bollingerBands.lower) / indicators.bollingerBands.middle * 100) > 5 ? 'elevada' : 'moderada'}.`,
    macroContext: isPro ? `Contexto de mercado amplio relevante. Monitorizar correlaciones con índices principales y flujos institucionales. Datos macro de la próxima semana pueden impactar la dirección del precio.` : '',
    risks: [
      `RSI ${rsi > 55 ? 'acercándose a zona de sobrecompra' : rsi < 45 ? 'en zona de presión bajista' : 'en zona neutral sin señal clara'}`,
      `Volatilidad ATR(14) de ${indicators.atr.toFixed(4)} puede generar movimientos bruscos`,
      `Resistencia técnica en ${indicators.bollingerBands.upper.toFixed(2)} (Bollinger Superior)`,
    ],
    opportunities: [
      `Soporte técnico fuerte en ${indicators.bollingerBands.lower.toFixed(2)} (Bollinger Inferior)`,
      `Cruce ${indicators.macd.histogram > 0 ? 'alcista' : 'potencial'} de MACD como confirmación`,
    ],
    keyLevels: {
      support: [
        parseFloat((price * 0.975).toFixed(4)),
        parseFloat((price * 0.955).toFixed(4)),
      ],
      resistance: [
        parseFloat((price * 1.025).toFixed(4)),
        parseFloat((price * 1.048).toFixed(4)),
      ],
    },
    timeframe: '4H - 1D',
    createdAt: new Date().toISOString(),
  };
}
