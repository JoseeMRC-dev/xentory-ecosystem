import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

// ── TYPES ─────────────────────────────────────────────────────────
type VideoStatus = 'draft' | 'generating' | 'ready' | 'approved' | 'rejected' | 'publishing' | 'published' | 'failed';
type VideoType   = 'promo' | 'signal' | 'educational';
type Platform    = 'instagram' | 'tiktok';

interface ContentVideo {
  id: string;
  title: string;
  video_type: VideoType;
  language: string;
  duration_sec: number;
  script: string | null;
  visual_prompt: string | null;
  caption: string | null;
  hashtags: string[];
  video_url: string | null;
  status: VideoStatus;
  platforms: Platform[];
  publish_results: Record<string, { success: boolean; post_id?: string; error?: string }>;
  error_message: string | null;
  created_at: string;
  published_at: string | null;
}

interface SocialAccount {
  id: string;
  platform: Platform;
  account_id: string;
  account_name: string | null;
}

// ── SVG ICONS ─────────────────────────────────────────────────────
const FilmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const Spinner = ({ size = 16 }: { size?: number }) => (
  <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid currentColor`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
);

// ── STATUS CONFIG ──────────────────────────────────────────────────
const STATUS_LABEL: Record<VideoStatus, { es: string; en: string; color: string; bg: string }> = {
  draft:      { es: 'Borrador',    en: 'Draft',      color: 'var(--muted)',   bg: 'var(--card2)' },
  generating: { es: 'Generando',  en: 'Generating', color: '#d97706',        bg: 'rgba(217,119,6,0.1)' },
  ready:      { es: 'Listo',      en: 'Ready',      color: '#2563eb',        bg: 'rgba(37,99,235,0.1)' },
  approved:   { es: 'Aprobado',   en: 'Approved',   color: 'var(--green)',   bg: 'rgba(0,200,122,0.1)' },
  rejected:   { es: 'Rechazado',  en: 'Rejected',   color: 'var(--red)',     bg: 'rgba(240,68,88,0.1)' },
  publishing: { es: 'Publicando', en: 'Publishing', color: '#7c3aed',        bg: 'rgba(124,58,237,0.1)' },
  published:  { es: 'Publicado',  en: 'Published',  color: 'var(--green)',   bg: 'rgba(0,200,122,0.12)' },
  failed:     { es: 'Error',      en: 'Failed',     color: 'var(--red)',     bg: 'rgba(240,68,88,0.1)' },
};

const TYPE_LABEL: Record<VideoType, { es: string; en: string }> = {
  promo:       { es: 'Promocional',  en: 'Promo'       },
  signal:      { es: 'Señal',        en: 'Signal'      },
  educational: { es: 'Educativo',    en: 'Educational' },
};

// ── HELPERS ────────────────────────────────────────────────────────
function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────
export function StudioPage() {
  const { user }        = useAuth();
  const { lang, t: _t } = useLang();
  const t = (es: string, en: string) => lang === 'es' ? es : en;

  const [videos,    setVideos]    = useState<ContentVideo[]>([]);
  const [accounts,  setAccounts]  = useState<SocialAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showNewModal,     setShowNewModal]     = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [previewVideo,     setPreviewVideo]     = useState<ContentVideo | null>(null);
  const [publishVideo,     setPublishVideo]     = useState<ContentVideo | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load data ────────────────────────────────────────────────────
  const loadVideos = useCallback(async () => {
    const { data, error } = await supabase
      .from('content_videos')
      .select()
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    setVideos((data as ContentVideo[]) ?? []);
  }, []);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from('social_accounts').select('id, platform, account_id, account_name');
    setAccounts((data as SocialAccount[]) ?? []);
  }, []);

  useEffect(() => {
    let settled = false;
    const finish = (err?: string) => {
      if (settled) return;
      settled = true;
      if (err) setLoadError(err);
      setLoading(false);
    };

    // Safety timeout — if tables don't exist or network hangs, stop spinner after 8s
    const timer = setTimeout(
      () => finish('Tiempo de espera agotado. Aplica la migración 009_video_pipeline.sql en Supabase SQL Editor.'),
      8000,
    );

    Promise.all([loadVideos(), loadAccounts()])
      .catch((err: Error) => finish(err?.message ?? 'Error loading studio'))
      .then(() => finish())
      .finally(() => clearTimeout(timer));

    return () => { settled = true; clearTimeout(timer); };
  }, [loadVideos, loadAccounts]);

  // ── Poll generating videos ────────────────────────────────────────
  const checkOne = useCallback(async (videoId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', video_id: videoId }),
      });
      const { video } = await res.json();
      if (video) setVideos(prev => prev.map(p => p.id === video.id ? video : p));
    } catch { /* ignore */ }
  }, []);

  const checkGenerating = useCallback(async (vids: ContentVideo[]) => {
    const generating = vids.filter(v => v.status === 'generating');
    if (!generating.length) return;
    await Promise.all(generating.map(v => checkOne(v.id)));
  }, [checkOne]);

  useEffect(() => {
    const hasGenerating = videos.some(v => v.status === 'generating');
    if (hasGenerating && !pollingRef.current) {
      pollingRef.current = setInterval(() => checkGenerating(videos), 30_000);
    } else if (!hasGenerating && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [videos, checkGenerating]);

  // ── Actions ───────────────────────────────────────────────────────
  const approve = async (id: string) => {
    await supabase.from('content_videos').update({ status: 'approved' }).eq('id', id);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
  };

  const reject = async (id: string) => {
    await supabase.from('content_videos').update({ status: 'rejected' }).eq('id', id);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v));
  };

  const deleteVideo = async (id: string) => {
    await supabase.from('content_videos').delete().eq('id', id);
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
        .stu-card:hover .stu-card-actions { opacity: 1; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: 'calc(var(--nav-h) + 2rem) clamp(1rem,4vw,2.5rem) 4rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--gold)' }}><FilmIcon /></span>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem,4vw,1.9rem)', fontWeight: 700 }}>
                {t('Content Studio', 'Content Studio')}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
              {t('Genera vídeos de marketing con IA y publícalos en Instagram y TikTok',
                 'Generate AI marketing videos and publish them to Instagram and TikTok')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowConnectModal(true)} className="btn btn-outline btn-sm" style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
              <LinkIcon /> {t('Cuentas', 'Accounts')}
              {accounts.length > 0 && (
                <span style={{ background: 'var(--green)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 99 }}>
                  {accounts.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowNewModal(true)} className="btn btn-gold btn-sm" style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
              <PlusIcon /> {t('Nuevo vídeo', 'New video')}
            </button>
          </div>
        </div>

        {/* ── Video grid ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={28} /></div>
        ) : loadError ? (
          <div style={{ padding: '2rem', color: '#b91c1c', background: '#fef2f2', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
            {t('Error al cargar los vídeos', 'Error loading videos')}: {loadError}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState onNew={() => setShowNewModal(true)} lang={lang} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
            {videos.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                lang={lang}
                onApprove={() => approve(v.id)}
                onReject={() => reject(v.id)}
                onDelete={() => deleteVideo(v.id)}
                onPreview={() => setPreviewVideo(v)}
                onPublish={() => setPublishVideo(v)}
                onCheck={() => checkOne(v.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showNewModal     && <NewVideoModal onClose={() => setShowNewModal(false)} onCreated={(v) => { setVideos(prev => [v, ...prev]); setShowNewModal(false); }} lang={lang} />}
      {showConnectModal && <ConnectAccountModal accounts={accounts} onClose={() => setShowConnectModal(false)} onSaved={loadAccounts} lang={lang} />}
      {previewVideo     && <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} lang={lang} />}
      {publishVideo     && <PublishModal video={publishVideo} accounts={accounts} onClose={() => setPublishVideo(null)} onPublished={(v) => { setVideos(prev => prev.map(p => p.id === v.id ? v : p)); setPublishVideo(null); }} lang={lang} />}
    </>
  );
}

// ── EMPTY STATE ────────────────────────────────────────────────────
function EmptyState({ onNew, lang }: { onNew: () => void; lang: string }) {
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎬</div>
      <h2 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>
        {t('Sin vídeos todavía', 'No videos yet')}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.5rem', maxWidth: 340, margin: '0 auto 1.5rem' }}>
        {t('Genera tu primer vídeo de marketing con IA. Elige el tipo, idioma y duración — el resto lo hace la IA.',
           'Generate your first AI marketing video. Choose the type, language and duration — the AI does the rest.')}
      </p>
      <button onClick={onNew} className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <PlusIcon /> {t('Crear primer vídeo', 'Create first video')}
      </button>
    </div>
  );
}

// ── VIDEO CARD ─────────────────────────────────────────────────────
function VideoCard({
  video, lang, onApprove, onReject, onDelete, onPreview, onPublish, onCheck,
}: {
  video: ContentVideo;
  lang: string;
  onApprove: () => void;
  onReject:  () => void;
  onDelete:  () => void;
  onPreview: () => void;
  onPublish: () => void;
  onCheck:   () => void;
}) {
  const [checking, setChecking] = useState(false);
  const handleCheck = async () => { setChecking(true); await onCheck(); setChecking(false); };
  const t  = (es: string, en: string) => lang === 'es' ? es : en;
  const st = STATUS_LABEL[video.status];
  const tp = TYPE_LABEL[video.video_type];

  return (
    <div className="stu-card glass-2" style={{
      borderRadius: 16, border: '1px solid var(--border2)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Thumbnail / status area */}
      <div style={{
        height: 160, background: 'var(--bg3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        cursor: video.video_url ? 'pointer' : 'default',
      }} onClick={video.video_url ? onPreview : undefined}>
        {video.video_url ? (
          <>
            <video src={video.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                <PlayIcon />
              </div>
            </div>
          </>
        ) : video.status === 'generating' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', color: 'var(--muted)' }}>
            <Spinner size={28} />
            <span style={{ fontSize: '0.78rem' }}>{t('Generando vídeo…', 'Generating video…')}</span>
            <button onClick={handleCheck} disabled={checking} style={{
              fontSize: '0.72rem', padding: '0.3rem 0.8rem', borderRadius: 99,
              border: '1px solid var(--border2)', background: 'var(--card2)',
              cursor: checking ? 'default' : 'pointer', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              {checking ? <Spinner size={10} /> : '↻'} {t('Actualizar', 'Refresh')}
            </button>
          </div>
        ) : (
          <div style={{ color: 'var(--border2)', opacity: 0.6 }}><FilmIcon /></div>
        )}

        {/* Status pill overlay */}
        <span style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: 99,
          background: st.bg, color: st.color, backdropFilter: 'blur(4px)',
        }}>
          {st[lang === 'es' ? 'es' : 'en']}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3 }}>{video.title}</h3>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.1rem', flexShrink: 0 }} title={t('Eliminar', 'Delete')}>
            <TrashIcon />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <Chip>{tp[lang === 'es' ? 'es' : 'en']}</Chip>
          <Chip>{video.language.toUpperCase()}</Chip>
          <Chip>{video.duration_sec}s</Chip>
        </div>

        {video.caption && (
          <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'] }}>
            {video.caption}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
          {fmtDate(video.created_at, lang)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {video.status === 'ready' && (
          <>
            <button onClick={onApprove} className="btn btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(0,200,122,0.12)', color: 'var(--green)', border: '1px solid rgba(0,200,122,0.25)', borderRadius: 8 }}>
              <CheckIcon /> {t('Aprobar', 'Approve')}
            </button>
            <button onClick={onReject} className="btn btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(240,68,88,0.08)', color: 'var(--red)', border: '1px solid rgba(240,68,88,0.2)', borderRadius: 8 }}>
              <XIcon /> {t('Rechazar', 'Reject')}
            </button>
          </>
        )}
        {video.status === 'approved' && (
          <button onClick={onPublish} className="btn btn-gold btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <SendIcon /> {t('Publicar', 'Publish')}
          </button>
        )}
        {video.status === 'published' && (
          <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckIcon />
            {(video.platforms ?? []).join(' + ') || t('Publicado', 'Published')}
            {video.published_at ? ` · ${fmtDate(video.published_at, lang)}` : ''}
          </div>
        )}
        {video.status === 'failed' && video.error_message && (
          <div style={{ flex: 1, fontSize: '0.72rem', color: 'var(--red)', lineHeight: 1.3 }}>
            {video.error_message.slice(0, 200)}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.5rem', borderRadius: 99, background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
      {children}
    </span>
  );
}

// ── NEW VIDEO MODAL ────────────────────────────────────────────────
function NewVideoModal({
  onClose, onCreated, lang,
}: {
  onClose:   () => void;
  onCreated: (v: ContentVideo) => void;
  lang:      string;
}) {
  const t = (es: string, en: string) => lang === 'es' ? es : en;

  const VOICES = [
    { id: 'XrExE9yKIg1WjnnlVkGX', es: 'Matilda',   en: 'Matilda',  desc: 'Femenina · cálida',     descEn: 'Female · warm'        },
    { id: 'onwK4e9ZLuTAKqWW03F9', es: 'Daniel',    en: 'Daniel',   desc: 'Masculina · profesional', descEn: 'Male · professional'  },
    { id: 'XB0fDUnXU5powFXDhCwa', es: 'Charlotte', en: 'Charlotte',desc: 'Femenina · elegante',    descEn: 'Female · elegant'     },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', es: 'Liam',      en: 'Liam',     desc: 'Masculina · enérgica',   descEn: 'Male · energetic'     },
    { id: 'ErXwobaYiN019PkySvjV', es: 'Antoni',    en: 'Antoni',   desc: 'Masculina · suave',      descEn: 'Male · smooth'        },
  ];

  const [videoType,    setVideoType]    = useState<VideoType>('promo');
  const [language,     setLanguage]     = useState(lang);
  const [durationSec,  setDurationSec]  = useState(30);
  const [title,        setTitle]        = useState('');
  const [withNarration, setWithNarration] = useState(false);
  const [voiceId,      setVoiceId]      = useState(VOICES[0].id);
  const [userBrief,    setUserBrief]    = useState('');
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-video`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', video_type: videoType, language, duration_sec: durationSec, title: title.trim() || undefined, with_narration: withNarration, voice_id: withNarration ? voiceId : undefined, user_brief: userBrief.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.video) {
        const detail = typeof data.detail === 'string' ? `: ${data.detail}` : '';
        throw new Error((data.error ?? 'Failed to start generation') + detail);
      }
      onCreated(data.video as ContentVideo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const types: { value: VideoType; es: string; en: string; emoji: string }[] = [
    { value: 'promo',       emoji: '🚀', es: 'Promocional',  en: 'Promotional' },
    { value: 'signal',      emoji: '📈', es: 'Señal IA',     en: 'AI Signal'   },
    { value: 'educational', emoji: '🎓', es: 'Educativo',    en: 'Educational' },
  ];

  return (
    <Overlay onClose={onClose}>
      <Popup title={t('Nuevo vídeo', 'New video')} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Title */}
          <Field label={t('Título (opcional)', 'Title (optional)')}>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t('Ej: Xentory — El futuro del análisis', 'E.g. Xentory — The Future of Analysis')}
              style={inputStyle} maxLength={80}
            />
          </Field>

          {/* User brief */}
          <Field label={t('Tu idea / Directrices (opcional)', 'Your idea / Direction (optional)')}>
            <textarea
              value={userBrief} onChange={e => setUserBrief(e.target.value)}
              placeholder={t(
                'Ej: Quiero transmitir confianza y exclusividad. Mostrar datos financieros en movimiento con un estilo muy cinematográfico y oscuro. Enfocado en traders profesionales.',
                'E.g. I want to convey trust and exclusivity. Show financial data in motion with a very cinematic, dark style. Targeted at professional traders.',
              )}
              rows={3} maxLength={500}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'right', marginTop: '0.15rem' }}>
              {userBrief.length}/500
            </div>
          </Field>

          {/* Type */}
          <Field label={t('Tipo de vídeo', 'Video type')}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {types.map(tp => (
                <button key={tp.value} onClick={() => setVideoType(tp.value)} style={{
                  flex: 1, padding: '0.65rem 0.5rem', borderRadius: 10, border: '2px solid',
                  borderColor: videoType === tp.value ? 'var(--gold)' : 'var(--border)',
                  background:  videoType === tp.value ? 'var(--gold-dim)' : 'var(--card2)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  color: videoType === tp.value ? 'var(--gold)' : 'var(--text2)',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{tp.emoji}</span>
                  {tp[lang === 'es' ? 'es' : 'en']}
                </button>
              ))}
            </div>
          </Field>

          {/* Language */}
          <Field label={t('Idioma', 'Language')}>
            <SegmentedControl
              options={[{ value: 'es', label: '🇪🇸 Español' }, { value: 'en', label: '🇬🇧 English' }]}
              value={language} onChange={setLanguage}
            />
          </Field>

          {/* Duration */}
          <Field label={t('Duración', 'Duration')}>
            <SegmentedControl
              options={[{ value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '60s' }]}
              value={String(durationSec)} onChange={v => setDurationSec(Number(v))}
            />
          </Field>

          {/* Mode */}
          <Field label={t('Modo', 'Mode')}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { val: false, emoji: '🎬', es: 'Solo vídeo',    en: 'Video only'      },
                { val: true,  emoji: '🎙️', es: 'Con narración', en: 'With narration'  },
              ].map(m => (
                <button key={String(m.val)} onClick={() => setWithNarration(m.val)} style={{
                  flex: 1, padding: '0.65rem 0.5rem', borderRadius: 10, border: '2px solid',
                  borderColor: withNarration === m.val ? 'var(--gold)' : 'var(--border)',
                  background:  withNarration === m.val ? 'var(--gold-dim)' : 'var(--card2)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  color: withNarration === m.val ? 'var(--gold)' : 'var(--text2)',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                  {lang === 'es' ? m.es : m.en}
                </button>
              ))}
            </div>
          </Field>

          {/* Voice selector — only when narration is on */}
          {withNarration && (
            <Field label={t('Voz', 'Voice')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {VOICES.map(v => (
                  <button key={v.id} onClick={() => setVoiceId(v.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                    padding: '0.55rem 0.8rem', borderRadius: 9, border: '1.5px solid',
                    borderColor: voiceId === v.id ? 'var(--gold)' : 'var(--border)',
                    background:  voiceId === v.id ? 'var(--gold-dim)' : 'var(--card2)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{voiceId === v.id ? '🔊' : '🔈'}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: voiceId === v.id ? 'var(--gold)' : 'var(--text)' }}>
                        {lang === 'es' ? v.es : v.en}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: '0.4rem' }}>
                        {lang === 'es' ? v.desc : v.descEn}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          {error && (
            <div style={{ fontSize: '0.8rem', color: 'var(--red)', background: 'rgba(240,68,88,0.08)', padding: '0.6rem 0.8rem', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{ background: 'rgba(27,77,62,0.06)', borderRadius: 10, padding: '0.8rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            {withNarration
              ? t('La IA generará el guión, audio en español con ElevenLabs y vídeo épico con Kling. El proceso puede tardar 5-8 minutos.',
                  'The AI will generate the script, Spanish audio via ElevenLabs and epic Kling video. The process may take 5-8 minutes.')
              : t('La IA generará el guión, la descripción visual y el pie de foto. El vídeo puede tardar 2-5 minutos en renderizarse.',
                  'The AI will generate the script, visual description and caption. Video rendering may take 2-5 minutes.')}
          </div>

          <button onClick={create} disabled={busy} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.85rem' }}>
            {busy ? <><Spinner /> {t('Generando…', 'Generating…')}</> : <><PlusIcon /> {t('Generar vídeo', 'Generate video')}</>}
          </button>
        </div>
      </Popup>
    </Overlay>
  );
}

// ── CONNECT ACCOUNTS MODAL ─────────────────────────────────────────
function ConnectAccountModal({
  accounts, onClose, onSaved, lang,
}: {
  accounts: SocialAccount[];
  onClose:  () => void;
  onSaved:  () => Promise<void>;
  lang:     string;
}) {
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const { user } = useAuth();

  const getAccount = (p: Platform) => accounts.find(a => a.platform === p);

  const [igAccountId,  setIgAccountId]  = useState(getAccount('instagram')?.account_id  ?? '');
  const [igToken,      setIgToken]      = useState('');
  const [igName,       setIgName]       = useState(getAccount('instagram')?.account_name ?? '');
  const [ttToken,      setTtToken]      = useState('');
  const [ttAccountId,  setTtAccountId]  = useState(getAccount('tiktok')?.account_id  ?? '');
  const [ttName,       setTtName]       = useState(getAccount('tiktok')?.account_name ?? '');
  const [busyIg,       setBusyIg]       = useState(false);
  const [busyTt,       setBusyTt]       = useState(false);
  const [msgIg,        setMsgIg]        = useState<string | null>(null);
  const [msgTt,        setMsgTt]        = useState<string | null>(null);

  const saveAccount = async (platform: Platform, accountId: string, token: string, name: string, setBusy: (b: boolean) => void, setMsg: (m: string | null) => void) => {
    if (!accountId.trim() || !token.trim()) { setMsg(t('Rellena todos los campos', 'Fill in all fields')); return; }
    if (!user?.id) { setMsg('No autenticado'); return; }
    setBusy(true); setMsg(null);
    try {
      await supabase.from('social_accounts').upsert(
        { user_id: user.id, platform, account_id: accountId.trim(), access_token: token.trim(), account_name: name.trim() || null },
        { onConflict: 'user_id,platform' },
      );
      await onSaved();
      setMsg(t('✓ Cuenta guardada', '✓ Account saved'));
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally { setBusy(false); }
  };

  const disconnectAccount = async (platform: Platform) => {
    await supabase.from('social_accounts').delete().eq('platform', platform);
    await onSaved();
  };

  return (
    <Overlay onClose={onClose}>
      <Popup title={t('Cuentas sociales', 'Social accounts')} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Instagram */}
          <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📸</span>
              <span style={{ fontWeight: 600 }}>Instagram Reels</span>
              {getAccount('instagram') && <span style={{ fontSize: '0.68rem', color: 'var(--green)', background: 'rgba(0,200,122,0.1)', padding: '0.15rem 0.45rem', borderRadius: 99 }}>{t('Conectado', 'Connected')}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input type="text" value={igAccountId} onChange={e => setIgAccountId(e.target.value)} placeholder={t('Instagram Business Account ID', 'Instagram Business Account ID')} style={inputStyle} />
              <input type="text" value={igName} onChange={e => setIgName(e.target.value)} placeholder={t('Nombre de cuenta (opcional)', 'Account name (optional)')} style={inputStyle} />
              <input type="password" value={igToken} onChange={e => setIgToken(e.target.value)} placeholder={t('Access token de larga duración', 'Long-lived access token')} style={inputStyle} />
            </div>
            {msgIg && <div style={{ fontSize: '0.75rem', color: msgIg.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginTop: '0.5rem' }}>{msgIg}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
              <button onClick={() => saveAccount('instagram', igAccountId, igToken, igName, setBusyIg, setMsgIg)} disabled={busyIg} className="btn btn-gold btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {busyIg ? <Spinner /> : <CheckIcon />}{t('Guardar', 'Save')}
              </button>
              {getAccount('instagram') && (
                <button onClick={() => disconnectAccount('instagram')} className="btn btn-outline btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(240,68,88,0.3)' }}>
                  {t('Desconectar', 'Disconnect')}
                </button>
              )}
            </div>
          </div>

          {/* TikTok */}
          <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🎵</span>
              <span style={{ fontWeight: 600 }}>TikTok</span>
              {getAccount('tiktok') && <span style={{ fontSize: '0.68rem', color: 'var(--green)', background: 'rgba(0,200,122,0.1)', padding: '0.15rem 0.45rem', borderRadius: 99 }}>{t('Conectado', 'Connected')}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input type="text" value={ttAccountId} onChange={e => setTtAccountId(e.target.value)} placeholder={t('TikTok Account ID (open_id)', 'TikTok Account ID (open_id)')} style={inputStyle} />
              <input type="text" value={ttName} onChange={e => setTtName(e.target.value)} placeholder={t('Nombre de cuenta (opcional)', 'Account name (optional)')} style={inputStyle} />
              <input type="password" value={ttToken} onChange={e => setTtToken(e.target.value)} placeholder={t('Access token de TikTok for Developers', 'TikTok for Developers access token')} style={inputStyle} />
            </div>
            {msgTt && <div style={{ fontSize: '0.75rem', color: msgTt.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginTop: '0.5rem' }}>{msgTt}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
              <button onClick={() => saveAccount('tiktok', ttAccountId, ttToken, ttName, setBusyTt, setMsgTt)} disabled={busyTt} className="btn btn-gold btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {busyTt ? <Spinner /> : <CheckIcon />}{t('Guardar', 'Save')}
              </button>
              {getAccount('tiktok') && (
                <button onClick={() => disconnectAccount('tiktok')} className="btn btn-outline btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(240,68,88,0.3)' }}>
                  {t('Desconectar', 'Disconnect')}
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            {t(
              'Los tokens se almacenan cifrados. Para Instagram, obtén un access token de larga duración desde Meta Graph Explorer. Para TikTok, usa TikTok for Developers.',
              'Tokens are stored encrypted. For Instagram, get a long-lived access token from Meta Graph Explorer. For TikTok, use TikTok for Developers.',
            )}
          </div>
        </div>
      </Popup>
    </Overlay>
  );
}

// ── VIDEO PREVIEW MODAL ────────────────────────────────────────────
function VideoPreviewModal({ video, onClose, lang }: { video: ContentVideo; onClose: () => void; lang: string }) {
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  return (
    <Overlay onClose={onClose}>
      <Popup title={video.title} onClose={onClose} wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {video.video_url && (
            <video src={video.video_url} controls autoPlay style={{ width: '100%', borderRadius: 12, maxHeight: '55vh', background: '#000' }} />
          )}
          {video.script && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{t('Guión', 'Script')}</div>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text2)', background: 'var(--card2)', padding: '0.8rem 1rem', borderRadius: 10, border: '1px solid var(--border)' }}>{video.script}</p>
            </div>
          )}
          {video.caption && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{t('Pie de foto', 'Caption')}</div>
              <p style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text2)' }}>{video.caption}</p>
              {video.hashtags?.length > 0 && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--gold)' }}>
                  {video.hashtags.map(h => `#${h}`).join(' ')}
                </p>
              )}
            </div>
          )}
        </div>
      </Popup>
    </Overlay>
  );
}

// ── PUBLISH MODAL ──────────────────────────────────────────────────
function PublishModal({
  video, accounts, onClose, onPublished, lang,
}: {
  video:       ContentVideo;
  accounts:    SocialAccount[];
  onClose:     () => void;
  onPublished: (v: ContentVideo) => void;
  lang:        string;
}) {
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const availablePlatforms = accounts.map(a => a.platform);
  const [selected, setSelected] = useState<Platform[]>(availablePlatforms);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const toggle = (p: Platform) => setSelected(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const publish = async () => {
    if (!selected.length) { setError(t('Selecciona al menos una plataforma', 'Select at least one platform')); return; }
    setBusy(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/publish-social`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id, platforms: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Publish failed');

      // Reload video from DB to get updated status
      const { data: updated } = await supabase.from('content_videos').select().eq('id', video.id).single();
      if (updated) onPublished(updated as ContentVideo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally { setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <Popup title={t('Publicar vídeo', 'Publish video')} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            {t('Selecciona las plataformas donde publicar el vídeo.', 'Select the platforms where to publish the video.')}
          </p>

          {availablePlatforms.length === 0 ? (
            <div style={{ fontSize: '0.83rem', color: 'var(--red)', background: 'rgba(240,68,88,0.08)', padding: '0.8rem', borderRadius: 10 }}>
              {t('No tienes cuentas conectadas. Conecta Instagram o TikTok primero.', 'No accounts connected. Connect Instagram or TikTok first.')}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {(['instagram', 'tiktok'] as Platform[]).map(p => {
                const connected = availablePlatforms.includes(p);
                const active    = selected.includes(p);
                const acc       = accounts.find(a => a.platform === p);
                return (
                  <button key={p} onClick={() => connected && toggle(p)} disabled={!connected} style={{
                    flex: 1, padding: '0.9rem', borderRadius: 12, border: '2px solid',
                    borderColor: active ? 'var(--gold)' : 'var(--border)',
                    background:  active ? 'var(--gold-dim)' : 'var(--card2)',
                    cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '1.6rem' }}>{p === 'instagram' ? '📸' : '🎵'}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text2)' }}>
                      {p === 'instagram' ? 'Instagram' : 'TikTok'}
                    </span>
                    {acc?.account_name && <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>@{acc.account_name}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {error && <div style={{ fontSize: '0.8rem', color: 'var(--red)', background: 'rgba(240,68,88,0.08)', padding: '0.6rem 0.8rem', borderRadius: 8 }}>{error}</div>}

          <button onClick={publish} disabled={busy || !selected.length || !availablePlatforms.length} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.85rem' }}>
            {busy ? <><Spinner /> {t('Publicando…', 'Publishing…')}</> : <><SendIcon /> {t('Publicar ahora', 'Publish now')}</>}
          </button>
        </div>
      </Popup>
    </Overlay>
  );
}

// ── PRIMITIVES ─────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,15,0.82)', backdropFilter: 'blur(8px)', zIndex: 9000, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 9001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
        {children}
      </div>
    </>
  );
}

function Popup({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="glass-2" style={{
      borderRadius: 20, border: '1px solid var(--border2)', padding: '1.8rem',
      width: '100%', maxWidth: wide ? 600 : 460,
      boxShadow: '0 24px 80px rgba(0,0,0,0.55)', animation: 'popIn 0.22s cubic-bezier(0.34,1.2,0.64,1)',
      margin: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
          <XIcon />
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 9, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '0.42rem', borderRadius: 7, border: 'none', cursor: 'pointer',
          fontSize: '0.8rem', fontWeight: value === o.value ? 600 : 400,
          background: value === o.value ? 'var(--card)' : 'transparent',
          color: value === o.value ? 'var(--text)' : 'var(--muted)',
          transition: 'all 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, outline: 'none',
  background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)',
  fontSize: '0.88rem', boxSizing: 'border-box',
};
