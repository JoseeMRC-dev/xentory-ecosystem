import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWeekMatches, getMockMatchesBySport, fetchTennisMatches, fetchBasketballMatches, fetchF1Matches, fetchGolfMatches } from '../../services/sportsService';
import { SPORT_CONFIG } from '../../constants';
import { useLang } from '../../context/LanguageContext';
import type { Match, Sport } from '../../types';

// ── LEAGUE PRIORITY ORDER (for grouped display) ──
// Champions → Europa → LaLiga 1/2 → Serie A/B → Bundesliga 1/2 → Premier/Championship → rest
const LEAGUE_PRIORITY: number[] = [2, 3, 140, 141, 135, 136, 78, 79, 39, 40, 61, 94, 128, 262];

// ── COMPETITIONS ──
const COMPETITIONS_BY_SPORT: Record<string, { id: string; name: string; emoji: string; country?: string }[]> = {
  football: [
    { id: 'all', name: 'All',              emoji: '🏆' },
    { id: '2',   name: 'Champions League', emoji: '🏆', country: 'Europe' },
    { id: '3',   name: 'Europa League',    emoji: '🟠', country: 'Europe' },
    { id: '140', name: 'LaLiga',           emoji: '🇪🇸', country: 'Spain' },
    { id: '141', name: 'Segunda División', emoji: '🇪🇸', country: 'Spain' },
    { id: '135', name: 'Serie A',          emoji: '🇮🇹', country: 'Italy' },
    { id: '136', name: 'Serie B',          emoji: '🇮🇹', country: 'Italy' },
    { id: '78',  name: 'Bundesliga',       emoji: '🇩🇪', country: 'Germany' },
    { id: '79',  name: '2. Bundesliga',    emoji: '🇩🇪', country: 'Germany' },
    { id: '39',  name: 'Premier League',   emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
    { id: '40',  name: 'Championship',     emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
    { id: '61',  name: 'Ligue 1',          emoji: '🇫🇷', country: 'France' },
    { id: '94',  name: 'Primeira Liga',    emoji: '🇵🇹', country: 'Portugal' },
    { id: '128', name: 'Liga Argentina',   emoji: '🇦🇷', country: 'Argentina' },
    { id: '262', name: 'Liga MX',          emoji: '🇲🇽', country: 'México' },
  ],
  basketball: [
    { id: 'all', name: 'All',        emoji: '🏀' },
    { id: 'nba', name: 'NBA',        emoji: '🇺🇸', country: 'USA' },
    { id: 'acb', name: 'ACB',        emoji: '🇪🇸', country: 'España' },
    { id: 'ebl', name: 'EuroLeague', emoji: '🌍', country: 'Europa' },
    { id: 'ncaa',name: 'NCAA',       emoji: '🎓', country: 'USA' },
  ],
  tennis: [
    { id: 'all', name: 'All',         emoji: '🎾' },
    { id: 'atp', name: 'ATP Tour',      emoji: '👨', country: 'Mundial' },
    { id: 'wta', name: 'WTA Tour',      emoji: '👩', country: 'Mundial' },
    { id: 'gs',  name: 'Grand Slams',   emoji: '🏆', country: 'Mundial' },
    { id: 'dc',  name: 'Davis Cup',     emoji: '🌍', country: 'Mundial' },
  ],
  f1: [
    { id: 'all', name: 'All GPs',      emoji: '🏎️' },
    { id: 'fp',  name: 'Practice',      emoji: '🔧' },
    { id: 'q',   name: 'Qualifying',    emoji: '⏱️' },
    { id: 'r',   name: 'Race',          emoji: '🏁' },
  ],
  golf: [
    { id: 'all',  name: 'All',         emoji: '⛳' },
    { id: 'pga',  name: 'PGA Tour',      emoji: '🇺🇸', country: 'USA' },
    { id: 'euro', name: 'DP World Tour', emoji: '🌍', country: 'Europa' },
    { id: 'maj',  name: 'Majors',        emoji: '🏆', country: 'Mundial' },
  ],
};

// ── DYNAMIC CALENDAR ICON ──
function CalendarDay() {
  const day = new Date().getDate();
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      width: '1.8rem', height: '1.8rem', borderRadius: 5, overflow: 'hidden',
      border: '1.5px solid rgba(255,255,255,0.12)', verticalAlign: 'middle', flexShrink: 0,
    }}>
      <span style={{ background: '#ef4444', height: '35%', width: '100%' }} />
      <span style={{
        fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)',
        background: 'var(--card2)', width: '100%', flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{day}</span>
    </span>
  );
}

