/**
 * AgeGate — Verificación de edad +18
 * Se muestra a usuarios cuya sesión SSO no incluye confirmación de edad.
 * Tras confirmar, guarda en localStorage para no volver a mostrar.
 */
import { useState } from 'react';

const GATE_KEY = 'xentory_age_confirmed';
const HUB_URL  = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';

export function hasAgeConfirmed(): boolean {
  try { return localStorage.getItem(GATE_KEY) === '1'; } catch { return false; }
}

export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [dob, setDob]           = useState('');
  const [agreed, setAgreed]     = useState(false);
  const [error, setError]       = useState('');

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleConfirm = () => {
    setError('');
    if (!dob) { setError('Introduce tu fecha de nacimiento.'); return; }

    const birth = new Date(dob);
    const today = new Date();
    const age   = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

    if (age < 18) {
      setError('Lo sentimos, debes tener 18 años o más para acceder a XentoryBet.');
      return;
    }
    if (!agreed) { setError('Debes aceptar la declaración de mayoría de edad.'); return; }

    try { localStorage.setItem(GATE_KEY, '1'); } catch { /**/ }
    onConfirm();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5,8,16,0.97)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(145deg, var(--card), var(--card2))',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: '2.5rem', textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔞</div>

        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.5rem',
          marginBottom: '0.5rem', letterSpacing: '-0.02em',
        }}>
          Verificación de edad
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1.8rem' }}>
          XentoryBet ofrece contenido relacionado con apuestas deportivas.
          El acceso está <strong style={{ color: 'var(--text)' }}>restringido a mayores de 18 años</strong>{' '}
          según la legislación española vigente.
        </p>

        {/* DOB input */}
        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
            Fecha de nacimiento
          </label>
          <input
            type="date"
            className="input"
            value={dob}
            onChange={e => { setDob(e.target.value); setError(''); }}
            max={maxDateStr}
            style={{ width: '100%' }}
          />
        </div>

        {/* Consent checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer',
          padding: '0.75rem', borderRadius: 10, marginBottom: '1.2rem',
          background: 'rgba(255,68,85,0.04)',
          border: `1px solid ${agreed ? 'rgba(201,168,76,0.3)' : 'rgba(255,68,85,0.2)'}`,
          transition: 'border-color 0.2s', textAlign: 'left',
        }}>
          <div
            onClick={() => setAgreed(v => !v)}
            style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
              border: `2px solid ${agreed ? 'var(--gold)' : 'var(--red)'}`,
              background: agreed ? 'var(--gold)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.18s', cursor: 'pointer',
            }}
          >
            {agreed && (
              <svg width="10" height="8" viewBox="0 0 10 8">
                <path d="M1 4l3 3 5-6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>
            Confirmo que tengo <strong style={{ color: 'var(--text)' }}>18 años o más</strong> y que soy consciente
            de que el juego puede causar adicción. Puedes pedir ayuda en{' '}
            <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--gold)', textDecoration: 'none' }}>jugarbien.es</a>.
          </span>
        </label>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.7rem 0.9rem', marginBottom: '1rem',
            background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.25)',
            borderRadius: 8, color: 'var(--red)', fontSize: '0.82rem', textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          className="btn btn-gold btn-lg"
          style={{ width: '100%', justifyContent: 'center', marginBottom: '0.9rem' }}
        >
          Confirmar y acceder →
        </button>

        {/* Exit */}
        <button
          onClick={() => { window.location.href = HUB_URL; }}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
        >
          No soy mayor de 18 años — Salir
        </button>

        {/* Legal note */}
        <p style={{
          marginTop: '1.2rem', fontSize: '0.68rem', color: 'var(--muted)',
          lineHeight: 1.65, textAlign: 'center',
        }}>
          La verificación de edad está regulada por la Ley 13/2011 de regulación del juego.
          XentoryBet es una herramienta de análisis informativa y no opera como operador de juego.
        </p>
      </div>
    </div>
  );
}
