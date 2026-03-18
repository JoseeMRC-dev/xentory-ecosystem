/**
 * BetLiveTicker — live ticker for Bet app.
 * Shows matches currently in-progress across all sports.
 * Polls ESPN every 20s with no React re-render (imperative DOM patching).
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllLiveMatches } from '../../services/sportsService';
import { SPORT_CONFIG } from '../../constants';
import type { Match } from '../../types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

function buildTickerHTML(matches: Match[]): string {
  if (matches.length === 0) return '';
  const item = (m: Match, clone: boolean) => {
    const sport = SPORT_CONFIG[m.sport as keyof typeof SPORT_CONFIG];
    const homeScore = m.homeScore ?? 0;
    const awayScore = m.awayScore ?? 0;
    const clock     = m.clockDisplay ?? m.minute ? `${m.minute}'` : 'LIVE';
    return `<span
      ${clone ? 'aria-hidden="true"' : `data-mid="${m.id}"`}
      style="display:inline-flex;align-items:center;gap:0.5rem;padding:0 1.8rem;border-right:1px solid rgba(255,255,255,0.06);flex-shrink:0;cursor:pointer;"
    >
      <span style="font-size:0.7rem">${sport?.emoji ?? '🏟️'}</span>
      <span style="font-family:'Outfit',sans-serif;font-weight:600;font-size:0.75rem;color:var(--text2)">${m.homeTeam.shortName ?? m.homeTeam.name.slice(0,3).toUpperCase()}</span>
      <span class="bet-tk-score" style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.82rem;color:var(--red)">${homeScore} - ${awayScore}</span>
      <span style="font-family:'Outfit',sans-serif;font-weight:600;font-size:0.75rem;color:var(--text2)">${m.awayTeam.shortName ?? m.awayTeam.name.slice(0,3).toUpperCase()}</span>
      <span class="bet-tk-clock" style="font-size:0.62rem;color:rgba(255,68,85,0.8);background:rgba(255,68,85,0.1);padding:0.1rem 0.4rem;border-radius:4px;border:1px solid rgba(255,68,85,0.2)">${clock}</span>
    </span>`;
  };
  return matches.map(m => item(m, false)).join('') +
         matches.map(m => item(m, true)).join('');
}

function buildEmptyHTML(): string {
  return `<span style="display:inline-flex;align-items:center;gap:0.6rem;padding:0 2rem;font-size:0.72rem;color:var(--muted);flex-shrink:0">
    Sin partidos en directo ahora mismo
  </span>`.repeat(4);
}

export function BetLiveTicker() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const matchesRef = useRef<Match[]>([]);
  const navigate   = useNavigate();

  const refresh = async () => {
    const live = await fetchAllLiveMatches();
    matchesRef.current = live;
    const track = trackRef.current;
    if (!track) return;
    track.innerHTML = live.length > 0 ? buildTickerHTML(live) : buildEmptyHTML();
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.innerHTML = buildEmptyHTML();

    refresh();
    const id = setInterval(refresh, 20_000);

    const onClick = (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-mid]');
      if (!item) return;
      const mid  = item.dataset.mid;
      const m    = matchesRef.current.find(x => String(x.id) === mid);
      if (m) navigate(`/matches/${m.id}`, { state: { match: m } });
    };
    track.addEventListener('click', onClick);
    return () => { clearInterval(id); track.removeEventListener('click', onClick); };
  }, []);

  return (
    <div className="bet-live-ticker-bar" style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
      height: 'var(--topbar-h, 36px)',
      background: '#060810',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      zIndex: 40,
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* LIVE badge */}
      <div style={{
        padding: '0 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
        borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, height: '100%',
        background: 'rgba(255,68,85,0.06)',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 6px var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.52rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>EN DIRECTO</span>
      </div>

      {/* Track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            animation: 'betTickerScroll 25s linear infinite',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}
        />
      </div>

      <style>{`
        @keyframes betTickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          /* on mobile ticker sits below the 52px nav header */
          .bet-live-ticker-bar { top: 52px !important; }
        }
      `}</style>
    </div>
  );
}
