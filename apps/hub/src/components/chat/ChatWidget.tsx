import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

// ── Static response catalogue ─────────────────────────────────────────
interface Copy { short: string; detail?: string }
interface StaticEntry { test: RegExp; es: Copy; en: Copy }

const STATIC: StaticEntry[] = [
  {
    test: /^(hola|hey|buenas|hello|hi|good\s*(morning|afternoon|evening))[\s!?.,]*$/i,
    es: { short: '¡Hola! 👋 Soy el asistente de Xentory. ¿En qué puedo ayudarte?' },
    en: { short: 'Hello! 👋 I\'m the Xentory assistant. How can I help you?' },
  },
  {
    test: /qué es xentory|que es xentory|what is xentory/i,
    es: {
      short: 'Xentory es una plataforma de señales de IA para trading de cripto/acciones y apuestas deportivas, con historial público verificable.',
      detail: 'Combina análisis técnico automatizado con modelos de lenguaje para generar señales con nivel de confianza y razonamiento detallado. Disponible en dos módulos: Xentory Market y Xentory Bet.',
    },
    en: {
      short: 'Xentory is an AI signal platform for crypto/stock trading and sports betting, with a publicly verifiable track record.',
      detail: 'It combines automated technical analysis with language models to generate signals with confidence scores and detailed reasoning. Available in two modules: Xentory Market and Xentory Bet.',
    },
  },
  {
    test: /cómo funciona|como funciona|how does it work|how it works/i,
    es: {
      short: 'La IA analiza datos en tiempo real y genera señales con nivel de confianza. Cada señal incluye el razonamiento detrás.',
      detail: 'Para mercados: analiza RSI, soportes, volumen y noticias. Para apuestas: estadísticas del partido, forma reciente, momios y head-to-head. Puedes ver la metodología completa en la sección Metodología.',
    },
    en: {
      short: 'The AI analyzes real-time data and generates signals with a confidence level. Each signal includes the reasoning behind it.',
      detail: 'For markets: analyzes RSI, support levels, volume, and news. For betting: match stats, recent form, odds, and head-to-head. See the full methodology in the Methodology section.',
    },
  },
  {
    test: /precio|plan|cuánto|cuanto|cost|price|suscripci|subscri/i,
    es: {
      short: 'Los planes empiezan desde **€19/mes** (Market Pro o Bet Pro). El Bundle Elite incluye ambas plataformas por **€49/mes**.',
      detail: 'También hay un plan gratuito con acceso básico. Todos los planes de pago incluyen 7 días de prueba sin tarjeta. Consulta la comparativa completa en la sección Precios.',
    },
    en: {
      short: 'Plans start from **€19/mo** (Market Pro or Bet Pro). The Bundle Elite includes both platforms for **€49/mo**.',
      detail: 'There is also a free plan with basic access. All paid plans include a 7-day trial with no card required. See the full comparison in the Pricing section.',
    },
  },
  {
    test: /prueba|trial|gratis|free\s*trial|7\s*d[íi]as|sin\s*tarjeta|no\s*credit/i,
    es: {
      short: '¡Sí! Todos los planes de pago incluyen **7 días de prueba gratuita** sin tarjeta. Cancela cuando quieras.',
    },
    en: {
      short: 'Yes! All paid plans include a **7-day free trial** with no credit card required. Cancel anytime.',
    },
  },
  {
    test: /bundle|ambas\s*plataformas|both\s*platforms/i,
    es: {
      short: 'El **Bundle** combina Market + Bet en una sola suscripción. El Bundle Pro cuesta **€29/mes** y el Elite **€49/mes**.',
      detail: 'Es la opción más económica si usas ambas plataformas: ahorras respecto a contratar Market y Bet por separado.',
    },
    en: {
      short: 'The **Bundle** combines Market + Bet in a single subscription. Bundle Pro is **€29/mo** and Elite **€49/mo**.',
      detail: 'It\'s the most cost-effective option if you use both platforms — cheaper than subscribing to Market and Bet separately.',
    },
  },
  {
    test: /market|cripto|crypto|bitcoin|btc|accion|stock|forex|trading\s*de/i,
    es: {
      short: '**Xentory Market** ofrece señales de IA para cripto (BTC, ETH, SOL…), acciones (NVDA, AAPL…) y forex en tiempo real.',
      detail: 'Incluye análisis RSI, soportes/resistencias, nivel de confianza por señal y alertas de precio en Telegram. El plan Pro da acceso a señales diarias; Elite incluye análisis avanzado y watchlist ilimitada.',
    },
    en: {
      short: '**Xentory Market** offers AI signals for crypto (BTC, ETH, SOL…), stocks (NVDA, AAPL…) and forex in real time.',
      detail: 'Includes RSI analysis, support/resistance levels, per-signal confidence scores and Telegram price alerts. Pro gives daily signals; Elite adds advanced analysis and unlimited watchlist.',
    },
  },
  {
    test: /bet|apuesta|deporte|sport|fútbol|futbol|football|basket|tenis|tennis/i,
    es: {
      short: '**Xentory Bet** analiza partidos con IA y genera señales de resultado, handicap y totales con nivel de confianza.',
      detail: 'Cubre fútbol, baloncesto, tenis y más. El historial de aciertos es público y verificable. Pro incluye señales diarias; Elite da cobertura ampliada y análisis pre-partido detallado.',
    },
    en: {
      short: '**Xentory Bet** analyzes matches with AI and generates result, handicap, and totals signals with confidence scores.',
      detail: 'Covers football, basketball, tennis and more. Win history is public and verifiable. Pro includes daily signals; Elite adds expanded coverage and detailed pre-match analysis.',
    },
  },
  {
    test: /metodolog|acierto|accuracy|historial|track\s*record|porcentaje/i,
    es: {
      short: 'El historial de señales es **público y verificable**. Puedes ver los porcentajes de acierto por plataforma en la sección Metodología.',
      detail: 'La IA registra cada señal emitida y el resultado una vez resuelto el evento. No se editan ni eliminan registros. Los factores de análisis y el razonamiento de cada señal están disponibles para todos los planes.',
    },
    en: {
      short: 'The signal history is **public and verifiable**. You can see accuracy rates by platform in the Methodology section.',
      detail: 'The AI records every signal and the outcome once the event resolves. No records are edited or deleted. Analysis factors and signal reasoning are available across all plans.',
    },
  },
  {
    test: /telegram/i,
    es: {
      short: 'Con planes Pro y Elite recibes señales y alertas de precio directamente en un **canal privado de Telegram**.',
      detail: 'El bot de Telegram también gestiona el acceso al canal según tu plan activo. Puedes vincularlo desde el dashboard en Ajustes → Telegram.',
    },
    en: {
      short: 'Pro and Elite plans include signals and price alerts directly in a **private Telegram channel**.',
      detail: 'The Telegram bot also manages channel access based on your active plan. You can link it from the dashboard under Settings → Telegram.',
    },
  },
  {
    test: /cancela|cancel|dar\s*de\s*baja|baja/i,
    es: { short: 'Puedes cancelar en cualquier momento desde el **dashboard → Suscripción**, sin penalizaciones ni permanencia.' },
    en: { short: 'You can cancel at any time from the **dashboard → Subscription**, with no penalties or lock-in.' },
  },
  {
    test: /dashboard|panel|mi\s*cuenta|my\s*account/i,
    es: {
      short: 'El **dashboard** es tu panel de control: gestiona tu suscripción, alertas, acceso a plataformas y vinculación con Telegram.',
      detail: 'Accede desde el menú superior una vez iniciada sesión. También puedes lanzar directamente Xentory Market o Xentory Bet desde allí con SSO automático.',
    },
    en: {
      short: 'The **dashboard** is your control panel: manage your subscription, alerts, platform access, and Telegram linking.',
      detail: 'Access it from the top menu once logged in. You can also launch Xentory Market or Xentory Bet directly from there with automatic SSO.',
    },
  },
  {
    test: /señal|signal|qué\s*es\s*una\s*señal|what.*signal/i,
    es: {
      short: 'Una señal es una recomendación generada por la IA con activo, dirección, nivel de confianza y razonamiento.',
      detail: 'Ejemplo: "BTC/USD — Compra en soporte | Confianza 78% | RSI sobrevendido + volumen creciente". El resultado se registra públicamente una vez que el evento se resuelve.',
    },
    en: {
      short: 'A signal is an AI-generated recommendation with asset, direction, confidence level, and reasoning.',
      detail: 'Example: "BTC/USD — Buy at support | Confidence 78% | Oversold RSI + rising volume". The outcome is recorded publicly once the event resolves.',
    },
  },
  {
    test: /política|politica|privacidad|privacy|términos|terminos|legal|terms/i,
    es: {
      short: 'Xentory no almacena datos financieros sensibles. Las señales son orientativas y no constituyen asesoramiento financiero.',
      detail: 'Consulta los Términos de uso y la Política de privacidad completos en el pie de página del sitio web. Para cualquier duda legal escríbenos a soporte@xentory.io.',
    },
    en: {
      short: 'Xentory does not store sensitive financial data. Signals are informational and do not constitute financial advice.',
      detail: 'See the full Terms of Use and Privacy Policy in the website footer. For any legal questions write to us at support@xentory.io.',
    },
  },
  {
    test: /contacto|soporte|support|contact|ayuda|help|problema|issue|error|bug/i,
    es: {
      short: 'Para soporte escríbenos a **soporte@xentory.io**. Respondemos en menos de 24 h en días laborables.',
    },
    en: {
      short: 'For support write to **support@xentory.io**. We reply within 24 hours on business days.',
    },
  },
  {
    test: /registr|crear\s*cuenta|sign\s*up|create\s*account|nuevo\s*usuario/i,
    es: { short: 'Crea tu cuenta gratuita haciendo clic en **Registrarse**. Solo necesitas un email. El plan gratuito incluye acceso básico sin tarjeta.' },
    en: { short: 'Create your free account by clicking **Register**. You only need an email. The free plan includes basic access with no card needed.' },
  },
];

