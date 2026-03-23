/**
 * CasasPage — Casas de apuestas recomendadas
 * Layout mobile-first. Logos via Google Favicon CDN.
 */
import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';

interface Casa {
  id: string;
  name: string;
  logo: string;
  color: string;
  bonus: string;
  bonusDetail: string;
  rating: number;
  highlights: string[];
  registerUrl: string;
  loginUrl: string;
  licencia: string;
}

const CASAS: Casa[] = [
  {
    id: 'bet365', name: 'Bet365',
    logo: 'https://www.google.com/s2/favicons?domain=bet365.es&sz=64',
    color: '#00a651',
    bonus: 'Hasta €100', bonusDetail: 'Bono de bienvenida en deportes',
    rating: 4.8,
    highlights: ['Streaming en vivo', 'Cash Out', 'Miles de mercados', 'App móvil'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.bet365.es/#/AC/B1/C1/D1002/E3/N/',
    loginUrl: 'https://www.bet365.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'betfair', name: 'Betfair',
    logo: 'https://www.google.com/s2/favicons?domain=betfair.com&sz=64',
    color: '#f5a623',
    bonus: 'Hasta €100', bonusDetail: 'Oferta de bienvenida en apuestas',
    rating: 4.7,
    highlights: ['Bolsa de apuestas', 'Mejores cuotas', 'Exchange', 'Sin límites'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://register.betfair.es/',
    loginUrl: 'https://www.betfair.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'codere', name: 'Codere',
    logo: 'https://www.google.com/s2/favicons?domain=codere.com&sz=64',
    color: '#e30613',
    bonus: '€10 gratis', bonusDetail: 'Sin depósito inicial',
    rating: 4.5,
    highlights: ['100% español', 'Apuestas en tienda', 'App iOS/Android', 'Casino'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.codere.es/registro',
    loginUrl: 'https://www.codere.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'williamhill', name: 'William Hill',
    logo: 'https://www.google.com/s2/favicons?domain=williamhill.es&sz=64',
    color: '#8b8b8b',
    bonus: 'Hasta €50', bonusDetail: 'Bono de bienvenida en deportes',
    rating: 4.4,
    highlights: ['Desde 1934', 'Cuotas competitivas', 'Fútbol y tenis', 'Live betting'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://sports.williamhill.es/registration',
    loginUrl: 'https://sports.williamhill.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'bwin', name: 'Bwin',
    logo: 'https://www.google.com/s2/favicons?domain=bwin.es&sz=64',
    color: '#ff6600',
    bonus: 'Hasta €50', bonusDetail: '100% del primer depósito',
    rating: 4.3,
    highlights: ['Partner UEFA', 'Apuestas en directo', 'Estadísticas', 'Casino premium'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://sports.bwin.es/es/sports/registration',
    loginUrl: 'https://sports.bwin.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'betway', name: 'Betway',
    logo: 'https://www.google.com/s2/favicons?domain=betway.es&sz=64',
    color: '#652d90',
    bonus: 'Hasta €30', bonusDetail: 'Bono de bienvenida en deportes',
    rating: 4.3,
    highlights: ['eSports', 'Cash Out parcial', 'Bet Builder', 'Cuotas mejoradas'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.betway.es/registration',
    loginUrl: 'https://www.betway.es/',
    licencia: 'DGOJ',
  },
  {
    id: '888sport', name: '888sport',
    logo: 'https://www.google.com/s2/favicons?domain=888sport.es&sz=64',
    color: '#f6a800',
    bonus: 'Hasta €30', bonusDetail: 'Apuesta libre de riesgo',
    rating: 4.2,
    highlights: ['Super Odds', 'In-play markets', 'App premiada', 'Cuotas mejoradas'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.888sport.es/join',
    loginUrl: 'https://www.888sport.es/',
    licencia: 'DGOJ',
  },
  {
    id: 'unibet', name: 'Unibet',
    logo: 'https://www.google.com/s2/favicons?domain=unibet.com&sz=64',
    color: '#147b45',
    bonus: 'Hasta €40', bonusDetail: 'Bono de bienvenida deportiva',
    rating: 4.2,
    highlights: ['Streaming gratis', 'Cash Out', 'Apuestas combinadas', 'Estadísticas'],
    // TODO: Reemplaza con tu link de afiliado
    registerUrl: 'https://www.unibet.es/join',
    loginUrl: 'https://www.unibet.es/',
    licencia: 'DGOJ',
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f6a800', fontSize: '0.8rem', letterSpacing: 1 }}>
      {'★'.repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? '½' : ''}
    </span>
  );
}

function CasaCard({ casa, idx }: { casa: Casa; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLang();

  return (
    <div style={{
      borderRadius: 14,
      background: 'var(--card)',
      border: `1px solid ${expanded ? casa.color + '55' : 'var(--border)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* ── Card header (siempre visible) ──────────────────────────────── */}
      <div
        style={{ padding: '0.9rem 1rem', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Fila superior: rank + logo + nombre + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
          {/* Rank badge */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: idx < 3
              ? 'linear-gradient(135deg,var(--gold),#b8860b)'
              : 'var(--card2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700,
            color: idx < 3 ? '#050810' : 'var(--muted)',
          }}>
            #{idx + 1}
          </div>

          {/* Logo */}
          <img
            src={casa.logo}
            alt={casa.name}
            width={22}
            height={22}
            style={{ borderRadius: 4, flexShrink: 0, imageRendering: 'auto' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          {/* Nombre + licencia */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>{casa.name}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{casa.licencia} · ES</div>
          </div>

          {/* Rating */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Stars rating={casa.rating} />
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{casa.rating}/5</div>
          </div>

          {/* Chevron */}
          <span style={{
            color: 'var(--muted)', fontSize: '0.65rem',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}>▼</span>
        </div>

        {/* Fila inferior: bonus + botones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Bonus */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: casa.color, fontSize: '0.9rem' }}>{casa.bonus}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: '0.4rem' }}>{casa.bonusDetail}</span>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <a
              href={casa.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="btn btn-gold"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {t('Registrarse', 'Register')}
            </a>
            <a
              href={casa.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Login
            </a>
          </div>
        </div>
      </div>

      {/* ── Expanded detail ─────────────────────────────────────────────── */}
      {expanded && (
        <div style={{
          padding: '0 1rem 1rem',
          borderTop: `1px solid ${casa.color}33`,
          animation: 'fadeUp 0.15s ease',
        }}>
          {/* Highlights */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.8rem 0' }}>
            {casa.highlights.map(h => (
              <span key={h} style={{
                padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.7rem',
                background: casa.color + '18', border: `1px solid ${casa.color}40`,
                color: 'var(--text2)',
              }}>
                ✓ {h}
              </span>
            ))}
          </div>

          {/* Affiliate note */}
          <div style={{
            padding: '0.55rem 0.75rem', borderRadius: 8, marginBottom: '0.8rem',
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
            fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.6,
          }}>
            💡 {t(
              'Xentory puede recibir una comisión por registros a través de estos enlaces. Solo recomendamos casas con licencia DGOJ.',
              'Xentory may receive a commission for registrations via these links. We only recommend DGOJ-licensed houses.',
            )}
          </div>

          {/* Big CTA */}
          <a
            href={casa.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold btn-lg"
            style={{
              display: 'flex', justifyContent: 'center',
              textDecoration: 'none',
              background: `linear-gradient(135deg, ${casa.color}, ${casa.color}cc)`,
            }}
          >
            Crear cuenta en {casa.name} — {casa.bonus} →
          </a>
        </div>
      )}
    </div>
  );
}

export function CasasPage() {
  const { t } = useLang();

  return (
    <div style={{ padding: '1.2rem', maxWidth: 720, margin: '0 auto', animation: 'fadeUp 0.3s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem',
          marginBottom: '0.4rem', letterSpacing: '-0.02em',
        }}>
          {t('Casas de Apuestas', 'Betting Houses')}
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>
          {t(
            'Casas reguladas por la DGOJ en España. Regístrate para obtener tu bono de bienvenida.',
            'DGOJ-regulated houses in Spain. Register to get your welcome bonus.',
          )}
        </p>

        {/* Legal disclaimer */}
        <div style={{
          padding: '0.75rem 0.9rem',
          background: 'rgba(255,68,85,0.06)', border: '1px solid rgba(255,68,85,0.2)',
          borderRadius: 10, fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.65,
          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>
            {t(
              'El juego puede crear adicción. Juega con responsabilidad. Solo mayores de 18 años. Ayuda: ',
              'Gambling can be addictive. 18+ only. Help: ',
            )}
            <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              jugarbien.es
            </a>
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem', marginBottom: '1.4rem' }}>
        {[
          { label: t('Casas verificadas', 'Verified'), value: `${CASAS.length}`, icon: '✅' },
          { label: 'Licencia DGOJ', value: '100%', icon: '🏛️' },
          { label: t('Depósito mín.', 'Min deposit'), value: '€5–10', icon: '💳' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '0.75rem 0.5rem', borderRadius: 12, textAlign: 'center',
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Casa cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {CASAS.map((casa, idx) => (
          <CasaCard key={casa.id} casa={casa} idx={idx} />
        ))}
      </div>

      {/* Legal footer */}
      <div style={{
        marginTop: '1.8rem', padding: '0.9rem', borderRadius: 12,
        background: 'var(--card2)', border: '1px solid var(--border)',
        fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.75,
      }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '0.3rem' }}>
          📋 {t('Aviso legal', 'Legal Notice')}
        </strong>
        {t(
          'Los enlaces en esta página pueden ser de afiliado. Xentory puede recibir compensación económica por los registros. Esto no influye en los análisis. Todas las casas tienen licencia DGOJ y operan legalmente en España.',
          'Links on this page may be affiliate links. Xentory may receive compensation for registrations. This does not influence analysis. All houses hold DGOJ licenses.',
        )}
      </div>
    </div>
  );
}
