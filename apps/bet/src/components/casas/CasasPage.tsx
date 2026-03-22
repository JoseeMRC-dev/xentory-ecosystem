/**
 * CasasPage — Casas de apuestas recomendadas
 * Muestra las principales casas con sus bonos y enlaces de registro/login.
 * Los enlaces de afiliado están marcados como TODO para que el operador los reemplace.
 */
import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';

interface Casa {
  id: string;
  name: string;
  emoji: string;
  color: string;
  country: string;
  bonus: string;
  bonusDetail: string;
  rating: number;
  highlights: string[];
  // TODO: Reemplaza estas URLs con tus links de afiliado
  registerUrl: string;
  loginUrl: string;
  licencia: string;
}

const CASAS: Casa[] = [
  {
    id: 'bet365',
    name: 'Bet365',
    emoji: '🟢',
    color: '#00a651',
    country: 'ES',
    bonus: 'Hasta €100',
    bonusDetail: 'Bono de bienvenida en apuestas deportivas',
    rating: 4.8,
    highlights: ['Streaming en vivo', 'Cash Out', 'Miles de mercados', 'App móvil'],
    // TODO: Reemplaza con tu link de afiliado de Bet365
    registerUrl: 'https://www.bet365.es/#/AC/B1/C1/D1002/E3/N/',
    loginUrl: 'https://www.bet365.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'betfair',
    name: 'Betfair',
    emoji: '🔵',
    color: '#f5a623',
    country: 'ES',
    bonus: 'Hasta €100',
    bonusDetail: 'Oferta de bienvenida en apuestas deportivas',
    rating: 4.7,
    highlights: ['Bolsa de apuestas', 'Mejores cuotas', 'Exchange', 'Sin límites'],
    // TODO: Reemplaza con tu link de afiliado de Betfair
    registerUrl: 'https://register.betfair.es/',
    loginUrl: 'https://www.betfair.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'codere',
    name: 'Codere',
    emoji: '🔴',
    color: '#e30613',
    country: 'ES',
    bonus: '€10 gratis',
    bonusDetail: 'Sin necesidad de depósito inicial',
    rating: 4.5,
    highlights: ['100% español', 'Apuestas en tienda', 'App iOS/Android', 'Casino incluido'],
    // TODO: Reemplaza con tu link de afiliado de Codere
    registerUrl: 'https://www.codere.es/registro',
    loginUrl: 'https://www.codere.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'williamhill',
    name: 'William Hill',
    emoji: '⚫',
    color: '#8b8b8b',
    country: 'ES',
    bonus: 'Hasta €50',
    bonusDetail: 'Bono de bienvenida en apuestas deportivas',
    rating: 4.4,
    highlights: ['Fundada en 1934', 'Cuotas competitivas', 'Fútbol y tenis', 'Live betting'],
    // TODO: Reemplaza con tu link de afiliado de William Hill
    registerUrl: 'https://sports.williamhill.es/registration',
    loginUrl: 'https://sports.williamhill.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'bwin',
    name: 'Bwin',
    emoji: '🟤',
    color: '#ff6600',
    country: 'ES',
    bonus: 'Hasta €50',
    bonusDetail: '100% del primer depósito en apuestas',
    rating: 4.3,
    highlights: ['Partner UEFA', 'Apuestas en directo', 'Estadísticas', 'Casino premium'],
    // TODO: Reemplaza con tu link de afiliado de Bwin
    registerUrl: 'https://sports.bwin.es/es/sports/registration',
    loginUrl: 'https://sports.bwin.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'betway',
    name: 'Betway',
    emoji: '🟣',
    color: '#652d90',
    country: 'ES',
    bonus: 'Hasta €30',
    bonusDetail: 'Bono de bienvenida en deportes',
    rating: 4.3,
    highlights: ['eSports', 'Cuotas mejoradas', 'Cash Out parcial', 'Bet Builder'],
    // TODO: Reemplaza con tu link de afiliado de Betway
    registerUrl: 'https://www.betway.es/registration',
    loginUrl: 'https://www.betway.es/',
    licencia: 'DGOJ',
  },
  {
    id: '888sport',
    name: '888sport',
    emoji: '🟡',
    color: '#f6a800',
    country: 'ES',
    bonus: 'Hasta €30',
    bonusDetail: 'Bono libre de riesgo en primera apuesta',
    rating: 4.2,
    highlights: ['Cuotas mejoradas', 'Super Odds', 'In-play markets', 'App premiada'],
    // TODO: Reemplaza con tu link de afiliado de 888sport
    registerUrl: 'https://www.888sport.es/join',
    loginUrl: 'https://www.888sport.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'unibet',
    name: 'Unibet',
    emoji: '🟢',
    color: '#147b45',
    country: 'ES',
    bonus: 'Hasta €40',
    bonusDetail: 'Bono de bienvenida en apuestas deportivas',
    rating: 4.2,
    highlights: ['Streaming gratis', 'Cash Out', 'Apuestas combinadas', 'Estadísticas'],
    // TODO: Reemplaza con tu link de afiliado de Unibet
    registerUrl: 'https://www.unibet.es/join',
    loginUrl: 'https://www.unibet.es/',
    licencia: 'DGOJ',
  },
];

function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ fontSize: '0.75rem', letterSpacing: 1 }}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
    </span>
  );
}

