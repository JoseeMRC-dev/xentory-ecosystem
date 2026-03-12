import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';

// ─── SVG ICONS ─────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0, opacity: 0.6 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
  basic:        { es: 'Básico',      en: 'Basic'        },
  intermediate: { es: 'Intermedio',  en: 'Intermediate' },
  advanced:     { es: 'Avanzado',    en: 'Advanced'     },
};

// ─── CONTENT ───────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: 'fundamentals',
    labelEs: 'Fundamentos', labelEn: 'Fundamentals',
    descEs: 'Los pilares que todo inversor debe dominar antes de operar.',
    descEn: 'The pillars every investor must master before trading.',
    topics: [
      {
        id: 'what-market', level: 'basic',
        titleEs: '¿Qué es un mercado financiero?',
        titleEn: 'What is a financial market?',
        bodyEs: [
          'Un mercado financiero es el espacio donde compradores y vendedores intercambian activos: acciones, divisas, materias primas, bonos o criptomonedas. Su función esencial es la asignación eficiente de capital: el dinero fluye hacia donde genera más valor.',
          'Tipos principales:',
          '— Renta variable (bolsas): se adquieren participaciones de empresas.',
          '— Forex: el mayor del mundo, más de 6 billones de dólares diarios. Se intercambian pares de monedas.',
          '— Materias primas: oro, petróleo, gas natural, trigo.',
          '— Criptomonedas: activos digitales descentralizados de alta volatilidad.',
          '— Renta fija (bonos): deuda de gobiernos o empresas que paga un cupón periódico.',
          'Cada mercado tiene sus propios horarios, participantes y niveles de riesgo. Entender estas diferencias es el primer paso de cualquier inversor responsable.',
        ],
        bodyEn: [
          'A financial market is the space where buyers and sellers exchange assets: stocks, currencies, commodities, bonds or cryptocurrencies. Its essential function is the efficient allocation of capital: money flows to where it generates the most value.',
          'Main types:',
          '— Equities (stock exchanges): you acquire ownership stakes in companies.',
          '— Forex: the world\'s largest, over $6 trillion daily. Currency pairs are exchanged.',
          '— Commodities: gold, oil, natural gas, wheat.',
          '— Cryptocurrencies: decentralised digital assets with high volatility.',
          '— Fixed income (bonds): government or corporate debt that pays a periodic coupon.',
          'Each market has its own hours, participants and risk levels. Understanding these differences is the first step for any responsible investor.',
        ],
      },
      {
        id: 'supply-demand', level: 'basic',
        titleEs: 'Oferta, demanda y formación del precio',
        titleEn: 'Supply, demand and price formation',
        bodyEs: [
          'El precio de cualquier activo es el punto de equilibrio entre quienes quieren comprarlo (demanda) y quienes quieren venderlo (oferta) en cada instante.',
          '— Más compradores que vendedores → el precio sube.',
          '— Más vendedores que compradores → el precio baja.',
          'Factores que mueven la demanda: beneficios esperados, tipos de interés, noticias macroeconómicas y el sentimiento colectivo (miedo o euforia).',
          'Factores que mueven la oferta: número de acciones en circulación, producción de materias primas, emisión de nuevos tokens en crypto.',
          'Error frecuente: asumir que un activo que ha subido mucho "debe caer". El mercado puede mantener una tendencia mucho más tiempo de lo esperado.',
        ],
        bodyEn: [
          'The price of any asset is the equilibrium point between those who want to buy it (demand) and those who want to sell it (supply) at any given moment.',
          '— More buyers than sellers → price rises.',
          '— More sellers than buyers → price falls.',
          'Factors driving demand: expected earnings, interest rates, macroeconomic news and collective sentiment (fear or euphoria).',
          'Factors driving supply: shares in circulation, commodity production, issuance of new crypto tokens.',
          'Common mistake: assuming an asset that has risen a lot "must fall". The market can sustain a trend far longer than expected.',
        ],
      },
      {
        id: 'risk-return', level: 'basic',
        titleEs: 'Riesgo y rentabilidad',
        titleEn: 'Risk and return',
        bodyEs: [
          'La regla de oro de las finanzas: a mayor rentabilidad potencial, mayor riesgo asumido. No existe rentabilidad elevada sin riesgo.',
          'Tipos de riesgo que debes conocer:',
          '— Riesgo de mercado: el precio puede caer aunque hayas analizado bien.',
          '— Riesgo de liquidez: no poder vender al precio deseado cuando lo necesitas.',
          '— Riesgo de divisa: en activos extranjeros, el tipo de cambio te afecta.',
          '— Riesgo de concentración: tener todo en un solo activo o sector.',
          '— Riesgo apalancado: con derivados puedes perder más de lo invertido.',
          'Medidas clave: volatilidad (amplitud de oscilaciones), drawdown máximo (caída histórica desde un pico) y ratio Sharpe (rentabilidad ajustada por riesgo).',
          'Regla práctica: nunca inviertas dinero que vayas a necesitar en los próximos 12 meses.',
        ],
        bodyEn: [
          'The golden rule of finance: the higher the potential return, the higher the risk assumed. There is no high return without risk.',
          'Types of risk you should know:',
          '— Market risk: the price can fall even if you analysed correctly.',
          '— Liquidity risk: being unable to sell at the desired price when needed.',
          '— Currency risk: in foreign assets, the exchange rate affects you.',
          '— Concentration risk: having everything in one asset or sector.',
          '— Leverage risk: with derivatives you can lose more than you invested.',
          'Key measures: volatility (amplitude of price swings), maximum drawdown (largest historical drop from a peak) and Sharpe ratio (risk-adjusted return).',
          'Practical rule: never invest money you will need in the next 12 months.',
        ],
      },
    ],
  },
  {
    id: 'instruments',
    labelEs: 'Instrumentos', labelEn: 'Instruments',
    descEs: 'Cómo funcionan los activos que analizamos en la plataforma.',
    descEn: 'How the assets we analyse on the platform work.',
    topics: [
      {
        id: 'forex-deep', level: 'basic',
        titleEs: 'Divisas y Forex',
        titleEn: 'Currencies and Forex',
        bodyEs: [
          'El mercado Forex opera 24h/5 días y mueve más de 6 billones de dólares diarios, lo que lo convierte en el mercado más líquido del planeta.',
          'Pares de divisas:',
          '— Principales (Majors): EUR/USD, GBP/USD, USD/JPY. Mayor liquidez, menor spread.',
          '— Cruzados (Crosses): EUR/GBP, AUD/JPY. No incluyen el USD directamente.',
          '— Exóticos: USD/TRY, EUR/ZAR. Alta volatilidad y spreads elevados.',
          'Conceptos clave: pip (mínima variación, 0.0001 en EUR/USD), spread (diferencia entre precio de compra y venta, es tu coste de operar), apalancamiento (en Forex habitual 1:30, amplifica ganancias y pérdidas).',
          'Qué mueve el Forex: decisiones de bancos centrales (BCE, Fed, BOE), datos macro (IPC, desempleo, PIB) y eventos geopolíticos.',
        ],
        bodyEn: [
          'The Forex market operates 24h/5 days and moves over $6 trillion daily, making it the most liquid market on the planet.',
          'Currency pairs:',
          '— Majors: EUR/USD, GBP/USD, USD/JPY. Higher liquidity, lower spread.',
          '— Crosses: EUR/GBP, AUD/JPY. Do not directly involve USD.',
          '— Exotics: USD/TRY, EUR/ZAR. High volatility and elevated spreads.',
          'Key concepts: pip (minimum movement, 0.0001 in EUR/USD), spread (difference between buy and sell price — your trading cost), leverage (commonly 1:30 in Forex, amplifies gains and losses).',
          'What drives Forex: central bank decisions (ECB, Fed, BOE), macro data (CPI, unemployment, GDP) and geopolitical events.',
        ],
      },
      {
        id: 'crypto-deep', level: 'basic',
        titleEs: 'Criptomonedas',
        titleEn: 'Cryptocurrencies',
        bodyEs: [
          'Las criptomonedas son activos digitales que funcionan sobre tecnología blockchain, sin banco central ni intermediario.',
          '— Bitcoin (BTC): oferta limitada a 21 millones. Funciona como reserva de valor digital.',
          '— Ethereum (ETH): plataforma de contratos inteligentes. Sustenta DeFi y NFTs.',
          '— Altcoins: el resto. Riesgo significativamente mayor; muchos proyectos fracasan.',
          '— Halving: cada 4 años se reduce a la mitad la recompensa de minado de Bitcoin. Históricamente ha precedido ciclos alcistas.',
          'Riesgos específicos: volatilidad extrema (caídas del 80-90% son históricas en Bitcoin), riesgo regulatorio, hackeos de exchanges y proyectos fraudulentos.',
          'Buenas prácticas: custodiar en hardware wallet para cantidades significativas, no sobreinvertir más del 5-20% del portfolio si eres conservador o moderado.',
        ],
        bodyEn: [
          'Cryptocurrencies are digital assets that operate on blockchain technology, without a central bank or intermediary.',
          '— Bitcoin (BTC): supply capped at 21 million. Acts as a digital store of value.',
          '— Ethereum (ETH): smart contracts platform. Underpins DeFi and NFTs.',
          '— Altcoins: everything else. Significantly higher risk; many projects fail.',
          '— Halving: every 4 years the Bitcoin mining reward is halved. Historically preceded bull cycles.',
          'Specific risks: extreme volatility (80-90% drops are historical in Bitcoin), regulatory risk, exchange hacks and fraudulent projects.',
          'Best practices: self-custody in hardware wallet for significant amounts, do not over-invest more than 5-20% of the portfolio if you are conservative or moderate.',
        ],
      },
      {
        id: 'stocks-deep', level: 'basic',
        titleEs: 'Acciones y renta variable',
        titleEn: 'Stocks and equities',
        bodyEs: [
          'Una acción es una fracción de la propiedad de una empresa. Como accionista participas en beneficios (dividendos) y en la revalorización del negocio.',
          'Por qué se mueven los precios: resultados financieros (ingresos, beneficio neto, márgenes), perspectivas de crecimiento, tipos de interés y sentimiento de mercado.',
          'Valoraciones básicas:',
          '— PER (Price/Earnings): precio dividido por beneficio por acción. Indica si la empresa cotiza cara o barata.',
          '— EV/EBITDA: valor de empresa respecto a resultado operativo.',
          '— Dividend yield: dividendo entre precio. Clave para inversores de rentas.',
          'Estrategias populares: value investing (empresas infravaloradas), growth investing (alto potencial de crecimiento), DCA (inversión periódica de cantidad fija independientemente del precio).',
        ],
        bodyEn: [
          'A share is a fraction of ownership in a company. As a shareholder you participate in profits (dividends) and business appreciation.',
          'Why prices move: financial results (revenue, net profit, margins), growth prospects, interest rates and market sentiment.',
          'Basic valuations:',
          '— PER (Price/Earnings): price divided by earnings per share. Indicates whether a company is expensive or cheap.',
          '— EV/EBITDA: enterprise value relative to operating result.',
          '— Dividend yield: dividend divided by price. Key for income investors.',
          'Popular strategies: value investing (undervalued companies), growth investing (high growth potential), DCA (periodic fixed-amount investment regardless of price).',
        ],
      },
      {
        id: 'commodities-deep', level: 'intermediate',
        titleEs: 'Materias primas',
        titleEn: 'Commodities',
        bodyEs: [
          'Las materias primas son bienes físicos utilizados como insumos económicos. Se clasifican en energía (petróleo WTI/Brent, gas natural), metales preciosos (oro, plata), metales industriales (cobre, aluminio) y agrícolas (trigo, soja, café).',
          'El oro actúa históricamente como refugio en momentos de incertidumbre; el cobre como termómetro de la economía global.',
          'Cómo se negocia: futuros (obligación de compra/venta en fecha futura a precio pactado hoy), ETFs de materias primas (acceso indirecto sin contratos físicos) y CFDs.',
          'Factores que mueven los precios:',
          '— Oferta: producción OPEP, condiciones meteorológicas, inventarios.',
          '— Demanda: crecimiento industrial (China es determinante en metales).',
          '— Dólar americano: las commodities cotizan en USD; un dólar más fuerte presiona los precios a la baja.',
          '— Geopolítica: conflictos en zonas productoras generan volatilidad inmediata.',
        ],
        bodyEn: [
          'Commodities are physical goods used as economic inputs. They are classified into energy (WTI/Brent oil, natural gas), precious metals (gold, silver), industrial metals (copper, aluminium) and agricultural (wheat, soybeans, coffee).',
          'Gold historically acts as a safe haven in times of uncertainty; copper as a thermometer of the global economy.',
          'How they are traded: futures (obligation to buy/sell on a future date at a price agreed today), commodity ETFs (indirect access without physical contracts) and CFDs.',
          'Factors driving prices:',
          '— Supply: OPEC production, weather conditions, inventories.',
          '— Demand: industrial growth (China is decisive for metals).',
          '— US Dollar: commodities are priced in USD; a stronger dollar pushes prices down.',
          '— Geopolitics: conflicts in producing regions create immediate volatility.',
        ],
      },
    ],
  },
  {
    id: 'analysis',
    labelEs: 'Análisis', labelEn: 'Analysis',
    descEs: 'Herramientas para leer el mercado con criterio.',
    descEn: 'Tools to read the market with judgement.',
    topics: [
      {
        id: 'technical', level: 'intermediate',
        titleEs: 'Análisis técnico',
        titleEn: 'Technical analysis',
        bodyEs: [
          'El análisis técnico estudia la historia de precio y volumen para proyectar movimientos futuros. Se basa en tres premisas: el precio lo descuenta todo, los precios se mueven en tendencias y la historia tiende a repetirse.',
          'Conceptos esenciales:',
          '— Soporte y resistencia: niveles donde el precio tiende a detenerse o rebotar.',
          '— Tendencia: alcista (máximos y mínimos crecientes), bajista o lateral.',
          '— Media móvil (MA50, MA200): suaviza el ruido y revela la dirección.',
          '— Volumen: confirma la fuerza de cualquier movimiento.',
          'Indicadores más utilizados: RSI (sobrecompra >70, sobreventa <30), MACD (cruce de medias, señala cambios de momentum), Bandas de Bollinger (envoltura de volatilidad).',
          'Patrones de velas: doji, engulfing, hammer y shooting star alertan de posibles reversiones.',
          'Limitación importante: el análisis técnico mejora probabilidades, no las garantiza.',
        ],
        bodyEn: [
          'Technical analysis studies price and volume history to project future movements. It is based on three premises: the price discounts everything, prices move in trends and history tends to repeat itself.',
          'Essential concepts:',
          '— Support and resistance: levels where price tends to pause or bounce.',
          '— Trend: uptrend (rising highs and lows), downtrend or sideways.',
          '— Moving average (MA50, MA200): smooths noise and reveals direction.',
          '— Volume: confirms the strength of any move.',
          'Most used indicators: RSI (overbought >70, oversold <30), MACD (moving average crossover, signals momentum changes), Bollinger Bands (volatility envelope).',
          'Candlestick patterns: doji, engulfing, hammer and shooting star signal possible reversals.',
          'Important limitation: technical analysis improves probabilities, it does not guarantee them.',
        ],
      },
      {
        id: 'fundamental', level: 'intermediate',
        titleEs: 'Análisis fundamental',
        titleEn: 'Fundamental analysis',
        bodyEs: [
          'El análisis fundamental busca el valor intrínseco de un activo comparándolo con su precio de mercado para identificar oportunidades. El análisis técnico dice cuándo; el fundamental dice cuánto vale.',
          'Para acciones: cuenta de resultados (ingresos, EBITDA, beneficio neto), balance (activos, deuda, ratio deuda/EBITDA), flujo de caja libre (FCF) y márgenes de rentabilidad.',
          'Para Forex: diferencial de tipos de interés entre países, balanza comercial, datos de inflación y empleo, política monetaria del banco central.',
          'Para criptomonedas: tokenomics (distribución, inflación del token, utilidad), adopción (wallets activas, transacciones on-chain) y actividad de desarrollo del protocolo.',
          'El análisis fundamental es especialmente útil para posiciones de largo plazo donde el valor intrínseco acaba reflejándose en el precio.',
        ],
        bodyEn: [
          'Fundamental analysis seeks the intrinsic value of an asset by comparing it with its market price to identify opportunities. Technical analysis says when; fundamental says how much it is worth.',
          'For stocks: income statement (revenue, EBITDA, net profit), balance sheet (assets, debt, debt/EBITDA ratio), free cash flow (FCF) and profitability margins.',
          'For Forex: interest rate differential between countries, trade balance, inflation and employment data, central bank monetary policy.',
          'For cryptocurrencies: tokenomics (distribution, token inflation, utility), adoption (active wallets, on-chain transactions) and protocol development activity.',
          'Fundamental analysis is especially useful for long-term positions where intrinsic value eventually reflects in the price.',
        ],
      },
      {
        id: 'sentiment', level: 'advanced',
        titleEs: 'Sentimiento de mercado y flujos institucionales',
        titleEn: 'Market sentiment and institutional flows',
        bodyEs: [
          'El análisis de sentimiento estudia las emociones colectivas del mercado para anticipar puntos de inflexión. Funciona mejor en extremos.',
          'Herramientas principales:',
          '— Fear & Greed Index (crypto): 0-100. Extremos de miedo → oportunidad de compra. Extremos de codicia → señal de precaución.',
          '— COT Report (Commitment of Traders): posicionamiento de grandes especuladores en futuros, publicado semanalmente por la CFTC.',
          '— Put/Call Ratio: ratio alto = más puts = sentimiento bajista. Contrarian signal en extremos.',
          '— Short interest: % de acciones vendidas en corto. Alto short interest puede generar short squeezes explosivos.',
          'Smart Money Concept (SMC): análisis de zonas de liquidez, order blocks y fair value gaps para detectar dónde las instituciones colocan órdenes.',
          'Regla de oro: mercado con pánico generalizado suele ser más oportunidad que amenaza para el inversor con visión de largo plazo.',
        ],
        bodyEn: [
          'Sentiment analysis studies collective market emotions to anticipate inflection points. It works best at extremes.',
          'Main tools:',
          '— Fear & Greed Index (crypto): 0-100. Extreme fear → buying opportunity. Extreme greed → caution signal.',
          '— COT Report (Commitment of Traders): positioning of large speculators in futures, published weekly by the CFTC.',
          '— Put/Call Ratio: high ratio = more puts = bearish sentiment. Contrarian signal at extremes.',
          '— Short interest: % of shares sold short. High short interest can generate explosive short squeezes.',
          'Smart Money Concept (SMC): analysis of liquidity zones, order blocks and fair value gaps to detect where institutions place orders.',
          'Golden rule: a market in widespread panic is usually more of an opportunity than a threat for the long-term investor.',
        ],
      },
    ],
  },
  {
    id: 'risk',
    labelEs: 'Gestión del Riesgo', labelEn: 'Risk Management',
    descEs: 'La habilidad más importante y menos enseñada del trading.',
    descEn: 'The most important and least taught skill in trading.',
    topics: [
      {
        id: 'position-sizing', level: 'intermediate',
        titleEs: 'Tamaño de posición y gestión de capital',
        titleEn: 'Position sizing and capital management',
        bodyEs: [
          'La gestión del riesgo es la habilidad que separa a los traders rentables del resto. Sin ella, la mejor estrategia del mundo no sobrevive.',
          'Regla del 1-2%: no arriesgues más del 1-2% de tu capital total en una sola operación. Con 10.000 €, tu pérdida máxima por operación es de 100-200 €.',
          'Fórmula de tamaño de posición:',
          '  Tamaño = (Capital × % Riesgo) / (Precio entrada − Stop loss)',
          'Stop loss: orden que cierra automáticamente la posición al alcanzar la pérdida máxima definida. No es opcional.',
          'Ratio Riesgo/Beneficio (R:R): con un R:R de 1:2 puedes ganar dinero aunque solo aciertes el 40% de las operaciones.',
          'Diversificación real: activos con baja correlación entre sí. Mezclar acciones, bonos, oro y crypto reduce la volatilidad total sin sacrificar rentabilidad a largo plazo.',
        ],
        bodyEn: [
          'Risk management is the skill that separates profitable traders from the rest. Without it, even the best strategy in the world does not survive.',
          '1-2% rule: never risk more than 1-2% of your total capital on a single trade. With €10,000, your maximum loss per trade is €100-200.',
          'Position size formula:',
          '  Size = (Capital × Risk %) / (Entry price − Stop loss)',
          'Stop loss: an order that automatically closes the position when the defined maximum loss is reached. It is not optional.',
          'Risk/Reward Ratio (R:R): with a 1:2 R:R you can make money even if you are only right 40% of the time.',
          'True diversification: assets with low correlation between them. Mixing stocks, bonds, gold and crypto reduces total volatility without sacrificing long-term returns.',
        ],
      },
      {
        id: 'psychology', level: 'intermediate',
        titleEs: 'Psicología del inversor',
        titleEn: 'Investor psychology',
        bodyEs: [
          'La mayoría de los inversores minoristas obtienen rendimientos inferiores al mercado, no por falta de conocimiento técnico, sino por sesgos psicológicos.',
          'Sesgos más destructivos:',
          '— Aversión a las pérdidas: el dolor de perder 100 € es aproximadamente el doble del placer de ganar 100 €. Provoca aguantar pérdidas demasiado tiempo y cerrar ganancias demasiado pronto.',
          '— Sobreconfianza: creer que somos mejores analistas que el mercado.',
          '— Efecto manada: comprar en máximos y vender en mínimos siguiendo a la multitud.',
          '— Anclaje: tomar el precio de compra como referencia. El mercado no sabe ni le importa dónde compraste.',
          '— FOMO (Fear Of Missing Out): entrar tarde en una tendencia por miedo a perderse el movimiento.',
          'Hábitos que funcionan: plan de operaciones escrito antes de entrar, diario de trades para aprender de errores, reglas de entrada y salida no negociables, y aceptar que las pérdidas son parte del proceso.',
        ],
        bodyEn: [
          'Most retail investors achieve below-market returns, not due to lack of technical knowledge, but due to psychological biases.',
          'Most destructive biases:',
          '— Loss aversion: the pain of losing €100 is roughly twice the pleasure of gaining €100. Causes holding losses too long and closing gains too soon.',
          '— Overconfidence: believing we are better analysts than the market.',
          '— Herd effect: buying at highs and selling at lows following the crowd.',
          '— Anchoring: using the purchase price as a reference. The market does not know or care where you bought.',
          '— FOMO (Fear Of Missing Out): entering a trend late for fear of missing the move.',
          'Habits that work: written trade plan before entering, trade journal to learn from mistakes, non-negotiable entry and exit rules, and accepting that losses are part of the process.',
        ],
      },
      {
        id: 'leverage', level: 'advanced',
        titleEs: 'Apalancamiento y derivados',
        titleEn: 'Leverage and derivatives',
        bodyEs: [
          'El apalancamiento permite controlar una posición mayor que tu capital disponible. Con apalancamiento 1:10 y 1.000 €, controlas 10.000 € en el mercado.',
          'Principales derivados:',
          '— CFD (Contract for Difference): contrato con tu bróker que replica el movimiento de un activo. Acceso a cortos y apalancamiento. No posees el subyacente.',
          '— Opciones: derecho (no obligación) de comprar (call) o vender (put) a un precio determinado antes de una fecha.',
          '— Futuros: obligación de compra/venta en una fecha y precio futuros. Usados por instituciones para cobertura.',
          'Riesgos críticos del apalancamiento:',
          '— Una caída del 10% con apalancamiento 1:10 equivale a una pérdida del 100% del capital.',
          '— Margin call: el bróker cierra tus posiciones automáticamente si la cuenta cae por debajo del margen mínimo.',
          '— El coste de financiación nocturno (overnight swap) erosiona posiciones mantenidas varios días.',
          'Recomendación: practica en cuenta demo antes de usar apalancamiento con capital real.',
        ],
        bodyEn: [
          'Leverage allows you to control a position larger than your available capital. With 1:10 leverage and €1,000, you control €10,000 in the market.',
          'Main derivatives:',
          '— CFD (Contract for Difference): contract with your broker replicating an asset\'s movement. Access to shorts and leverage. You do not own the underlying.',
          '— Options: right (not obligation) to buy (call) or sell (put) at a set price before a date.',
          '— Futures: obligation to buy/sell at a future date and price. Used by institutions for hedging.',
          'Critical leverage risks:',
          '— A 10% drop with 1:10 leverage equals a 100% loss of capital.',
          '— Margin call: the broker automatically closes your positions if the account falls below the minimum margin.',
          '— Overnight financing cost (overnight swap) erodes positions held for several days.',
          'Recommendation: practice on a demo account before using leverage with real capital.',
        ],
      },
    ],
  },
  {
    id: 'portfolio',
    labelEs: 'Cartera y Largo Plazo', labelEn: 'Portfolio & Long Term',
    descEs: 'Estrategias para construir y mantener un portfolio sólido.',
    descEn: 'Strategies to build and maintain a solid portfolio.',
    topics: [
      {
        id: 'allocation', level: 'intermediate',
        titleEs: 'Construcción y asignación de cartera',
        titleEn: 'Portfolio construction and asset allocation',
        bodyEs: [
          'Una cartera bien construida es un sistema donde los activos se compensan mutuamente, no una lista de activos individuales.',
          'Principios de la Teoría Moderna de Carteras (MPT):',
          '— Diversificación real: 20 acciones del mismo sector no diversifican. Los activos deben tener baja correlación.',
          '— Frontera eficiente: combinación que ofrece máxima rentabilidad para cada nivel de riesgo dado.',
          'Modelos de asignación clásicos:',
          '— 60/40: 60% renta variable + 40% bonos. Conservador/moderado.',
          '— All Weather (Dalio): 30% acciones, 40% bonos LP, 15% bonos CP, 7.5% oro, 7.5% materias primas.',
          '— Tres fondos: fondo índice global + bonos globales + fondo del mercado local.',
          'Rebalanceo: restaurar las proporciones originales vendiendo lo que subió y comprando lo que bajó. Típicamente anual o cuando una clase se desvía >5%.',
          'El coste importa: un fondo indexado de bajo coste (TER 0.07-0.20%) supera a la mayoría de fondos activos a largo plazo.',
        ],
        bodyEn: [
          'A well-constructed portfolio is a system where assets offset each other, not merely a list of individual assets.',
          'Modern Portfolio Theory (MPT) principles:',
          '— True diversification: 20 stocks in the same sector do not diversify. Assets must have low correlation.',
          '— Efficient frontier: combination offering maximum return for each given level of risk.',
          'Classic allocation models:',
          '— 60/40: 60% equities + 40% bonds. Conservative/moderate.',
          '— All Weather (Dalio): 30% stocks, 40% LT bonds, 15% ST bonds, 7.5% gold, 7.5% commodities.',
          '— Three-fund portfolio: global index fund + global bonds + local market fund.',
          'Rebalancing: restore original proportions by selling what rose and buying what fell. Typically annual or when an asset class deviates >5%.',
          'Cost matters: a low-cost index fund (TER 0.07-0.20%) outperforms most active funds over the long term.',
        ],
      },
    ],
  },
];