function getStatic(text: string, lang: string): Copy | null {
  const m = STATIC.find(s => s.test.test(text));
  if (!m) return null;
  return lang === 'en' ? m.en : m.es;
}

// ── Types ─────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
  short?: string;
  detail?: string;
  expanded: boolean;
  ts: number;
}

// ── Icons ─────────────────────────────────────────────────────────────
function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

// ── Bold-only markdown renderer ───────────────────────────────────────
function MsgText({ text }: { text: string }) {
  return (
    <span>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────
function Bubble({ msg, onToggle }: { msg: Message; onToggle: () => void }) {
  const isUser = msg.role === 'user';
  const displayed = msg.short ?? msg.content;
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '84%',
        padding: '0.6rem 0.9rem',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--accent-primary)' : 'var(--card)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: '0.84rem', lineHeight: 1.6,
        fontFamily: 'system-ui, sans-serif',
        border: isUser ? 'none' : '1px solid var(--border)',
      }}>
        <MsgText text={displayed} />
        {/* Expanded detail */}
        {msg.expanded && msg.detail && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`, fontSize: '0.82rem', opacity: 0.92 }}>
            <MsgText text={msg.detail} />
          </div>
        )}
        {/* Ver más / Ver menos */}
        {msg.detail && (
          <button
            onClick={onToggle}
            style={{
              display: 'block', marginTop: '0.4rem',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '0.73rem', fontWeight: 600,
              color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--accent-primary)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {msg.expanded ? '↑ Ver menos' : '↓ Ver más'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function ChatWidget() {
  const { user } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';

  const isPaid = user
    ? (user.subscriptions.market !== 'free' || user.subscriptions.bets !== 'free')
    : false;

  const [open, setOpen]       = useState(false);
  const [messages, setMsgs]   = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const toggleExpand = useCallback((index: number) => {
    setMsgs(prev => prev.map((m, i) => i === index ? { ...m, expanded: !m.expanded } : m));
  }, []);

  // Greeting on first open
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const greeting = es
      ? user
        ? `¡Hola, ${user.name.split(' ')[0]}! 👋 Soy el asistente de Xentory. ${isPaid ? 'Puedo ayudarte con la plataforma y con análisis de mercados o apuestas.' : 'Puedo responderte sobre la plataforma y tus planes.'} ¿En qué te ayudo?`
        : '¡Hola! 👋 Soy el asistente de Xentory. Puedo ayudarte con información sobre la plataforma, planes y funcionalidades.'
      : user
        ? `Hi, ${user.name.split(' ')[0]}! 👋 I'm the Xentory assistant. ${isPaid ? 'I can help with the platform and market or betting analysis.' : 'I can answer questions about the platform and your plans.'} What can I do for you?`
        : 'Hello! 👋 I\'m the Xentory assistant. I can help you with platform info, plans, and features.';

    setMsgs([{ role: 'assistant', content: greeting, short: greeting, expanded: false, ts: Date.now() }]);
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 120); }, [open]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text, expanded: false, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    let reply: Message;

    const staticHit = getStatic(text, lang);
    if (staticHit) {
      await new Promise(r => setTimeout(r, 300));
      reply = {
        role: 'assistant',
        content: staticHit.short + (staticHit.detail ? ' ' + staticHit.detail : ''),
        short: staticHit.short, detail: staticHit.detail,
        expanded: false, ts: Date.now(),
      };
    } else if (!user || !isPaid) {
      await new Promise(r => setTimeout(r, 300));
      const msg = es
        ? (!user
          ? 'Para análisis de mercados o apuestas, inicia sesión con un plan Pro o Elite. Para dudas generales escríbenos a soporte@xentory.io.'
          : 'Para análisis personalizado necesitas un plan **Pro** o **Elite**. Puedes verlos en la sección Precios.')
        : (!user
          ? 'For market or betting analysis, sign in with a Pro or Elite plan. For general questions write to support@xentory.io.'
          : 'For personalised analysis you need a **Pro** or **Elite** plan. See them in the Pricing section.');
      reply = { role: 'assistant', content: msg, short: msg, expanded: false, ts: Date.now() };
    } else {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { messages: history, lang },
        });
        if (error) throw error;
        const short  = data?.short  ?? (es ? 'Lo siento, no pude procesar eso.' : 'Sorry, could not process that.');
        const detail = data?.detail ?? undefined;
        reply = {
          role: 'assistant', content: short + (detail ? ' ' + detail : ''),
          short, detail, expanded: false, ts: Date.now(),
        };
      } catch {
        const msg = es
          ? 'Hubo un problema al contactar el asistente. Inténtalo de nuevo.'
          : 'There was a problem contacting the assistant. Please try again.';
        reply = { role: 'assistant', content: msg, short: msg, expanded: false, ts: Date.now() };
      }
    }

    setLoading(false);
    setMsgs(prev => [...prev, reply]);
  }, [loading, user, isPaid, messages, lang, es]);

  const send = useCallback(() => sendText(input.trim()), [input, sendText]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Quick chips for non-paid users
  const chips = !isPaid
    ? (es
        ? ['¿Qué es Xentory?', '¿Cuánto cuesta?', '¿Hay prueba gratis?', 'Xentory Market', 'Xentory Bet']
        : ['What is Xentory?', 'How much does it cost?', 'Free trial?', 'Xentory Market', 'Xentory Bet'])
    : [];

  return (
    <>
      <style>{`
        .xentory-chat-panel {
          position: fixed; bottom: 5.5rem; right: 1.5rem; z-index: 950;
          width: min(340px, calc(100vw - 2rem)); height: min(480px, calc(100vh - 8rem));
          background: var(--bg2); border: 1px solid var(--border2); border-radius: 20px;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: fadeUp 0.22s ease; overflow: hidden;
        }
        @media (min-width: 600px)  { .xentory-chat-panel { width: 380px; height: 540px; } }
        @media (min-width: 1024px) { .xentory-chat-panel { width: 420px; height: 580px; bottom: 5.8rem; right: 2rem; } }
        .xentory-chat-btn {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 950;
          width: 52px; height: 52px;
        }
        @media (min-width: 1024px) { .xentory-chat-btn { width: 56px; height: 56px; bottom: 2rem; right: 2rem; } }
      `}</style>

      {/* ── Panel ── */}
      {open && (
        <div className="xentory-chat-panel">
          {/* Header */}
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <IconChat />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'system-ui, sans-serif' }}>
                {es ? 'Asistente Xentory' : 'Xentory Assistant'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--green)', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                {isPaid ? (es ? 'IA activa' : 'AI active') : (es ? 'En línea' : 'Online')}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.3rem', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconClose />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((m, i) =>
              m.role === 'user'
                ? <Bubble key={i} msg={m} onToggle={() => toggleExpand(i)} />
                : <Bubble key={i} msg={m} onToggle={() => toggleExpand(i)} />
            )}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.6rem 0.9rem', borderRadius: '16px 16px 16px 4px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            {/* Quick chips */}
            {chips.length > 0 && messages.length <= 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                {chips.map(c => (
                  <button key={c}
                    onClick={() => sendText(c)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={es ? 'Escribe tu pregunta...' : 'Type your question...'}
              disabled={loading}
              style={{
                flex: 1, padding: '0.55rem 0.9rem', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--card)',
                color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'system-ui, sans-serif',
                outline: 'none',
              }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: input.trim() && !loading ? 'var(--accent-primary)' : 'var(--card2)',
                color: input.trim() && !loading ? '#fff' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={es ? 'Abrir asistente' : 'Open assistant'}
        className="xentory-chat-btn"
        style={{
          borderRadius: '50%',
          background: open ? 'var(--card)' : 'var(--accent-primary)',
          border: open ? '1px solid var(--border2)' : 'none',
          color: open ? 'var(--text2)' : '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 4px 16px rgba(0,0,0,0.15)' : '0 8px 24px rgba(0,0,0,0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {open ? <IconClose /> : <IconChat />}
      </button>
    </>
  );
}
