import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

// ── Static responses for non-logged users ────────────────────────────
interface StaticEntry { test: RegExp; es: string; en: string }
const STATIC: StaticEntry[] = [
  {
    test: /^(hola|hey|buenas|hello|hi|good\s*(morning|afternoon|evening))[\s!?.,]*$/i,
    es: '¡Hola! 👋 Soy el asistente de Xentory. Puedo ayudarte con información sobre la plataforma, planes y funcionalidades. ¿Qué necesitas saber?',
    en: 'Hello! 👋 I\'m the Xentory assistant. I can help you with platform info, plans, and features. What would you like to know?',
  },
  {
    test: /qué es xentory|que es xentory|what is xentory|xentory es/i,
    es: 'Xentory es una plataforma de señales generadas por IA para trading de criptomonedas/acciones y apuestas deportivas. Combina análisis técnico automatizado con modelos de lenguaje para ofrecerte señales con razonamiento y nivel de confianza verificables.',
    en: 'Xentory is an AI-powered signal platform for crypto/stock trading and sports betting. It combines automated technical analysis with language models to deliver signals with verifiable reasoning and confidence scores.',
  },
  {
    test: /cómo funciona|como funciona|how does it work|how it works/i,
    es: 'La IA analiza datos de mercado y estadísticas deportivas en tiempo real y genera señales con un nivel de confianza. Cada señal incluye el razonamiento detrás. Puedes ver la metodología completa en la sección Metodología.',
    en: 'The AI analyzes market data and sports stats in real time and generates signals with a confidence level. Each signal includes the reasoning behind it. You can see the full methodology in the Methodology section.',
  },
  {
    test: /precio|plan|cuánto|cuanto|cost|price|suscripci|subscri/i,
    es: 'Los planes empiezan desde **€19/mes** (Market Pro o Bet Pro). El Bundle Elite cuesta **€49/mes** e incluye ambas plataformas. También hay un plan gratuito con acceso limitado. Puedes ver la comparativa completa en la sección Precios.',
    en: 'Plans start from **€19/mo** (Market Pro or Bet Pro). The Bundle Elite is **€49/mo** and includes both platforms. There\'s also a free plan with limited access. See the full comparison in the Pricing section.',
  },
  {
    test: /prueba|trial|gratis|free\s*trial|7\s*d[íi]as/i,
    es: '¡Sí! Todos los planes de pago incluyen **7 días de prueba gratuita** sin necesidad de introducir tarjeta de crédito. Puedes cancelar en cualquier momento.',
    en: 'Yes! All paid plans include a **7-day free trial** with no credit card required. You can cancel at any time.',
  },
  {
    test: /market|cripto|crypto|bitcoin|btc|accion|stock|forex/i,
    es: '**Xentory Market** ofrece señales de IA para criptomonedas (BTC, ETH, SOL…), acciones (NVDA, AAPL…) y forex. Incluye análisis RSI, niveles de soporte/resistencia y alertas de precio en Telegram.',
    en: '**Xentory Market** offers AI signals for crypto (BTC, ETH, SOL…), stocks (NVDA, AAPL…) and forex. Includes RSI analysis, support/resistance levels, and Telegram price alerts.',
  },
  {
    test: /bet|apuesta|deporte|sport|fútbol|futbol|football|basket/i,
    es: '**Xentory Bet** analiza partidos de fútbol, baloncesto y otros deportes con IA. Ofrece señales de resultado, handicap y totales con nivel de confianza. Historial de aciertos público y verificable.',
    en: '**Xentory Bet** analyzes football, basketball, and other sports with AI. It offers result, handicap, and totals signals with confidence levels. Public and verifiable win history.',
  },
  {
    test: /metodolog|acierto|accuracy|historial|track\s*record/i,
    es: 'El historial de señales es público y verificable. Puedes consultar la metodología completa, los porcentajes de acierto por plataforma y los factores que usa la IA en la sección **Metodología**.',
    en: 'The signal history is public and verifiable. You can check the full methodology, accuracy rates by platform, and the factors used by the AI in the **Methodology** section.',
  },
  {
    test: /contacto|soporte|support|contact|ayuda|help|problema|issue|error/i,
    es: 'Para soporte puedes escribirnos a **soporte@xentory.io** o usar el formulario de contacto. Intentamos responder en menos de 24 h.',
    en: 'For support you can write to **support@xentory.io** or use the contact form. We aim to respond within 24 hours.',
  },
  {
    test: /registr|crear\s*cuenta|sign\s*up|create\s*account/i,
    es: 'Puedes crear tu cuenta gratuita en segundos haciendo clic en **Registrarse**. Solo necesitas un email. El plan gratuito incluye acceso básico a señales.',
    en: 'You can create your free account in seconds by clicking **Register**. You only need an email. The free plan includes basic signal access.',
  },
  {
    test: /telegram/i,
    es: 'Xentory tiene integración con Telegram. Con los planes Pro y Elite recibes alertas de precio y señales directamente en tu canal privado de Telegram.',
    en: 'Xentory has Telegram integration. With Pro and Elite plans you receive price alerts and signals directly in your private Telegram channel.',
  },
  {
    test: /cancela|cancel/i,
    es: 'Puedes cancelar tu suscripción en cualquier momento desde el dashboard, sin penalizaciones ni permanencias.',
    en: 'You can cancel your subscription at any time from the dashboard, with no penalties or lock-ins.',
  },
];