// ─── TOPIC ACCORDION ───────────────────────────────────────────────────────
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
        }}>
          {ll}
        </span>
        <span style={{ flex: 1, fontSize: '0.87rem', fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>{title}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem', borderTop: '1px solid var(--border)' }}>
          {body.map((line, i) => (
            line.startsWith('—') ? (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', marginTop: i === 0 ? '0.8rem' : 0 }}>
                <span style={{ color: lc, flexShrink: 0, fontWeight: 500, marginTop: '0.05rem' }}>—</span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text2)', lineHeight: 1.65 }}>{line.slice(1).trim()}</span>
              </div>
            ) : line.startsWith('  ') ? (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--cyan)', background: 'var(--card2)', padding: '0.5rem 0.8rem', borderRadius: 6, marginTop: '0.4rem', marginBottom: '0.4rem', border: '1px solid var(--border)' }}>{line.trim()}</div>
            ) : (
              <p key={i} style={{ fontSize: '0.85rem', color: i === 0 ? 'var(--text2)' : 'var(--text2)', lineHeight: 1.7, marginTop: i === 0 ? '0.8rem' : '0.6rem', margin: i > 0 ? '0.4rem 0 0' : '0.8rem 0 0.2rem' }}>{line}</p>
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
  const [activeCategory, setActiveCategory] = useState('fundamentals');
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
          {t('Formación Financiera', 'Financial Education')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.87rem', maxWidth: 520, lineHeight: 1.65 }}>
          {t(
            'Desde los fundamentos hasta estrategias avanzadas. Material estructurado para cualquier nivel de experiencia.',
            'From fundamentals to advanced strategies. Structured material for any level of experience.',
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
        <strong style={{ color: 'var(--text2)' }}>{t('Aviso legal:', 'Disclaimer:')} </strong>
        {t(
          'Este contenido es exclusivamente educativo e informativo. No constituye asesoramiento financiero personalizado ni recomendación de inversión. Invertir implica riesgo de pérdida de capital.',
          'This content is for educational and informational purposes only. It does not constitute personalised financial advice or investment recommendation. Investing involves risk of capital loss.',
        )}
      </div>
    </div>
  );
}
