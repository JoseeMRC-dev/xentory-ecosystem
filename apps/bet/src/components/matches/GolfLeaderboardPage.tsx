import { useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchGolfLeaderboardDetail, golfPlayingPartners } from '../../services/sportsService';
import { generateGolfGroupAnalysis, generateGolfPlayerAnalysis } from '../../services/aiService';
import { useLang } from '../../context/LanguageContext';
import type { Match, GolfPlayerEntry, GolfGroupAnalysisResult, GolfPlayerAnalysisResult } from '../../types';

function scoreColor(score: string): string {
  if (!score || score === 'E' || score === '--' || score === '-') return 'var(--text)';
  if (score.startsWith('-')) return '#00ff88';
  if (score.startsWith('+')) return '#ef4444';
  return 'var(--text)';
}

// ── ROUND-BY-ROUND ROW ──
function RoundHistory({ player, currentPeriod, lang }: { player: GolfPlayerEntry; currentPeriod: number; lang: string }) {
  const rounds = [1, 2, 3, 4].map(r => player.rounds.find(x => x.round === r));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.8rem' }}>
      {rounds.map((rd, i) => {
        const roundNum = i + 1;
        const isToday = roundNum === currentPeriod;
        return (
          <div key={roundNum} style={{
            borderRadius: 10, padding: '0.55rem 0.4rem', textAlign: 'center',
            background: isToday ? 'var(--gold-dim)' : 'var(--card2)',
            border: isToday ? '1px solid var(--border2)' : '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              {lang === 'es' ? 'Ronda' : 'Round'} {roundNum}{isToday ? ` · ${lang === 'es' ? 'HOY' : 'TODAY'}` : ''}
            </div>
            {rd && rd.strokes != null ? (
              <>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rd.strokes}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: scoreColor(rd.toPar) }}>{rd.toPar}</div>
              </>
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', paddingTop: '0.3rem' }}>
                {lang === 'es' ? 'Sin jugar' : 'Not played'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SECTION HEADING ──
function SectionHeading({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
      fontWeight: 700, marginBottom: '0.7rem',
    }}>
      <span>{icon}</span>{children}
    </div>
  );
}

// ── TREND BADGE ──
function TrendBadge({ trend, lang }: { trend: 'up' | 'down' | 'stable'; lang: string }) {
  const cfg = {
    up:      { icon: '↗', color: '#00ff88', bg: 'rgba(0,255,136,0.1)', label: lang === 'es' ? 'En racha' : 'Trending up' },
    down:    { icon: '↘', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: lang === 'es' ? 'A la baja' : 'Trending down' },
    stable:  { icon: '→', color: 'var(--muted)', bg: 'var(--card2)', label: lang === 'es' ? 'Estable' : 'Stable' },
  }[trend];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.72rem', fontWeight: 600, color: cfg.color, background: cfg.bg,
      padding: '0.25rem 0.6rem', borderRadius: 999,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── INDIVIDUAL ANALYSIS SKELETON ──
function AnalysisSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[1, 2].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div className="animate-pulse" style={{ height: 10, borderRadius: 6, width: '92%', background: 'var(--card2)' }} />
          <div className="animate-pulse" style={{ height: 10, borderRadius: 6, width: '76%', background: 'var(--card2)' }} />
        </div>
      ))}
    </div>
  );
}

// ── PLAYER DETAIL PANEL ──
function PlayerDetailPanel({
  player, partners, currentPeriod, tournamentName, onClose,
}: {
  player: GolfPlayerEntry; partners: GolfPlayerEntry[]; currentPeriod: number; tournamentName: string; onClose: () => void;
}) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [groupAnalysis, setGroupAnalysis]   = useState<GolfGroupAnalysisResult | null>(null);
  const [groupLoading, setGroupLoading]     = useState(false);
  const [playerAnalysis, setPlayerAnalysis] = useState<GolfPlayerAnalysisResult | null>(null);
  const [playerLoading, setPlayerLoading]   = useState(true);

  useEffect(() => {
    setGroupAnalysis(null);
    setPlayerAnalysis(null);
    setPlayerLoading(true);
    generateGolfPlayerAnalysis(tournamentName, currentPeriod, player, user?.plan ?? 'free')
      .then(setPlayerAnalysis)
      .finally(() => setPlayerLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  const runGroupAnalysis = async () => {
    setGroupLoading(true);
    const result = await generateGolfGroupAnalysis(tournamentName, currentPeriod, [player, ...partners], user?.plan ?? 'free');
    setGroupAnalysis(result);
    setGroupLoading(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const initials = player.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(0.4rem, 4vw, 1rem)',
      }}
    >
      <div
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{
          borderRadius: 'clamp(16px, 4vw, 20px)', padding: 0,
          width: '100%', maxWidth: 540, maxHeight: 'min(90vh, 760px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'fadeUp 0.22s ease both',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '1.3rem 1.4rem',
          background: 'linear-gradient(135deg, var(--gold-dim), transparent)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', color: '#F2EDE4',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border2)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                {player.position}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: scoreColor(player.score) }}>{player.score}</span>
              {player.thru !== '-' && (
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {player.thru === 'F' ? t('Ronda terminada', 'Round finished') : `${t('Hoyo', 'Hole')} ${player.thru}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '1.3rem 1.4rem', overflowY: 'auto' }}>
          {/* Individual tournament analysis — auto-generated */}
          <div style={{ marginBottom: '1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
              <SectionHeading icon="📊">{t('Análisis individual', 'Individual analysis')}</SectionHeading>
              {!playerLoading && playerAnalysis && <TrendBadge trend={playerAnalysis.trend} lang={lang} />}
            </div>
            {playerLoading ? (
              <AnalysisSkeleton />
            ) : playerAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={{ padding: '0.8rem 0.9rem', borderRadius: 12, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                    {t('Hoy', 'Today')}
                  </div>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>{playerAnalysis.today}</p>
                </div>
                <div style={{ padding: '0.8rem 0.9rem', borderRadius: 12, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                    {t('Torneo general', 'Overall tournament')}
                  </div>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>{playerAnalysis.tournament}</p>
                </div>
              </div>
            )}
          </div>

          <SectionHeading icon="⛳">{t('Golpes por ronda', 'Strokes by round')}</SectionHeading>
          <RoundHistory player={player} currentPeriod={currentPeriod} lang={lang} />

          {/* Playing partners box */}
          <div style={{ marginTop: '1.3rem', padding: '1rem', borderRadius: 14, background: 'var(--card2)', border: '1px solid var(--border)' }}>
            <SectionHeading icon="👥">{t('Jugando hoy con', 'Playing today with')}</SectionHeading>
            {partners.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {t('Sin información de emparejamiento disponible todavía.', 'No pairing information available yet.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {partners.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0' }}>
                    <span>{p.name}</span>
                    <span style={{ color: 'var(--muted)' }}>{p.position} · <span style={{ color: scoreColor(p.score) }}>{p.score}</span></span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={runGroupAnalysis}
              disabled={groupLoading || partners.length === 0}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.9rem', width: '100%', opacity: partners.length === 0 ? 0.5 : 1 }}
            >
              {groupLoading ? t('Analizando…', 'Analyzing…') : `🤖 ${t('Analizar este partido con los demás jugadores', 'Analyze this group with the other players')}`}
            </button>
          </div>

          {groupAnalysis && (
            <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>{groupAnalysis.summary}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.9rem' }}>
                {groupAnalysis.playerNotes.map((n, i) => (
                  <div key={i} style={{ padding: '0.6rem 0.8rem', borderRadius: 10, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{n.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{n.note}</div>
                  </div>
                ))}
              </div>
              {groupAnalysis.prediction && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--border2)', fontSize: '0.85rem' }}>
                  🎯 {groupAnalysis.prediction}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── MAIN PAGE ──
export function GolfLeaderboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();
  const match: Match | undefined = location.state?.match;

  const [players, setPlayers]           = useState<GolfPlayerEntry[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [tournamentName, setTournamentName] = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selectedId, setSelectedId]     = useState<string | null>(null);

  useEffect(() => {
    if (!match?.espnEventId) { setError(t('No se encontró el torneo.', 'Tournament not found.')); setLoading(false); return; }
    setLoading(true);
    setError('');
    fetchGolfLeaderboardDetail(match.espnEventId)
      .then(res => {
        if (!res || res.players.length === 0) { setError(t('No hay clasificación disponible todavía.', 'No leaderboard available yet.')); setLoading(false); return; }
        setPlayers(res.players);
        setCurrentPeriod(res.currentPeriod);
        setTournamentName(res.tournamentName || match.competition.name);
        setLoading(false);
      })
      .catch(() => { setError(t('Error al cargar la clasificación.', 'Error loading leaderboard.')); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.espnEventId]);

  const selectedPlayer = players.find(p => p.id === selectedId) ?? null;
  const partners = selectedPlayer ? golfPlayingPartners(players, currentPeriod, selectedPlayer.id) : [];

  if (!match) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
      <h3>{t('Torneo no encontrado', 'Tournament not found')}</h3>
      <button onClick={() => navigate('/matches')} className="btn btn-outline" style={{ marginTop: '1rem' }}>← {t('Volver', 'Back')}</button>
    </div>
  );

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>
      <button onClick={() => navigate('/matches')} className="btn btn-ghost btn-sm" style={{ marginBottom: '1.2rem' }}>← {t('Volver a partidos', 'Back to matches')}</button>

      <div className="glass" style={{ borderRadius: 16, padding: '1.4rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#22c55e', marginBottom: '0.3rem' }}>{match.competition.emoji} {match.competition.name}</div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{tournamentName || match.venue || match.competition.name}</h2>
        {match.venue && <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{match.venue}</div>}
      </div>

      {loading && (
        <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: 36, height: 36, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--muted)' }}>{t('Cargando clasificación completa…', 'Loading full leaderboard…')}</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="glass" style={{ borderRadius: 16, padding: '0.6rem 0 1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.6rem 1.2rem' }}>
            <span style={{ width: 44 }}>{t('Pos', 'Pos')}</span>
            <span style={{ flex: 1 }}>{t('Jugador', 'Player')}</span>
            <span style={{ width: 60, textAlign: 'right' }}>{t('Total', 'Total')}</span>
            <span style={{ width: 60, textAlign: 'right' }}>{t('Hoyo', 'Thru')}</span>
          </div>
          {players.map((p, i) => (
            <div key={p.id}>
              <div
                onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0.6rem 1.2rem', cursor: 'pointer',
                  background: selectedId === p.id ? 'var(--gold-dim)' : i % 2 === 0 ? 'var(--card2)' : 'transparent',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ width: 44, fontSize: '0.8rem', fontWeight: i < 3 ? 700 : 400, color: i < 3 ? 'var(--gold)' : 'var(--text)' }}>{p.position}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: i < 3 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ width: 60, textAlign: 'right', fontWeight: 700, color: scoreColor(p.score) }}>{p.score}</span>
                <span style={{ width: 60, textAlign: 'right', fontSize: '0.78rem', color: 'var(--muted)' }}>{p.thru}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPlayer && (
        <PlayerDetailPanel
          player={selectedPlayer}
          partners={partners}
          currentPeriod={currentPeriod}
          tournamentName={tournamentName || match.competition.name}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