function getStaticResponse(text: string, lang: string): string | null {
  const match = STATIC.find(s => s.test.test(text));
  if (!match) return null;
  return lang === 'en' ? match.en : match.es;
}

// ── Types ─────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string; ts: number }

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

// ── Markdown-lite renderer (bold only) ────────────────────────────────
function MsgText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function ChatWidget() {
  const { user } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';

  const [open, setOpen]       = useState(false);
  const [messages, setMsgs]   = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Greeting on first open
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const greeting: Message = {
      role: 'assistant',
      ts: Date.now(),
      content: user
        ? es
          ? `¡Hola, ${user.name.split(' ')[0]}! 👋 Soy el asistente de Xentory. Puedo ayudarte con la plataforma${user.subscriptions.market !== 'free' || user.subscriptions.bets !== 'free' ? ', análisis de mercados y apuestas' : ''}. ¿En qué te ayudo?`
          : `Hi, ${user.name.split(' ')[0]}! 👋 I'm the Xentory assistant. I can help you with the platform${user.subscriptions.market !== 'free' || user.subscriptions.bets !== 'free' ? ', market analysis, and betting' : ''}. What can I do for you?`
        : es
          ? '¡Hola! 👋 Soy el asistente de Xentory. Puedo responderte sobre la plataforma, planes y funcionalidades. Para preguntas de análisis de mercados o apuestas, inicia sesión con tu cuenta.'
          : 'Hello! 👋 I\'m the Xentory assistant. I can answer questions about the platform, plans, and features. For market analysis or betting questions, please sign in.',
    };
    setMsgs([greeting]);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    let reply: string;

    if (!user) {
      // Non-logged: static only
      await new Promise(r => setTimeout(r, 380));
      reply = getStaticResponse(text, lang)
        ?? (es
          ? 'Para preguntas más específicas sobre análisis de mercados o apuestas, inicia sesión en tu cuenta. Para dudas generales puedes contactarnos en soporte@xentory.io.'
          : 'For more specific questions about market analysis or betting, please sign in. For general questions, contact us at support@xentory.io.');
    } else {
      // Logged-in: call Claude via Edge Function
      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: {
            messages: history,
            plan:     user.subscriptions,
            userName: user.name,
            lang,
          },
        });
        if (error) throw error;
        reply = data?.text ?? (es ? 'Lo siento, no pude procesar tu pregunta.' : 'Sorry, could not process your question.');
      } catch {
        reply = es
          ? 'Hubo un problema al contactar el asistente. Inténtalo de nuevo en un momento.'
          : 'There was a problem contacting the assistant. Please try again in a moment.';
      }
    }

    setLoading(false);
    setMsgs(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
  }, [input, loading, user, messages, lang, es]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Quick-question chips for non-logged users
  const CHIPS_ES = ['¿Qué es Xentory?', '¿Cuánto cuesta?', '¿Hay prueba gratis?', 'Xentory Market', 'Xentory Bet'];
  const CHIPS_EN = ['What is Xentory?', 'How much does it cost?', 'Is there a free trial?', 'Xentory Market', 'Xentory Bet'];
  const chips = !user ? (es ? CHIPS_ES : CHIPS_EN) : [];

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 950,
          width: 'min(360px, calc(100vw - 2rem))',
          height: 'min(520px, calc(100vh - 8rem))',
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'fadeUp 0.22s ease',
          overflow: 'hidden',
        }}>
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
                {es ? 'En línea' : 'Online'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.3rem', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconClose />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '0.6rem 0.9rem', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--card)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: '0.84rem', lineHeight: 1.55, fontFamily: 'system-ui, sans-serif',
                  border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                }}>
                  <MsgText text={m.content} />
                </div>
              </div>
            ))}
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {chips.map(c => (
                  <button key={c} onClick={() => { setInput(c); setTimeout(() => inputRef.current?.focus(), 50); }}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: 20, fontSize: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', transition: 'all 0.15s' }}>
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
                outline: 'none', transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
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
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 950,
          width: 52, height: 52, borderRadius: '50%',
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
