import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchTeamStats, getMockStatsBySport, fetchLiveMatchById } from '../../services/sportsService';
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
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const match: Match|undefined  = location.state?.match;

  // Live polling
  useEffect(() => {
    if (!match?.espnEventId) return;
    if (match.status === 'finished') return;
    const slug = match.sport === 'football'
      ? (FOOTBALL_LEAGUE_SLUGS[match.competition.id] ?? 'soccer/eng.1')
      : match.sport === 'tennis' ? 'tennis/atp'
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
          fetchTeamStats(match.homeTeam.id, match.competition.id),
          fetchTeamStats(match.awayTeam.id, match.competition.id),
        ]);
      } else {
        homeStats = getMockStatsBySport(match.homeTeam.id, match.homeTeam.name, match.sport);
        awayStats = getMockStatsBySport(match.awayTeam.id, match.awayTeam.name, match.sport);
      }
      if (!homeStats || !awayStats) throw new Error('No stats');
      const result = await generateMatchAnalysis(match, homeStats, awayStats, user?.plan ?? 'free');
      setAnalysis(result);
    } catch { setError(t('Error al generar el análisis. Inténtalo de nuevo.', 'Error generating analysis. Please try again.')); }
    setLoading(false);
  };

  useEffect(() => { if (match) generateAnalysis(); }, []);

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
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>⚖️ {t('Resultado 1X2','Result 1X2')}</h3>
              <MarketRow label={`${match.homeTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.home} recommendation="home" isRec={analysis.markets.result.recommendation==='home'} odds={analysis.markets.result.homeOdds} />
              <MarketRow label={t('Empate','Draw')} prob={analysis.markets.result.draw} recommendation="draw" isRec={analysis.markets.result.recommendation==='draw'} odds={analysis.markets.result.drawOdds} />
              <MarketRow label={`${match.awayTeam.name} ${t('gana','wins')}`} prob={analysis.markets.result.away} recommendation="away" isRec={analysis.markets.result.recommendation==='away'} odds={analysis.markets.result.awayOdds} />
            </div>
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>📊 {t('Goles Over/Under','Goals Over/Under')}</h3>
              <MarketRow label={t('Over 2.5 goles','Over 2.5 goals')} prob={analysis.markets.overUnder25.over} recommendation="over" isRec={analysis.markets.overUnder25.recommendation==='over'} odds={parseFloat((1/(analysis.markets.overUnder25.over/100)*0.92).toFixed(2))} />
              <MarketRow label={t('Under 2.5 goles','Under 2.5 goals')} prob={analysis.markets.overUnder25.under} recommendation="under" isRec={analysis.markets.overUnder25.recommendation==='under'} />
              <div style={{ height:1, background:'var(--border)', margin:'0.5rem 0' }} />
              {user?.plan !== 'free' ? (
                <><MarketRow label={t('Over 3.5 goles','Over 3.5 goals')} prob={analysis.markets.overUnder35.over} recommendation="over" isRec={analysis.markets.overUnder35.recommendation==='over'} /><MarketRow label={t('Under 3.5 goles','Under 3.5 goals')} prob={analysis.markets.overUnder35.under} recommendation="under" isRec={analysis.markets.overUnder35.recommendation==='under'} /></>
              ) : <div style={{ padding:'0.6rem', textAlign:'center', fontSize:'0.75rem', color:'var(--muted)' }}>🔒 Over/Under 3.5 — Plan Pro</div>}
            </div>
            <div className="glass" style={{ borderRadius:16, padding:'1.5rem' }}>
              <h3 style={{ fontSize:'0.9rem', marginBottom:'1rem' }}>🥅 BTTS</h3>
              <MarketRow label={t('BTTS — Sí','BTTS — Yes')} prob={analysis.markets.btts.yes} recommendation="yes" isRec={analysis.markets.btts.recommendation==='yes'} />
              <MarketRow label={t('BTTS — No','BTTS — No')} prob={analysis.markets.btts.no} recommendation="no" isRec={analysis.markets.btts.recommendation==='no'} />
            </div>
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
              {[{ stats:analysis.homeStats, team:match.homeTeam }, { stats:analysis.awayStats, team:match.awayTeam }].map(({ stats, team }) => (
                <div key={team.id}>
                  <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'0.92rem', marginBottom:'0.8rem' }}>{team.name}</div>
                  <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1rem' }}>{stats.form.map((f, i) => <FormBadge key={i} result={f.result} />)}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {[
                      { label:t('Goles/partido','Goals/match'), value:stats.goalsScored.toFixed(1), color:'var(--green)' },
                      { label:t('Encajados/partido','Conceded/match'), value:stats.goalsConceded.toFixed(1), color:'var(--red)' },
                      { label:'BTTS hist.', value:`${stats.btts}%`, color:'var(--cyan)' },
                      { label:'Over 2.5 hist.', value:`${stats.over25}%`, color:'var(--gold)' },
                    ].map(item => (
                      <div key={item.label} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}>
                        <span style={{ color:'var(--muted)' }}>{item.label}</span>
                        <span style={{ color:item.color, fontWeight:500 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
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

export function AnalysisPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  return (
    <div className="animate-fadeUp" style={{ maxWidth:1100, width:'100%' }}>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>🧠 {t('Análisis IA','AI Analysis')}</h1>
        <p style={{ color:'var(--muted)', fontSize:'0.88rem' }}>{t('Selecciona un partido desde la sección de Partidos para generar el análisis completo.','Select a match from the Matches section to generate the full analysis.')}</p>
      </div>
      <div className="glass" style={{ borderRadius:16, padding:'4rem', textAlign:'center' }}>
        <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>🧠</div>
        <h2 style={{ marginBottom:'0.8rem' }}>{t('Motor de predicción listo','Prediction engine ready')}</h2>
        <p style={{ color:'var(--muted)', maxWidth:400, margin:'0 auto 2rem', lineHeight:1.7 }}>
          {t('Ve a Partidos, elige un enfrentamiento y genera el análisis completo con probabilidades, cuotas estimadas y la mejor apuesta del día.','Go to Matches, pick a game and generate the full analysis with probabilities, estimated odds and the best bet of the day.')}
        </p>
        <button onClick={() => navigate('/matches')} className="btn btn-gold btn-lg">📅 {t('Ver partidos disponibles','View available matches')}</button>
      </div>
    </div>
  );
}
