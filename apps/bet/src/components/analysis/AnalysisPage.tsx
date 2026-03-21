import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchTeamStats, fetchNonFootballStats, fetchLiveMatchById, fetchWeekMatches, fetchTennisMatches, fetchBasketballMatches, fetchF1Matches, fetchGolfMatches } from '../../services/sportsService';
import { generateMatchAnalysis } from '../../services/aiService';
import { SPORT_CONFIG, FORM_COLORS, confidenceColor } from '../../constants';
import { useLang } from '../../context/LanguageContext';
import type { MatchAnalysis, FormMatch, Match } from '../../types';

const FOOTBALL_LEAGUE_SLUGS: Record<number, string> = {
  2: 'soccer/uefa.champions', 3: 'soccer/uefa.europa',
  39: 'soccer/eng.1', 135: 'soccer/ita.1', 140: 'soccer/esp.1',
  141: 'soccer/esp.2', 78: 'soccer/ger.1', 61: 'soccer/fra.1',
  94: 'soccer/por.1', 128: 'soccer/arg.1', 262: 'soccer/mex.1',
};

function FormBadge({ result }: { result: FormMatch['result'] }) {
  const c = FORM_COLORS[result];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:26, height:26, borderRadius:'50%', fontSize:'0.72rem', fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {result}
    </span>
  );
}

function MarketRow({ label, prob, recommendation, isRec, odds }: { label:string; prob:number; recommendation:string; isRec:boolean; odds?:number }) {
  const color = isRec ? confidenceColor(prob) : 'var(--muted)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.7rem 0.9rem', borderRadius:10, background:isRec?`${color}08`:'transparent', border:isRec?`1px solid ${color}25`:'1px solid transparent' }}>
      <div style={{ flex:1, fontSize:'0.85rem', fontWeight:isRec?500:300, color:isRec?'var(--text)':'var(--text2)' }}>{label} {isRec&&'✓'}</div>
      <div style={{ width:120 }}><div className="conf-bar"><div className="conf-bar-fill" style={{ width:`${prob}%`, background:color }} /></div></div>
      <div style={{ minWidth:40, textAlign:'right', fontFamily:'Outfit', fontWeight:700, fontSize:'0.88rem', color }}>{prob}%</div>
      {odds && <div style={{ minWidth:40, textAlign:'right', fontSize:'0.8rem', color:'var(--gold)' }}>@{odds}</div>}
    </div>
  );
}

function LiveScoreboard({ match, liveData }: { match: Match; liveData: Partial<Match>|null }) {
  const { t, lang } = useLang();
  const sport      = SPORT_CONFIG[match.sport as keyof typeof SPORT_CONFIG];
  const locale     = lang === 'es' ? 'es-ES' : 'en-GB';
  const isLive     = (liveData?.status ?? match.status) === 'live';
  const isFinished = (liveData?.status ?? match.status) === 'finished';
  const homeScore  = liveData?.homeScore ?? match.homeScore;
  const awayScore  = liveData?.awayScore ?? match.awayScore;
  const clock      = liveData?.clockDisplay ?? match.clockDisplay;
  const hasScore   = homeScore !== undefined && awayScore !== undefined;

  return (
    <div className="glass" style={{ borderRadius:18, padding:'2rem', marginBottom:'1.5rem', borderTop:`2px solid ${sport.color}`, background:`linear-gradient(135deg, ${sport.color}06, transparent)`, position:'relative', overflow:'hidden' }}>
      {isLive && <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,68,85,0.04), transparent)', pointerEvents:'none' }} />}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span style={{ fontSize:'1.1rem' }}>{sport.emoji}</span>
          <span style={{ fontSize:'0.82rem', color:sport.color, fontWeight:500 }}>{match.competition.name}</span>
          {match.round && <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>· {match.round}</span>}
        </div>
        <div style={{ display:'flex', gap:'0.6rem' }}>
          {isLive && (
            <span style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.72rem', padding:'0.25rem 0.7rem', borderRadius:100, background:'rgba(255,68,85,0.12)', color:'var(--red)', border:'1px solid rgba(255,68,85,0.3)', animation:'pulse 2s infinite' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)', display:'inline-block' }} />
              {t('EN DIRECTO','LIVE')}
            </span>
          )}
          {isFinished && <span style={{ fontSize:'0.72rem', padding:'0.25rem 0.7rem', borderRadius:100, background:'rgba(107,114,148,0.12)', color:'var(--muted)', border:'1px solid rgba(107,114,148,0.25)' }}>{t('FINALIZADO','FINISHED')}</span>}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:'1.5rem', textAlign:'center' }}>
        <div>
          {match.homeTeam.logo && <img src={match.homeTeam.logo} alt="" style={{ width:52, height:52, objectFit:'contain', marginBottom:'0.5rem', filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
          <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'1.5rem', lineHeight:1.2 }}>{match.homeTeam.name}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'0.2rem' }}>{t('Local','Home')}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem' }}>
          {hasScore ? (
            <>
              <div style={{ fontFamily:'Outfit', fontWeight:900, fontSize:isLive?'3.2rem':'2.6rem', color:isLive?'var(--red)':'var(--text)', letterSpacing:'-0.02em', lineHeight:1, textShadow:isLive?'0 0 30px rgba(255,68,85,0.35)':'none', transition:'all 0.4s' }}>
                {homeScore} — {awayScore}
              </div>
              {clock && (
                <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'0.85rem', color:isLive?'var(--red)':'var(--muted)', background:isLive?'rgba(255,68,85,0.1)':'var(--card2)', padding:'0.2rem 0.75rem', borderRadius:6, border:isLive?'1px solid rgba(255,68,85,0.25)':'1px solid var(--border)' }}>
                  {clock}
                </div>
              )}
            </>
          ) : (
            <div style={{ background:'var(--card2)', borderRadius:12, padding:'0.8rem 1.5rem', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:'0.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.3rem' }}>
                {new Date(match.date).toLocaleDateString(locale, { day:'2-digit', month:'short' })}
              </div>
              <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'1.2rem', letterSpacing:'0.1em' }}>VS</div>
              <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:'0.3rem' }}>
                {new Date(match.date).toLocaleTimeString(locale, { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          )}
        </div>

        <div>
          {match.awayTeam.logo && <img src={match.awayTeam.logo} alt="" style={{ width:52, height:52, objectFit:'contain', marginBottom:'0.5rem', filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
          <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'1.5rem', lineHeight:1.2 }}>{match.awayTeam.name}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'0.2rem' }}>{t('Visitante','Away')}</div>
        </div>
      </div>

      {match.venue && <div style={{ textAlign:'center', marginTop:'1.2rem', fontSize:'0.75rem', color:'var(--muted)' }}>📍 {match.venue}</div>}
    </div>
  );
}

