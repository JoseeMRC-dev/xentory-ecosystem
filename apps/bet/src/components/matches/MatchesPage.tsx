import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchUpcomingMatches, getMockMatchesBySport } from '../../services/sportsService';
import { SPORT_CONFIG } from '../../constants';
import type { Match, Sport } from '../../types';

// ── COMPETITIONS ──
const COMPETITIONS_BY_SPORT: Record<string, { id: string; name: string; emoji: string; country?: string }[]> = {
  football: [
    { id: 'all', name: 'Todas',            emoji: '🏆' },
    { id: '2',   name: 'Champions League', emoji: '🏆', country: 'Europa' },
    { id: '3',   name: 'Europa League',    emoji: '🟠', country: 'Europa' },
    { id: '140', name: 'La Liga',          emoji: '🇪🇸', country: 'España' },
    { id: '141', name: 'Segunda División', emoji: '🇪🇸', country: 'España' },
    { id: '39',  name: 'Premier League',   emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'Inglaterra' },
    { id: '135', name: 'Serie A',          emoji: '🇮🇹', country: 'Italia' },
    { id: '78',  name: 'Bundesliga',       emoji: '🇩🇪', country: 'Alemania' },
    { id: '61',  name: 'Ligue 1',          emoji: '🇫🇷', country: 'Francia' },
    { id: '94',  name: 'Primeira Liga',    emoji: '🇵🇹', country: 'Portugal' },
    { id: '128', name: 'Liga Argentina',   emoji: '🇦🇷', country: 'Argentina' },
    { id: '262', name: 'Liga MX',          emoji: '🇲🇽', country: 'México' },
  ],
  basketball: [
    { id: 'all', name: 'Todas',      emoji: '🏀' },
    { id: 'nba', name: 'NBA',        emoji: '🇺🇸', country: 'USA' },
    { id: 'acb', name: 'ACB',        emoji: '🇪🇸', country: 'España' },
    { id: 'ebl', name: 'EuroLeague', emoji: '🌍', country: 'Europa' },
    { id: 'ncaa',name: 'NCAA',       emoji: '🎓', country: 'USA' },
  ],
  tennis: [
    { id: 'all', name: 'Todos',         emoji: '🎾' },
    { id: 'atp', name: 'ATP Tour',      emoji: '👨', country: 'Mundial' },
    { id: 'wta', name: 'WTA Tour',      emoji: '👩', country: 'Mundial' },
    { id: 'gs',  name: 'Grand Slams',   emoji: '🏆', country: 'Mundial' },
    { id: 'dc',  name: 'Davis Cup',     emoji: '🌍', country: 'Mundial' },
  ],
  f1: [
    { id: 'all', name: 'Todos los GP',  emoji: '🏎️' },
    { id: 'fp',  name: 'Práctica libre',emoji: '🔧' },
    { id: 'q',   name: 'Clasificación', emoji: '⏱️' },
    { id: 'r',   name: 'Carrera',       emoji: '🏁' },
  ],
  golf: [
    { id: 'all',  name: 'Todos',         emoji: '⛳' },
    { id: 'pga',  name: 'PGA Tour',      emoji: '🇺🇸', country: 'USA' },
    { id: 'euro', name: 'DP World Tour', emoji: '🌍', country: 'Europa' },
    { id: 'maj',  name: 'Majors',        emoji: '🏆', country: 'Mundial' },
  ],
};