// ── MATCH CARD ──
function MatchCard({ match, query, onClick }: { match: Match; query: string; onClick: () => void }) {
  const sport = SPORT_CONFIG[match.sport];
  const { lang } = useLang();
  const matchDate = new Date(match.date);
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';
  const dateStr = matchDate.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' });
  const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

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
              🔴 {lang === 'es' ? 'EN VIVO' : 'LIVE'}
            </span>
          )}
          {match.status === 'finished' && (
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'rgba(107,114,148,0.15)', color: 'var(--muted)', border: '1px solid rgba(107,114,148,0.25)' }}>
              {lang === 'es' ? 'FIN' : 'FT'}
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{dateStr} · {timeStr}</span>
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
            {highlight(match.homeTeam.name)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{lang === 'es' ? 'Local' : 'Home'}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          {match.status === 'finished' || match.status === 'live' ? (
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: match.status === 'live' ? 'var(--red)' : 'var(--text)' }}>
              {match.homeScore ?? 0} — {match.awayScore ?? 0}
            </div>
          ) : (
            <div style={{ background: 'var(--card2)', borderRadius: 8, padding: '0.3rem 0.8rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
              VS
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
            {highlight(match.awayTeam.name)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{lang === 'es' ? 'Visitante' : 'Away'}</div>
        </div>
      </div>

      {(match.round || match.venue) && (
        <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {match.venue ? `📍 ${match.venue}` : match.round}
          </span>
          <span style={{ fontSize: '0.75rem', color: sport.color, fontWeight: 500 }}>{lang === 'es' ? 'Ver análisis →' : 'View analysis →'}</span>
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
  const { t, lang } = useLang();
  const activeSport       = (searchParams.get('sport') ?? 'football') as Sport;
  const activeCompetition = searchParams.get('comp') ?? 'all';
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';

  const [allMatches, setAllMatches]   = useState<Match[]>([]);
  const [loading, setLoading]         = useState(true);
  const [query, setQuery]             = useState('');
  const [showSearch, setShowSearch]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'played'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Day helpers
  const getDateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  };
  const todayStr    = getDateStr(0);
  const tomorrowStr = getDateStr(1);
  const dayAfterStr = getDateStr(2);

  const getDayDisplayLabel = (dateStr: string): string => {
    if (dateStr === todayStr)    return lang === 'es' ? 'HOY'            : 'TODAY';
    if (dateStr === tomorrowStr) return lang === 'es' ? 'MAÑANA'         : 'TOMORROW';
    if (dateStr === dayAfterStr) return lang === 'es' ? 'PASADO MAÑANA'  : 'DAY AFTER';
    if (dateStr < todayStr)      return lang === 'es' ? 'ANTERIORES'     : 'PREVIOUS';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' });
  };

  // Fetch when sport changes
  useEffect(() => {
    setLoading(true);
    setAllMatches([]);
    setQuery('');
    setSelectedDate('');
    setShowDatePicker(false);

    const load = async () => {
      let results: Match[] = [];
      if (activeSport === 'football') {
        const ids = [2, 3, 140, 141, 135, 136, 78, 79, 39, 40, 61, 94, 128, 262];
        const all = await Promise.all(ids.map(id => fetchWeekMatches(id)));
        results = all.flat().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else if (activeSport === 'tennis') {
        results = await fetchTennisMatches();
      } else if (activeSport === 'basketball') {
        results = await fetchBasketballMatches();
      } else if (activeSport === 'f1') {
        results = await fetchF1Matches();
      } else if (activeSport === 'golf') {
        results = await fetchGolfMatches();
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

  // Filter: competition + status + date + search query
  const visibleMatches = allMatches
    .filter(m => activeCompetition === 'all' || String(m.competition.id) === activeCompetition)
    .filter(m => {
      if (statusFilter === 'upcoming') return m.status !== 'finished';
      if (statusFilter === 'played')   return m.status === 'finished';
      return true;
    })
    .filter(m => {
      if (!selectedDate) return true;
      const d = new Date(m.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
      return d === selectedDate;
    })
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

  // Group by day (YYYY-MM-DD in Madrid TZ) → competition
  const byDay: Record<string, Record<string, Match[]>> = {};
  visibleMatches.forEach(m => {
    const dayKey  = new Date(m.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const compKey = m.competition.name;
    if (!byDay[dayKey]) byDay[dayKey] = {};
    if (!byDay[dayKey][compKey]) byDay[dayKey][compKey] = [];
    byDay[dayKey][compKey].push(m);
  });
  const sortedDays = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));

  // Sort competition groups within a day by league priority
  const sortCompGroups = (entries: [string, Match[]][]) =>
    entries.sort(([, aMs], [, bMs]) => {
      const getId = (ms: Match[]) => {
        const raw = ms[0]?.competition.id;
        return typeof raw === 'string' ? parseInt(raw) : (raw ?? 9999);
      };
      const ap = LEAGUE_PRIORITY.indexOf(getId(aMs)); const bp = LEAGUE_PRIORITY.indexOf(getId(bMs));
      return (ap === -1 ? 9999 : ap) - (bp === -1 ? 9999 : bp);
    });

  const setSport = (sport: string) => setSearchParams({ sport, comp: 'all' });
  const setComp  = (comp: string)  => setSearchParams({ sport: activeSport, comp });

  const match_word = lang === 'es'
    ? (n: number) => `partido${n !== 1 ? 's' : ''}`
    : (n: number) => `match${n !== 1 ? 'es' : ''}`;

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100, width: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDay /> {t('Partidos y Eventos', 'Matches & Events')}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {t('Filtra por deporte, competición o busca directamente.', 'Filter by sport, competition or search directly.')}
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
          🔍 {t('Buscar', 'Search')}
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
            placeholder={t(
              `Buscar equipos, jugadores, competiciones... (${allMatches.length} eventos cargados)`,
              `Search teams, players, competitions... (${allMatches.length} events loaded)`
            )}
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
                ? t('Sin resultados', 'No results')
                : `${visibleMatches.length} ${t('resultado', 'result')}${visibleMatches.length !== 1 ? 's' : ''} ${t('para', 'for')} "${query}"`}
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

      {/* ── STATUS FILTER + DATE PICKER ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: showDatePicker ? '0.5rem' : '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginRight: '0.2rem' }}>
          {lang === 'es' ? 'Mostrar:' : 'Show:'}
        </span>
        {([
          { id: 'all',      label: lang === 'es' ? 'Todos'     : 'All',      emoji: '📋' },
          { id: 'upcoming', label: lang === 'es' ? 'Por jugar' : 'Upcoming', emoji: '⏳' },
          { id: 'played',   label: lang === 'es' ? 'Jugados'   : 'Played',   emoji: '✅' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            style={{
              padding: '0.35rem 0.9rem', borderRadius: 100, cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: statusFilter === f.id ? 'var(--gold-dim)' : 'var(--card2)',
              color:      statusFilter === f.id ? 'var(--gold)'    : 'var(--muted)',
              border:     statusFilter === f.id ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--border)',
              transition: 'all 0.2s',
            }}
          >
            <span>{f.emoji}</span><span>{f.label}</span>
          </button>
        ))}
        {/* Elegir fecha */}
        <button
          onClick={() => { setShowDatePicker(s => !s); if (showDatePicker) setSelectedDate(''); }}
          style={{
            padding: '0.35rem 0.9rem', borderRadius: 100, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem',
            background: selectedDate ? 'rgba(0,212,255,0.1)' : 'var(--card2)',
            color:      selectedDate ? 'var(--cyan)'         : 'var(--muted)',
            border:     selectedDate ? '1px solid rgba(0,212,255,0.3)' : '1px solid var(--border)',
            transition: 'all 0.2s',
          }}
        >
          <span>📆</span>
          <span>
            {selectedDate
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short' })
              : (lang === 'es' ? 'Elegir fecha' : 'Pick date')}
          </span>
          {selectedDate && (
            <span
              onClick={e => { e.stopPropagation(); setSelectedDate(''); setShowDatePicker(false); }}
              style={{ marginLeft: '0.1rem', fontSize: '0.8rem' }}
            >✕</span>
          )}
        </button>
      </div>
      {showDatePicker && (
        <div style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <input
            type="date"
            className="input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ maxWidth: 200, padding: '0.4rem 0.8rem', fontSize: '0.88rem' }}
          />
          {selectedDate && !loading && (
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {visibleMatches.length} {match_word(visibleMatches.length)} {lang === 'es' ? 'encontrados' : 'found'}
            </span>
          )}
        </div>
      )}

      {/* ── ACTIVE FILTERS SUMMARY ── */}
      {(query || activeCompetition !== 'all' || selectedDate) && !loading && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t('Filtros activos:', 'Active filters:')}</span>
          {activeCompetition !== 'all' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)', fontSize: '0.72rem', color: 'var(--gold)' }}>
              {competitions.find(c => c.id === activeCompetition)?.emoji} {competitions.find(c => c.id === activeCompetition)?.name}
              <button onClick={() => setComp('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </span>
          )}
          {selectedDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '0.72rem', color: 'var(--cyan)' }}>
              📆 {new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })}
              <button onClick={() => { setSelectedDate(''); setShowDatePicker(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </span>
          )}
          {query && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '0.72rem', color: 'var(--cyan)' }}>
              🔍 "{query}"
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: '0.8rem', padding: 0 }}>✕</button>
            </span>
          )}
          <button onClick={() => { setComp('all'); setQuery(''); setSelectedDate(''); setShowDatePicker(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem', textDecoration: 'underline' }}>
            {t('Limpiar todo', 'Clear all')}
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
            {query
              ? t(`Sin resultados para "${query}"`, `No results for "${query}"`)
              : t('No hay partidos próximos', 'No upcoming matches')}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.2rem' }}>
            {query
              ? t('Prueba con otro nombre de equipo o competición.', 'Try a different team name or competition.')
              : activeCompetition !== 'all'
                ? t('No hay partidos para esta competición.', 'No matches for this competition.')
                : t('No hay eventos disponibles. Prueba con otro deporte.', 'No events available. Try a different sport.')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeCompetition !== 'all' && (
              <button onClick={() => setComp('all')} className="btn btn-outline btn-sm">{t('Ver todas', 'View all')}</button>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="btn btn-outline btn-sm">{t('Limpiar búsqueda', 'Clear search')}</button>
            )}
          </div>
        </div>
      ) : query ? (
        // Search results — flat list
        <>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
            {visibleMatches.length} {t('resultado', 'result')}{visibleMatches.length !== 1 ? 's' : ''} {t('para', 'for')} "{query}"
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} query={query} onClick={() => navigate(`/matches/${match.id}`, { state: { match } })} />
            ))}
          </div>
        </>
      ) : (
        // Grouped by day → competition
        <>
          {sortedDays.map(([dayKey, compGroups]) => {
            const dayLabel    = getDayDisplayLabel(dayKey);
            const sortedComps = sortCompGroups(Object.entries(compGroups));
            const dayTotal    = Object.values(compGroups).flat().length;
            const dayColor    = dayKey === todayStr ? 'var(--gold)' : dayKey === tomorrowStr ? 'var(--cyan)' : 'var(--text)';
            return (
              <div key={dayKey} style={{ marginBottom: '2.5rem' }}>
                {/* Day header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: `2px solid ${dayKey === todayStr ? 'rgba(201,168,76,0.35)' : dayKey === tomorrowStr ? 'rgba(0,212,255,0.25)' : 'var(--border)'}` }}>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: dayColor, letterSpacing: '0.04em' }}>{dayLabel}</span>
                  {dayKey !== todayStr && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      · {new Date(dayKey + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: '0.2rem' }}>
                    {dayTotal} {match_word(dayTotal)}
                  </span>
                </div>

                {/* Competition groups within this day */}
                {sortedComps.map(([compName, matches]) => {
                  const showSplit = statusFilter === 'all';
                  const played    = showSplit ? matches.filter(m => m.status === 'finished') : [];
                  const pending   = showSplit ? matches.filter(m => m.status !== 'finished') : matches;
                  return (
                    <div key={compName} style={{ marginBottom: '1.5rem' }}>
                      {/* Competition header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.7rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem' }}>{matches[0]?.competition.emoji}</span>
                        <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.9rem' }}>{compName}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{matches.length} {match_word(matches.length)}</span>
                        {showSplit && played.length > 0 && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: 100, background: 'rgba(107,114,148,0.12)', color: 'var(--muted)', border: '1px solid rgba(107,114,148,0.2)' }}>
                            {played.length} {lang === 'es' ? 'jugados' : 'played'}
                          </span>
                        )}
                        {showSplit && pending.length > 0 && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: 100, background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.2)' }}>
                            {pending.length} {lang === 'es' ? 'por jugar' : 'upcoming'}
                          </span>
                        )}
                      </div>

                      {/* Pending */}
                      {pending.length > 0 && (
                        <>
                          {showSplit && played.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {lang === 'es' ? 'Por jugar' : 'Upcoming'}
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem', marginBottom: played.length > 0 ? '1rem' : 0 }}>
                            {pending.map(match => (
                              <MatchCard key={match.id} match={match} query="" onClick={() => navigate(`/matches/${match.id}`, { state: { match } })} />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Played */}
                      {showSplit && played.length > 0 && (
                        <>
                          {pending.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {lang === 'es' ? 'Jugados' : 'Played'}
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem', opacity: 0.7 }}>
                            {played.map(match => (
                              <MatchCard key={match.id} match={match} query="" onClick={() => navigate(`/matches/${match.id}`, { state: { match } })} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', paddingTop: '1rem' }}>
            {visibleMatches.length} {match_word(visibleMatches.length)} {t('en total', 'total')}
          </div>
        </>
      )}
    </div>
  );
}