export function MatchAnalysisPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [liveData, setLiveData] = useState<Partial<Match>|null>(null);
  const [formFilters, setFormFilters] = useState<{ home: string | null; away: string | null }>({ home: null, away: null });
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const match: Match|undefined  = location.state?.match;

  // Reset form filters when the analysed match changes
  useEffect(() => { setFormFilters({ home: null, away: null }); }, [match?.id]);

  // Live polling
  useEffect(() => {
    if (!match?.espnEventId) return;
    if (match.status === 'finished') return;
    const slug = match.sport === 'football'
      ? (FOOTBALL_LEAGUE_SLUGS[match.competition.id] ?? 'soccer/eng.1')
      : match.sport === 'tennis' ? (match.competition.id >= 31000 ? 'tennis/wta-singles' : 'tennis/atp-singles')
      : match.sport === 'basketball' ? 'basketball/nba'
      : null;
    if (!slug) return;
    const poll = async () => {
      const fresh = await fetchLiveMatchById(match.sport, slug, match.espnEventId!);
      if (fresh) setLiveData(fresh);
      if (fresh?.status === 'finished' && pollRef.current) clearInterval(pollRef.current);
    };
    poll();
    pollRef.current = setInterval(poll, 20_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [match?.id]);

  const generateAnalysis = async () => {
    if (!match) return;
    setLoading(true); setError('');
    try {
      let homeStats, awayStats;
      if (match.sport === 'football') {
        [homeStats, awayStats] = await Promise.all([
          fetchTeamStats(match.homeTeam.id, match.homeTeam.name, match.competition.id),
          fetchTeamStats(match.awayTeam.id, match.awayTeam.name, match.competition.id),
        ]);
      } else {
        [homeStats, awayStats] = await Promise.all([
          fetchNonFootballStats(match.homeTeam.id, match.homeTeam.name, match.sport),
          fetchNonFootballStats(match.awayTeam.id, match.awayTeam.name, match.sport),
        ]);
      }
      if (!homeStats || !awayStats) throw new Error('No stats');
      // Always use the match team names — stats from mock/API may have wrong names
      homeStats = { ...homeStats, team: { ...homeStats.team, name: match.homeTeam.name, shortName: match.homeTeam.shortName ?? match.homeTeam.name.slice(0, 3).toUpperCase() } };
      awayStats = { ...awayStats, team: { ...awayStats.team, name: match.awayTeam.name, shortName: match.awayTeam.shortName ?? match.awayTeam.name.slice(0, 3).toUpperCase() } };
      const result = await generateMatchAnalysis(match, homeStats, awayStats, user?.plan ?? 'free');
      setAnalysis(result);
    } catch { setError(t('Error al generar el análisis. Inténtalo de nuevo.', 'Error generating analysis. Please try again.')); }
    setLoading(false);
  };

  useEffect(() => {
    setAnalysis(null);
    setError('');
    if (match) generateAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id]);

  if (!match) return (
    <div style={{ textAlign:'center', padding:'4rem', color:'var(--muted)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>⚠️</div>
      <h3>{t('Match no encontrado','Match not found')}</h3>
      <button onClick={() => navigate('/matches')} className="btn btn-outline" style={{ marginTop:'1rem' }}>← {t('Volver','Back')}</button>
    </div>
  );

  const sport  = SPORT_CONFIG[match.sport as keyof typeof SPORT_CONFIG];
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';

  return (
    <div className="animate-fadeUp" style={{ maxWidth:1000, width:'100%' }}>
      <button onClick={() => navigate('/matches')} className="btn btn-ghost btn-sm" style={{ marginBottom:'1.2rem' }}>← {t('Volver a partidos','Back to matches')}</button>

      <LiveScoreboard match={match} liveData={liveData} />

      {loading && (
        <div className="glass" style={{ borderRadius:16, padding:'4rem', textAlign:'center' }}>
          <div className="animate-spin" style={{ display:'inline-block', width:40, height:40, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%', marginBottom:'1.5rem' }} />
          <h3 style={{ marginBottom:'0.5rem' }}>{t('Generando análisis IA...','Generating AI analysis...')}</h3>
          <p style={{ color:'var(--muted)', fontSize:'0.88rem' }}>{t(`Analizando ${match.homeTeam.name} vs ${match.awayTeam.name}`, `Analysing ${match.homeTeam.name} vs ${match.awayTeam.name}`)}</p>
        </div>
      )}

      {error && (
        <div style={{ padding:'1rem', background:'rgba(255,68,85,0.08)', border:'1px solid rgba(255,68,85,0.2)', borderRadius:12, color:'var(--red)', marginBottom:'1rem', display:'flex', gap:'1rem', alignItems:'center' }}>
          {error}<button onClick={generateAnalysis} className="btn btn-outline btn-sm">{t('Reintentar','Retry')}</button>
        </div>
      )}

      {analysis && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.2rem' }}>
          <div className="glass" style={{ borderRadius:16, padding:'1.5rem', borderLeft:'3px solid var(--gold)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h2 style={{ fontSize:'1rem' }}>🧠 {t('Análisis IA','AI Analysis')} — {match.homeTeam.name} vs {match.awayTeam.name}</h2>
              <span style={{ padding:'0.2rem 0.7rem', borderRadius:100, fontSize:'0.65rem', background:analysis.tier==='pro'?'var(--gold-dim)':'var(--card2)', color:analysis.tier==='pro'?'var(--gold)':'var(--muted)', border:analysis.tier==='pro'?'1px solid rgba(201,168,76,0.2)':'1px solid var(--border)' }}>
                {analysis.tier === 'pro' ? '⚡ Gemini Pro + Grounding' : 'Gemini Flash'}
              </span>
            </div>
            <p style={{ color:'var(--text2)', fontSize:'0.92rem', lineHeight:1.75, marginBottom:'1rem' }}>{analysis.aiSummary}</p>
            {user?.plan !== 'free' ? <p style={{ color:'var(--muted)', fontSize:'0.88rem', lineHeight:1.7 }}>{analysis.aiTechnical}</p> : (
              <div style={{ padding:'0.8rem 1rem', background:'var(--card2)', borderRadius:10, border:'1px solid var(--border)', fontSize:'0.82rem', color:'var(--muted)' }}>🔒 {t('Análisis técnico completo disponible en Plan Pro','Full technical analysis available on Pro Plan')}</div>
            )}
          </div>

          {analysis.prediction && (
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem', background:'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,255,136,0.04))', border:'1px solid rgba(0,212,255,0.25)', borderLeft:'3px solid var(--cyan)' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--cyan)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.6rem' }}>🔮 {t('Predicción del resultado','Result prediction')}</div>
              <p style={{ color:'var(--text)', fontSize:'0.92rem', lineHeight:1.7, margin:0 }}>{analysis.prediction}</p>
            </div>
          )}

          <div className="glass" style={{ borderRadius:16, padding:'1.5rem', background:'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(0,255,136,0.04))', border:'1px solid rgba(201,168,76,0.2)' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.8rem' }}>🎯 {t('Mejor apuesta recomendada','Best recommended bet')}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'1.2rem', marginBottom:'0.3rem' }}>{analysis.markets.bestBet.pick}</div>
                <div style={{ fontSize:'0.82rem', color:'var(--muted)' }}>{analysis.markets.bestBet.market}</div>
              </div>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'1.8rem', color:'var(--gold)' }}>@{analysis.markets.bestBet.odds}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{t('Cuota estimada','Estimated odds')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'1.8rem', color:confidenceColor(analysis.markets.bestBet.confidence) }}>{analysis.markets.bestBet.confidence}%</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{t('Confianza','Confidence')}</div>
                </div>
              </div>
            </div>
            <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginTop:'0.8rem', paddingTop:'0.8rem', borderTop:'1px solid var(--border)' }}>{analysis.markets.bestBet.reasoning}</p>
          </div>

          <div className="bet-markets-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.2rem' }}>
            {/* 1X2 — todos los deportes, sin Empate para basket/tenis */}
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>⚖️ {match.sport === 'football' ? t('Resultado 1X2','Result 1X2') : t('Ganador del partido','Match winner')}</h3>
              <MarketRow label={`${match.homeTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.home} recommendation="home" isRec={analysis.markets.result.recommendation==='home'} odds={analysis.markets.result.homeOdds} />
              {match.sport === 'football' && <MarketRow label={t('Empate','Draw')} prob={analysis.markets.result.draw} recommendation="draw" isRec={analysis.markets.result.recommendation==='draw'} odds={analysis.markets.result.drawOdds} />}
              <MarketRow label={`${match.awayTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.away} recommendation="away" isRec={analysis.markets.result.recommendation==='away'} odds={analysis.markets.result.awayOdds} />
            </div>

            {/* Over/Under — adaptado al deporte */}
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              {match.sport === 'football' ? (
                <>
                  <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📊 {t('Goles Over/Under','Goals Over/Under')}</h3>
                  <MarketRow label={t('Over 2.5 goles','Over 2.5 goals')} prob={analysis.markets.overUnder25.over} recommendation="over" isRec={analysis.markets.overUnder25.recommendation==='over'} odds={parseFloat((1/(analysis.markets.overUnder25.over/100)*0.92).toFixed(2))} />
                  <MarketRow label={t('Under 2.5 goles','Under 2.5 goals')} prob={analysis.markets.overUnder25.under} recommendation="under" isRec={analysis.markets.overUnder25.recommendation==='under'} />
                  <div style={{ height:1, background:'var(--border)', margin:'0.5rem 0' }} />
                  {user?.plan !== 'free' ? (
                    <><MarketRow label={t('Over 3.5 goles','Over 3.5 goals')} prob={analysis.markets.overUnder35.over} recommendation="over" isRec={analysis.markets.overUnder35.recommendation==='over'} /><MarketRow label={t('Under 3.5 goles','Under 3.5 goals')} prob={analysis.markets.overUnder35.under} recommendation="under" isRec={analysis.markets.overUnder35.recommendation==='under'} /></>
                  ) : <div style={{ padding:'0.6rem', textAlign:'center', fontSize:'0.75rem', color:'var(--muted)' }}>🔒 Over/Under 3.5 — Plan Pro</div>}
                </>
              ) : match.sport === 'basketball' ? (
                <>
                  <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📊 {t('Puntos Over/Under','Points Over/Under')}</h3>
                  <MarketRow label={t('Over 210.5 puntos','Over 210.5 points')} prob={analysis.markets.overUnder25.over} recommendation="over" isRec={analysis.markets.overUnder25.recommendation==='over'} odds={parseFloat((1/(analysis.markets.overUnder25.over/100)*0.92).toFixed(2))} />
                  <MarketRow label={t('Under 210.5 puntos','Under 210.5 points')} prob={analysis.markets.overUnder25.under} recommendation="under" isRec={analysis.markets.overUnder25.recommendation==='under'} />
                </>
              ) : match.sport === 'tennis' ? (
                <>
                  <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📊 {t('Sets Over/Under','Sets Over/Under')}</h3>
                  <MarketRow label={t('Over 2.5 sets','Over 2.5 sets')} prob={analysis.markets.overUnder25.over} recommendation="over" isRec={analysis.markets.overUnder25.recommendation==='over'} odds={parseFloat((1/(analysis.markets.overUnder25.over/100)*0.92).toFixed(2))} />
                  <MarketRow label={t('Under 2.5 sets','Under 2.5 sets')} prob={analysis.markets.overUnder25.under} recommendation="under" isRec={analysis.markets.overUnder25.recommendation==='under'} />
                </>
              ) : (
                <>
                  <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📊 {t('Probabilidades','Probabilities')}</h3>
                  <MarketRow label={`${match.homeTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.home} recommendation="home" isRec={analysis.markets.result.recommendation==='home'} odds={analysis.markets.result.homeOdds} />
                  <MarketRow label={`${match.awayTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.away} recommendation="away" isRec={analysis.markets.result.recommendation==='away'} odds={analysis.markets.result.awayOdds} />
                </>
              )}
            </div>

            {/* BTTS — solo fútbol; para otros deportes: Hándicap o info */}
            {match.sport === 'football' ? (
              <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
                <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>🥅 BTTS — {t('Ambos marcan','Both teams score')}</h3>
                <MarketRow label={t('BTTS — Sí','BTTS — Yes')} prob={analysis.markets.btts.yes} recommendation="yes" isRec={analysis.markets.btts.recommendation==='yes'} />
                <MarketRow label={t('BTTS — No','BTTS — No')} prob={analysis.markets.btts.no} recommendation="no" isRec={analysis.markets.btts.recommendation==='no'} />
              </div>
            ) : match.sport === 'basketball' ? (
              <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
                <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>🏀 {t('Totales y ventaja local','Totals & home advantage')}</h3>
                <div style={{ color:'var(--text2)', fontSize:'0.85rem', lineHeight:1.6 }}>
                  {[
                    { label: t('Total esperado','Expected total'), value: `${Math.round(analysis.homeStats.goalsScored + analysis.awayStats.goalsScored)} pts`, color: 'var(--gold)' },
                    { label: 'Over 210.5 hist.', value: `${Math.round((analysis.homeStats.over25 + analysis.awayStats.over25) / 2)}%`, color: 'var(--cyan)' },
                    { label: t('Factor cancha propia','Home court factor'), value: '+3–4 pts', color: 'var(--green)' },
                    { label: t('Diff. puntuación','Score differential'), value: `${(analysis.homeStats.goalsScored - analysis.awayStats.goalsScored) >= 0 ? '+' : ''}${(analysis.homeStats.goalsScored - analysis.awayStats.goalsScored).toFixed(1)} pts`, color: analysis.homeStats.goalsScored > analysis.awayStats.goalsScored ? 'var(--green)' : 'var(--red)' },
                  ].map(row => (
                    <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                      <span style={{ color:'var(--muted)' }}>{row.label}</span>
                      <span style={{ color:row.color, fontWeight:600 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : match.sport === 'tennis' ? (
              <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
                <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>🎾 {t('Partidos a 3 sets','3-set matches')}</h3>
                <MarketRow label={t('Más de 2.5 sets','Over 2.5 sets')} prob={analysis.markets.btts.yes} recommendation="yes" isRec={analysis.markets.btts.recommendation==='yes'} />
                <MarketRow label={t('2 sets exactos','Exactly 2 sets')} prob={analysis.markets.btts.no} recommendation="no" isRec={analysis.markets.btts.recommendation==='no'} />
              </div>
            ) : (
              <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
                <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📈 {t('Confianza del modelo','Model confidence')}</h3>
                <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
                  <div style={{ fontFamily:'Outfit', fontWeight:800, fontSize:'2.5rem', color:confidenceColor(Math.max(analysis.markets.result.home, analysis.markets.result.away)) }}>
                    {Math.max(analysis.markets.result.home, analysis.markets.result.away)}%
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginTop:'0.3rem' }}>{t('probabilidad de victoria del favorito','probability of favourite winning')}</div>
                </div>
              </div>
            )}

            {/* Hándicap */}
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>⚡ {t('Hándicap','Handicap')} ({analysis.markets.handicap.line > 0 ? '+' : ''}{analysis.markets.handicap.line})</h3>
              {user?.plan !== 'free' ? (
                <><MarketRow label={`${match.homeTeam.name} (${analysis.markets.handicap.line})`} prob={analysis.markets.handicap.home} recommendation="home" isRec={analysis.markets.handicap.recommendation==='home'} /><MarketRow label={`${match.awayTeam.name} (${analysis.markets.handicap.line>0?'-':'+'}${Math.abs(analysis.markets.handicap.line)})`} prob={analysis.markets.handicap.away} recommendation="away" isRec={analysis.markets.handicap.recommendation==='away'} /></>
              ) : <div style={{ padding:'2rem', textAlign:'center', color:'var(--muted)', fontSize:'0.85rem' }}>🔒 {t('Mercado de hándicap disponible en Plan Pro','Handicap market available on Pro Plan')}</div>}
            </div>
          </div>

          <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
            <h3 style={{ fontSize:'0.9rem', marginBottom:'1.2rem' }}>📋 {t('Forma reciente','Recent form')}</h3>
            <div className="bet-form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
              {([{ stats:analysis.homeStats, team:match.homeTeam, fk:'home' }, { stats:analysis.awayStats, team:match.awayTeam, fk:'away' }] as const).map(({ stats, team, fk }) => {
                const competitions = [...new Set(stats.form.map(f => f.competition).filter((c): c is string => !!c))];
                const isMultiComp  = competitions.length > 1;
                const active       = formFilters[fk];
                const visible      = active ? stats.form.filter(f => f.competition === active) : stats.form;
                const pillStyle = (on: boolean) => ({
                  padding:'0.12rem 0.45rem', borderRadius:99, fontSize:'0.66rem', fontWeight:600, cursor:'pointer',
                  border:'1px solid', transition:'all 0.15s', background: on ? 'var(--primary)' : 'transparent',
                  color: on ? '#fff' : 'var(--muted)', borderColor: on ? 'var(--primary)' : 'var(--border)',
                });
                return (
                <div key={team.id}>
                  <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'0.92rem', marginBottom:'0.6rem' }}>{team.name}</div>
                  {isMultiComp && (
                    <div style={{ display:'flex', gap:'0.3rem', marginBottom:'0.55rem', flexWrap:'wrap' }}>
                      <button style={pillStyle(!active)} onClick={() => setFormFilters(p => ({ ...p, [fk]: null }))}>{t('Todas','All')}</button>
                      {competitions.map(c => (
                        <button key={c} style={pillStyle(active === c)} onClick={() => setFormFilters(p => ({ ...p, [fk]: c }))}>{c}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.6rem' }}>{visible.map((f, i) => <FormBadge key={i} result={f.result} />)}</div>
                  {visible.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.15rem', marginBottom:'0.8rem' }}>
                      {visible.map((f, i) => (
                        <div key={i} style={{ fontSize:'0.72rem', color:'var(--muted)', display:'flex', gap:'0.4rem', alignItems:'center' }}>
                          <FormBadge result={f.result} />
                          <span style={{ color:'var(--text2)' }}>{f.isHome ? t('vs','vs') : t('en','@')} {f.opponent}</span>
                          {isMultiComp && !active && f.competition && (
                            <span style={{ fontSize:'0.64rem', color:'var(--muted)', opacity:0.65, whiteSpace:'nowrap' }}>({f.competition})</span>
                          )}
                          <span style={{ marginLeft:'auto' }}>{f.goalsFor}-{f.goalsAgainst}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {(match.sport === 'football' ? [
                      { label:t('Goles/partido','Goals/match'), value:stats.goalsScored.toFixed(1), color:'var(--green)' },
                      { label:t('Encajados/partido','Conceded/match'), value:stats.goalsConceded.toFixed(1), color:'var(--red)' },
                      { label:'BTTS hist.', value:`${stats.btts}%`, color:'var(--cyan)' },
                      { label:'Over 2.5 hist.', value:`${stats.over25}%`, color:'var(--gold)' },
                    ] : match.sport === 'basketball' ? [
                      { label:t('Pts anotados/partido','Points scored/match'), value:stats.goalsScored.toFixed(0), color:'var(--green)' },
                      { label:t('Pts encajados/partido','Points allowed/match'), value:stats.goalsConceded.toFixed(0), color:'var(--red)' },
                      { label:t('Diferencial','Differential'), value:`${(stats.goalsScored - stats.goalsConceded) >= 0 ? '+' : ''}${(stats.goalsScored - stats.goalsConceded).toFixed(1)}`, color:(stats.goalsScored - stats.goalsConceded) >= 0 ? 'var(--green)' : 'var(--red)' },
                      { label:'Hist. +210.5', value:`${stats.over25}%`, color:'var(--gold)' },
                    ] : match.sport === 'tennis' ? [
                      { label:t('% victorias','Win rate'), value:`${stats.form.length ? Math.round(stats.form.filter(f=>f.result==='W').length/stats.form.length*100) : 0}%`, color:'var(--green)' },
                      { label:t('Victorias','Wins'), value:`${stats.form.filter(f=>f.result==='W').length}/${stats.form.length}`, color:'var(--cyan)' },
                      { label:t('Hist. 3 sets','Hist. 3 sets'), value:`${stats.over25}%`, color:'var(--gold)' },
                    ] : [
                      { label:t('% victorias','Win rate'), value:`${stats.form.length ? Math.round(stats.form.filter(f=>f.result==='W').length/stats.form.length*100) : 0}%`, color:'var(--green)' },
                      { label:t('Victorias','Wins'), value:`${stats.form.filter(f=>f.result==='W').length}/${stats.form.length}`, color:'var(--cyan)' },
                    ]).map(item => (
                      <div key={item.label} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}>
                        <span style={{ color:'var(--muted)' }}>{item.label}</span>
                        <span style={{ color:item.color, fontWeight:500 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
              })}
            </div>
            {/* Form legend */}
            <div style={{ display:'flex', gap:'1rem', marginTop:'1.2rem', paddingTop:'1rem', borderTop:'1px solid var(--border)', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.72rem', color:'var(--muted)', marginRight:'0.3rem' }}>{t('Leyenda:','Legend:')}</span>
              {[
                { r:'W' as const, label: t('Victoria','Win') },
                { r:'D' as const, label: t('Empate','Draw') },
                { r:'L' as const, label: t('Derrota','Loss') },
              ].map(({ r, label }) => (
                <span key={r} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'var(--muted)' }}>
                  <FormBadge result={r} /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="bet-markets-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.2rem' }}>
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>🔑 {t('Factores clave','Key factors')}</h3>
              {analysis.keyFactors.map((f, i) => <div key={i} style={{ display:'flex', gap:'0.6rem', marginBottom:'0.6rem', fontSize:'0.85rem' }}><span style={{ color:'var(--green)', fontWeight:700, flexShrink:0 }}>✓</span><span style={{ color:'var(--text2)' }}>{f}</span></div>)}
            </div>
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>⚠️ {t('Factores de riesgo','Risk factors')}</h3>
              {analysis.risks.map((r, i) => <div key={i} style={{ display:'flex', gap:'0.6rem', marginBottom:'0.6rem', fontSize:'0.85rem' }}><span style={{ color:'var(--orange)', fontWeight:700, flexShrink:0 }}>!</span><span style={{ color:'var(--text2)' }}>{r}</span></div>)}
            </div>
          </div>

          <div style={{ padding:'1rem 1.2rem', background:'var(--card2)', borderRadius:12, border:'1px solid var(--border)', fontSize:'0.78rem', color:'var(--muted)', lineHeight:1.6 }}>
            ⚠️ <strong style={{ color:'var(--text2)' }}>{t('Aviso legal:','Disclaimer:')} </strong>
            {t('Este análisis es de carácter informativo y no constituye asesoramiento de apuestas. Las predicciones son estimaciones estadísticas. Apostar conlleva riesgo de pérdida económica. Juega con responsabilidad.','This analysis is for informational purposes only and does not constitute betting advice. Predictions are statistical estimates. Betting involves risk of financial loss. Please gamble responsibly.')}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Competitions for the wizard (football, in priority order) ──
const WIZARD_FOOTBALL_COMPS = [
  { id: '2',   name: 'Champions League', emoji: '🏆' },
  { id: '3',   name: 'Europa League',    emoji: '🟠' },
  { id: '140', name: 'LaLiga',           emoji: '🇪🇸' },
  { id: '141', name: 'Segunda División', emoji: '🇪🇸' },
  { id: '135', name: 'Serie A',          emoji: '🇮🇹' },
  { id: '136', name: 'Serie B',          emoji: '🇮🇹' },
  { id: '78',  name: 'Bundesliga',       emoji: '🇩🇪' },
  { id: '79',  name: '2. Bundesliga',    emoji: '🇩🇪' },
  { id: '39',  name: 'Premier League',   emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: '40',  name: 'Championship',     emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: '61',  name: 'Ligue 1',          emoji: '🇫🇷' },
  { id: '94',  name: 'Primeira Liga',    emoji: '🇵🇹' },
  { id: '128', name: 'Liga Argentina',   emoji: '🇦🇷' },
  { id: '262', name: 'Liga MX',          emoji: '🇲🇽' },
];

type WizardComp = typeof WIZARD_FOOTBALL_COMPS[number];

// ── 3-step wizard modal ──
function AnalysisWizardModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { lang } = useLang();

  const [step, setStep]         = useState<1 | 2 | 3>(1);
  const [selSport, setSelSport] = useState('');
  const [selComp, setSelComp]   = useState<WizardComp | null>(null);
  const [matches, setMatches]   = useState<Match[]>([]);
  const [loading, setLoading]   = useState(false);

  const loadMatches = async (sport: string, compId?: string) => {
    setLoading(true);
    let results: Match[] = [];
    if (sport === 'football' && compId) {
      results = await fetchWeekMatches(parseInt(compId));
    } else if (sport === 'tennis') {
      results = await fetchTennisMatches();
    } else if (sport === 'basketball') {
      results = await fetchBasketballMatches();
    } else if (sport === 'f1') {
      results = await fetchF1Matches();
    } else if (sport === 'golf') {
      results = await fetchGolfMatches();
    }
    // Upcoming/live first, then played
    setMatches(results.sort((a, b) => {
      if (a.status !== 'finished' && b.status === 'finished') return -1;
      if (a.status === 'finished' && b.status !== 'finished') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }));
    setLoading(false);
  };

  const handleSport = (sport: string) => {
    setSelSport(sport);
    if (sport === 'football') { setStep(2); }
    else { setStep(3); loadMatches(sport); }
  };

  const handleComp = (comp: WizardComp) => {
    setSelComp(comp);
    setStep(3);
    loadMatches('football', comp.id);
  };

  const handleMatch = (match: Match) => {
    onClose();
    navigate(`/matches/${match.id}`, { state: { match } });
  };

  const goBack = () => {
    if (step === 3 && selSport === 'football') { setStep(2); setMatches([]); }
    else { setStep(1); setSelSport(''); setSelComp(null); setMatches([]); }
  };

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.7rem',
    padding: '0.8rem 1rem', borderRadius: 12, cursor: 'pointer',
    minHeight: 48,   // good touch target on mobile
    background: 'var(--card2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '0.88rem', fontWeight: 500,
    transition: 'border-color 0.2s, background 0.2s', width: '100%',
    WebkitTapHighlightColor: 'transparent',   // remove default tap flash on iOS
  };

  return (
    // Backdrop — intentionally no onClick to prevent accidental close
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,8,16,0.9)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(0.4rem, 4vw, 1rem)',   // tighter on small screens
    }}>
      <div style={{
        background: 'var(--nav-bg)', border: '1px solid var(--border)',
        borderRadius: 'clamp(14px, 4vw, 22px)', padding: 'clamp(1.2rem, 4vw, 1.8rem)',
        width: '100%', maxWidth: 440,
        position: 'relative',
        // flex column so the scrollable step div can grow/shrink correctly
        display: 'flex', flexDirection: 'column',
        maxHeight: 'min(85vh, 640px)',
        animation: 'slideDown 0.22s ease both',
        overscrollBehavior: 'contain',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {step > 1
            ? <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}>
                ← {lang === 'es' ? 'Volver' : 'Back'}
              </button>
            : <span />}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1, padding: '0.2rem' }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= s ? 'var(--gold)' : 'var(--border)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* ── STEP 1: Sport ── */}
        {step === 1 && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧠</div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>
                {lang === 'es' ? '¿Qué quieres analizar?' : 'What do you want to analyse?'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {lang === 'es' ? 'Paso 1 de 3 — Elige el deporte' : 'Step 1 of 3 — Choose a sport'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
                <button
                  key={key} onClick={() => handleSport(key)}
                  style={btnBase}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = cfg.color; (e.currentTarget as HTMLElement).style.background = `${cfg.color}12`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--card2)'; }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{cfg.emoji}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{cfg.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Competition (football only) ── */}
        {step === 2 && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>⚽</div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                {lang === 'es' ? '¿Qué competición?' : 'Which competition?'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {lang === 'es' ? 'Paso 2 de 3 — Elige la liga' : 'Step 2 of 3 — Choose a league'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {WIZARD_FOOTBALL_COMPS.map(comp => (
                <button
                  key={comp.id} onClick={() => handleComp(comp)}
                  style={btnBase}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  <span>{comp.emoji}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{comp.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Match ── */}
        {step === 3 && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
              {selComp && <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{selComp.emoji}</div>}
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                {lang === 'es' ? '¿Qué partido?' : 'Which match?'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {lang === 'es' ? 'Paso 3 de 3 — Selecciona el partido' : 'Step 3 of 3 — Select a match'}
                {selComp ? ` · ${selComp.name}` : selSport ? ` · ${SPORT_CONFIG[selSport as keyof typeof SPORT_CONFIG]?.label ?? selSport}` : ''}
              </p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 58, borderRadius: 10, background: 'var(--card2)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                {lang === 'es' ? 'No hay partidos disponibles esta semana.' : 'No matches available this week.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {matches.map(match => {
                  const d = new Date(match.date);
                  const dateStr = d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' });
                  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
                  return (
                    <button
                      key={match.id} onClick={() => handleMatch(match)}
                      style={{ ...btnBase, padding: '0.7rem 0.9rem' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--card2)'; }}
                    >
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                          {match.homeTeam.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>vs</span> {match.awayTeam.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                          {dateStr} · {timeStr}
                        </div>
                      </div>
                      {match.status === 'live' && (
                        <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 100, background: 'rgba(255,68,85,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,85,0.25)', animation: 'pulse 2s infinite', flexShrink: 0 }}>
                          🔴 {lang === 'es' ? 'VIVO' : 'LIVE'}
                        </span>
                      )}
                      {match.status === 'finished' && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
                          {match.homeScore ?? 0}–{match.awayScore ?? 0}
                        </span>
                      )}
                      <span style={{ color: 'var(--gold)', fontSize: '0.78rem', flexShrink: 0 }}>→</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AnalysisPage() {
  const [open, setOpen] = useState(true);
  const { t } = useLang();

  return (
    <>
      {open && <AnalysisWizardModal onClose={() => setOpen(false)} />}

      {/* Background page — blurred/dim while modal is open */}
      <div
        className="animate-fadeUp"
        style={{
          maxWidth: 1100, width: '100%',
          opacity: open ? 0.12 : 1,
          pointerEvents: open ? 'none' : 'auto',
          filter: open ? 'blur(3px)' : 'none',
          transition: 'opacity 0.2s, filter 0.2s',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🧠 {t('Análisis IA', 'AI Analysis')}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {t('Selecciona un partido para generar el análisis completo.', 'Select a match to generate the full analysis.')}
          </p>
        </div>
        <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
          <button onClick={() => setOpen(true)} className="btn btn-gold btn-lg">
            📅 {t('Ver partidos disponibles', 'View available matches')}
          </button>
        </div>
      </div>
    </>
  );
}