// ── MATCH CARD ──
function MatchCard({ match, query, onClick }: { match: Match; query: string; onClick: () => void }) {
  const sport = SPORT_CONFIG[match.sport];
  const dateStr = new Date(match.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const highlight = (text: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(201,168,76,0.3)', color: 'var(--gold)', borderRadius: 2 }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className="glass"
      style={{
        borderRadius: 14, padding: '1.2rem 1.4rem', cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s',
        borderLeft: `3px solid ${sport.color}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <span style={{ fontSize: '0.72rem', color: sport.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {match.competition.emoji} {match.competition.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {match.status === 'live' && (
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'rgba(255,68,85,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,85,0.25)', animation: 'pulse 2s infinite' }}>
              🔴 EN VIVO
            </span>
          )}
          {match.status === 'finished' && (
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'rgba(107,114,148,0.15)', color: 'var(--muted)', border: '1px solid rgba(107,114,148,0.25)' }}>
              FIN
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{dateStr} · {timeStr}</span>
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem' }}>
            {highlight(match.homeTeam.name)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Local</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          {match.status === 'finished' || match.status === 'live' ? (
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: match.status === 'live' ? 'var(--red)' : 'var(--text)' }}>
              {match.homeScore ?? 0} — {match.awayScore ?? 0}
            </div>
          ) : (
            <div style={{ background: 'var(--card2)', borderRadius: 8, padding: '0.3rem 0.8rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
              VS
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem' }}>
            {highlight(match.awayTeam.name)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Visitante</div>
        </div>
      </div>

      {(match.round || match.venue) && (
        <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {match.venue ? `📍 ${match.venue}` : match.round}
          </span>
          <span style={{ fontSize: '0.75rem', color: sport.color, fontWeight: 500 }}>Ver análisis →</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
export function MatchesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSport       = (searchParams.get('sport') ?? 'football') as Sport;
  const activeCompetition = searchParams.get('comp') ?? 'all';

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch when sport changes
  useEffect(() => {
    setLoading(true);
    setAllMatches([]);
    setQuery('');

    const load = async () => {
      let results: Match[] = [];
      if (activeSport === 'football') {
        const ids = [2, 3, 140, 141, 39, 135, 78, 61, 94, 128, 262];
        const all = await Promise.all(ids.map(id => fetchUpcomingMatches(id, 5)));
        results = all.flat();
      } else {
        results = getMockMatchesBySport(activeSport);
      }
      setAllMatches(results);
      setLoading(false);
    };
    load();
  }, [activeSport]);

  // Focus search on open
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 100);
  }, [showSearch]);

  // Keyboard shortcut: / to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !showSearch && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') { setShowSearch(false); setQuery(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSearch]);

  const competitions = COMPETITIONS_BY_SPORT[activeSport] ?? [];

  // Filter: competition + search query
  const visibleMatches = allMatches
    .filter(m => activeCompetition === 'all' || String(m.competition.id) === activeCompetition)
    .filter(m => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.competition.name.toLowerCase().includes(q) ||
        (m.venue?.toLowerCase().includes(q) ?? false) ||
        (m.round?.toLowerCase().includes(q) ?? false)
      );
    });

  // Group matches by competition for display
  const grouped: Record<string, Match[]> = {};
  visibleMatches.forEach(m => {
    const key = m.competition.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const setSport = (sport: string) => setSearchParams({ sport, comp: 'all' });
  const setComp  = (comp: string)  => setSearchParams({ sport: activeSport, comp });

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>📅 Partidos y eventos</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            Filtra por deporte, competición o busca directamente.
          </p>
        </div>
        {/* Search toggle */}
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 100, cursor: 'pointer',
            background: showSearch ? 'var(--gold-dim)' : 'var(--card2)',
            border: showSearch ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--border)',
            color: showSearch ? 'var(--gold)' : 'var(--muted)',
            fontSize: '0.82rem', transition: 'all 0.2s',
          }}
        >
          🔍 Buscar
          <span style={{ padding: '0.1rem 0.4rem', borderRadius: 4, background: 'var(--card2)', fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'monospace' }}>/</span>
        </button>
      </div>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</div>
          <input
            ref={searchRef}
            className="input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Buscar equipos, jugadores, competiciones, pilotos... (${allMatches.length} eventos cargados)`}
            style={{ paddingLeft: '2.8rem', paddingRight: query ? '2.8rem' : '1rem', fontSize: '0.95rem', width: '100%' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem' }}
            >✕</button>
          )}
          {query && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
              {visibleMatches.length === 0
                ? 'Sin resultados'
                : `${visibleMatches.length} resultado${visibleMatches.length !== 1 ? 's' : ''} para "${query}"`}
            </div>
          )}
        </div>
      )}

      {/* ── SPORT TABS ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setSport(key)}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 100, cursor: 'pointer',
              fontSize: '0.83rem', fontWeight: 500,
              background: activeSport === key ? `${cfg.color}18` : 'var(--card2)',
              color: activeSport === key ? cfg.color : 'var(--muted)',
              border: activeSport === key ? `1px solid ${cfg.color}40` : '1px solid var(--border)',
              transition: 'all 0.2s',
            }}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* ── COMPETITION SELECTOR ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        {/* League pills — scrollable on mobile */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.3rem', scrollbarWidth: 'none' }}>
          {competitions.map(comp => {
            const matchCount = allMatches.filter(m =>
              comp.id === 'all' ? true : String(m.competition.id) === comp.id
            ).length;
            const isActive = activeCompetition === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => setComp(comp.id)}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: 100, cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 500, flexShrink: 0,
                  background: isActive ? 'var(--gold-dim)' : 'var(--card2)',
                  color: isActive ? 'var(--gold)' : 'var(--muted)',
                  border: isActive ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                <span>{comp.emoji}</span>
                <span>{comp.name}</span>
                {!loading && matchCount > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(201,168,76,0.25)' : 'var(--border)',
                    color: isActive ? 'var(--gold)' : 'var(--muted)',
                    borderRadius: 100, padding: '0 0.35rem', fontSize: '0.65rem', fontWeight: 700,
                    minWidth: 16, textAlign: 'center',
                  }}>{matchCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE FILTERS SUMMARY ── */}
      {(query || activeCompetition !== 'all') && !loading && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Filtros activos:</span>
          {activeCompetition !== 'all' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)', fontSize: '0.72rem', color: 'var(--gold)' }}>
              {competitions.find(c => c.id === activeCompetition)?.emoji} {competitions.find(c => c.id === activeCompetition)?.name}
              <button onClick={() => setComp('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </span>
          )}
          {query && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '0.72rem', color: 'var(--cyan)' }}>
              🔍 "{query}"
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </span>
          )}
          <button onClick={() => { setComp('all'); setQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem', textDecoration: 'underline' }}>
            Limpiar todo
          </button>
        </div>
      )}

      {/* ── RESULTS ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ height: 140, borderRadius: 14, background: 'var(--card2)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : visibleMatches.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: '3.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {query ? '🔍' : (competitions.find(c => c.id === activeCompetition)?.emoji ?? SPORT_CONFIG[activeSport]?.emoji)}
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {query ? `Sin resultados para "${query}"` : 'No hay partidos próximos'}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.2rem' }}>
            {query
              ? 'Prueba con otro nombre de equipo, jugador o competición.'
              : activeCompetition !== 'all'
                ? 'No hay partidos para esta competición.'
                : 'No hay eventos disponibles. Prueba con otro deporte.'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeCompetition !== 'all' && (
              <button onClick={() => setComp('all')} className="btn btn-outline btn-sm">Ver todas</button>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="btn btn-outline btn-sm">Limpiar búsqueda</button>
            )}
          </div>
        </div>
      ) : query ? (
        // Search results — flat list
        <>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
            {visibleMatches.length} resultado{visibleMatches.length !== 1 ? 's' : ''} para "{query}"
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} query={query} onClick={() => navigate(`/matches/${match.id}`, { state: { match } })} />
            ))}
          </div>
        </>
      ) : (
        // Grouped by competition
        <>
          {Object.entries(grouped).map(([compName, matches]) => (
            <div key={compName} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1rem' }}>{matches[0]?.competition.emoji}</span>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>{compName}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: '0.3rem' }}>
                  {matches.length} partido{matches.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem' }}>
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} query="" onClick={() => navigate(`/matches/${match.id}`, { state: { match } })} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', paddingTop: '1rem' }}>
            {visibleMatches.length} partido{visibleMatches.length !== 1 ? 's' : ''} en total
          </div>
        </>
      )}
    </div>
  );
}