export function CasasPage() {
  const { t } = useLang();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto', animation: 'fadeUp 0.3s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          {t('Casas de Apuestas', 'Betting Houses')}
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 600 }}>
          {t(
            'Casas reguladas por la DGOJ (Dirección General de Ordenación del Juego) en España. Si no tienes cuenta, regístrate para obtener tu bono de bienvenida.',
            'DGOJ-regulated betting houses in Spain. Register to get your welcome bonus.',
          )}
        </p>

        {/* Legal disclaimer */}
        <div style={{
          marginTop: '1rem', padding: '0.8rem 1rem',
          background: 'rgba(255,68,85,0.06)', border: '1px solid rgba(255,68,85,0.2)',
          borderRadius: 10, fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.65,
          display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <span>
            {t(
              'El juego puede crear adicción. Juega con responsabilidad. Solo mayores de 18 años. Información y ayuda: ',
              'Gambling can be addictive. Play responsibly. 18+ only. Help: ',
            )}
            <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              jugarbien.es
            </a>
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.8rem', marginBottom: '2rem',
      }}>
        {[
          { label: t('Casas verificadas', 'Verified houses'), value: `${CASAS.length}`, icon: '✅' },
          { label: t('Licencia DGOJ', 'DGOJ License'), value: '100%', icon: '🏛️' },
          { label: t('Depósito mínimo', 'Min deposit'), value: '€5–10', icon: '💳' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '0.9rem', borderRadius: 12,
            background: 'var(--card)', border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Casa cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {CASAS.map((casa, idx) => {
          const isExpanded = expandedId === casa.id;
          return (
            <div key={casa.id} style={{
              borderRadius: 14,
              background: 'var(--card)',
              border: `1px solid ${isExpanded ? casa.color + '55' : 'var(--border)'}`,
              overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              {/* Main row */}
              <div style={{
                padding: '1rem 1.2rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                cursor: 'pointer',
              }} onClick={() => setExpandedId(isExpanded ? null : casa.id)}>

                {/* Rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: idx < 3 ? 'linear-gradient(135deg,var(--gold),#b8860b)' : 'var(--card2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700,
                  color: idx < 3 ? '#050810' : 'var(--muted)',
                }}>
                  #{idx + 1}
                </div>

                {/* Logo emoji + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '0 0 140px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{casa.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{casa.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                      {casa.licencia} · {casa.country}
                    </div>
                  </div>
                </div>

                {/* Bonus */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: casa.color, fontSize: '0.88rem' }}>{casa.bonus}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {casa.bonusDetail}
                  </div>
                </div>

                {/* Rating */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ color: '#f6a800', lineHeight: 1 }}><StarRating rating={casa.rating} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{casa.rating}/5</div>
                </div>

                {/* CTA buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <a
                    href={casa.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="btn btn-gold"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', textDecoration: 'none' }}
                  >
                    {t('Registrarse', 'Register')}
                  </a>
                  <a
                    href={casa.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', textDecoration: 'none' }}
                  >
                    {t('Login', 'Login')}
                  </a>
                </div>

                {/* Expand chevron */}
                <span style={{
                  color: 'var(--muted)', fontSize: '0.7rem', transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0,
                }}>▼</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{
                  padding: '0 1.2rem 1.2rem',
                  borderTop: `1px solid ${casa.color}33`,
                  animation: 'fadeUp 0.2s ease',
                }}>
                  {/* Highlights */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.9rem 0 1rem' }}>
                    {casa.highlights.map(h => (
                      <span key={h} style={{
                        padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.72rem',
                        background: casa.color + '18', border: `1px solid ${casa.color}40`,
                        color: 'var(--text2)',
                      }}>
                        ✓ {h}
                      </span>
                    ))}
                  </div>

                  {/* Affiliate note */}
                  <div style={{
                    padding: '0.6rem 0.8rem', borderRadius: 8,
                    background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
                    fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6,
                  }}>
                    💡 {t(
                      'Xentory puede recibir una comisión si te registras a través de nuestros enlaces. Esto no afecta a los análisis ni a las cuotas mostradas. Solo recomendamos casas con licencia DGOJ.',
                      'Xentory may receive a commission if you register via our links. This does not affect our analysis or displayed odds. We only recommend DGOJ-licensed houses.',
                    )}
                  </div>

                  {/* Big CTA */}
                  <a
                    href={casa.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-gold btn-lg"
                    style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', textDecoration: 'none', background: `linear-gradient(135deg, ${casa.color}, ${casa.color}cc)` }}
                  >
                    Crear cuenta en {casa.name} y obtener {casa.bonus} →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom disclaimer */}
      <div style={{
        marginTop: '2rem', padding: '1rem', borderRadius: 12,
        background: 'var(--card2)', border: '1px solid var(--border)',
        fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.75,
      }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '0.3rem' }}>
          📋 {t('Aviso legal', 'Legal Notice')}
        </strong>
        {t(
          'Los enlaces a casas de apuestas en esta página pueden ser enlaces de afiliado. Xentory actúa como afiliado y puede recibir compensación económica por los registros realizados a través de dichos enlaces. Esto no influye en los análisis deportivos ni en las cuotas mostradas por la plataforma. Todas las casas listadas disponen de licencia de la Dirección General de Ordenación del Juego (DGOJ) y operan legalmente en España. Recuerda: el juego debe ser una actividad de ocio. Establece límites y juega con responsabilidad.',
          'Links to betting houses on this page may be affiliate links. Xentory acts as an affiliate and may receive financial compensation for registrations made through such links. This does not influence sports analysis or platform odds. All listed houses hold a DGOJ license and operate legally in Spain. Remember: gambling should be a leisure activity. Set limits and gamble responsibly.',
        )}
      </div>
    </div>
  );
}
