import { StrictMode, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, ChevronDown, Clock3, FileCheck2, LayoutDashboard, LogOut, Play, Plus, ShieldCheck, Sparkles, ThumbsUp, UserRound, Video, Wallet, X } from 'lucide-react';
import './styles.css';
import { createCampaign, createTask, loadTasks, sendHeartbeat, startHeartbeat, supabase, verifySecretCode, verifyYouTubeProof } from './supabase';

type Task = {
  id: number; title: string; creator: string; description: string; videoId: string; youtubeChannelId?: string;
  campaignName?: string; platform?: string; actionType?: string; points: number; duration: number;
  audience: string; color: string;
};

const tasks: Task[] = [
  { id: 1, title: 'Bilim: İnsanlar neden av eti yemez?', creator: 'Tp Dossier', description: 'Videoyu keşfet, gerçek bir izleyici olarak katkını bırak.', videoId: 'J7nGqQJ8K4s', points: 100, duration: 30, audience: 'Yeni izleyiciler', color: '#ed7b42', platform: 'youtube' },
  { id: 2, title: 'Algoritmanın arkasındaki gerçek', creator: 'Kayıp Gerçekler', description: 'İzle, düşünceni bırak ve kanalı keşfet.', videoId: 'dQw4w9WgXcQ', points: 150, duration: 30, audience: 'Teknoloji meraklıları', color: '#5576d9', platform: 'youtube' },
  { id: 3, title: 'Gündelik hayatın küçük bilimi', creator: 'Merak Atölyesi', description: 'Manuel adımları tamamla; kanıt zincirini birlikte oluşturalım.', videoId: 'M7lc1UVf-VE', points: 80, duration: 30, audience: 'Bilim severler', color: '#8b64cf', platform: 'youtube' },
];

type Screen = 'feed' | 'admin' | 'wallet' | 'advertiser';
const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'murathand08@gmail.com').toLowerCase();

function mapTask(item: any): Task {
  return {
    ...item,
    videoId: item.video_id,
    youtubeChannelId: item.youtube_channel_id || undefined,
    campaignName: item.campaign_name,
    platform: item.platform,
    actionType: item.action_type,
    duration: item.duration_seconds || item.youtube_min_watch_seconds || item.estimated_duration_seconds,
  };
}

function App({ initialScreen = 'feed', isAdmin = false }: { initialScreen?: Screen; isAdmin?: boolean }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(() => sessionStorage.getItem('glorytiktok-youtube-token'));
  const [youtubeVerified, setYoutubeVerified] = useState(false);
  const [toast, setToast] = useState('');
  const [taskList, setTaskList] = useState<Task[]>(tasks);

  useEffect(() => {
    loadTasks().then(({ data }) => { if (data?.length) setTaskList(data.map(mapTask)); });
  }, []);

  const task = taskList.find((item) => item.id === activeTask) ?? null;
  const requiresYoutubeProof = Boolean(task?.youtubeChannelId);
  const ready = Boolean(task && watched >= task.duration && (requiresYoutubeProof ? youtubeVerified : liked && subscribed));
  const canSubmit = ready && codeInput.length === 6;

  useEffect(() => {
    if (!playing || !task || submitted || !nonce) return;
    const timer = window.setInterval(() => {
      setWatched((value) => {
        const next = Math.min(task.duration, value + 1);
        sendHeartbeat(nonce, next).then(({ data, error }) => {
          if (error) setToast(`İzleme doğrulanamadı: ${error.message}`);
          if (data?.secretCode) setCode(String(data.secretCode));
          if (data?.completed) setPlaying(false);
        });
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing, task, submitted, nonce]);

  useEffect(() => {
    if (!window.location.hash.includes('access_token=')) return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
    if (token) {
      setYoutubeToken(token);
      sessionStorage.setItem('glorytiktok-youtube-token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const startTask = async (id: number) => {
    setActiveTask(id); setLiked(false); setSubscribed(false); setPlaying(false); setWatched(0); setCode(null); setCodeInput(''); setSubmitted(false); setSubmissionId(null); setNonce(null); setYoutubeVerified(false);
    const result = await startHeartbeat(id);
    if (result.error) { setToast(`Görev başlatılamadı: ${result.error.message}`); return; }
    const challenge = result.data?.[0] ?? result.data;
    setSubmissionId(challenge?.submissionId ?? challenge?.submission_id ?? null);
    setNonce(challenge?.nonce ?? null);
  };

  const connectYouTube = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { setToast('YouTube OAuth için VITE_GOOGLE_CLIENT_ID ayarlanmalı.'); return; }
    const redirect = window.location.origin + window.location.pathname;
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.force-ssl')}&include_granted_scopes=true`;
  };

  const verifyYouTube = async () => {
    if (!task || !submissionId || !youtubeToken || !task.youtubeChannelId) { setToast('YouTube kanal ID’si ve OAuth bağlantısı gerekli.'); return; }
    const result = await verifyYouTubeProof({ submissionId, videoId: task.videoId, channelId: task.youtubeChannelId, accessToken: youtubeToken });
    if (result.error || result.data?.error) { setToast(`YouTube doğrulaması başarısız: ${result.error?.message ?? result.data.error}`); return; }
    setLiked(Boolean(result.data?.liked)); setSubscribed(Boolean(result.data?.subscribed)); setYoutubeVerified(Boolean(result.data?.verified));
    setToast(result.data?.verified ? 'YouTube beğeni ve abonelik doğrulandı.' : 'Beğeni ve abonelik doğrulanamadı.');
  };

  const submit = async () => {
    if (!canSubmit || !submissionId) return;
    const result = await verifySecretCode(submissionId, codeInput);
    if (result.error || !result.data?.verified) { setToast(`Secret Code doğrulanamadı: ${result.error?.message ?? 'Kod geçersiz veya süresi doldu.'}`); return; }
    setSubmitted(true); setPlaying(false); setToast('Görev tamamlandı — admin onayına gönderildi.');
  };

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setScreen('feed')}><span className="brand-mark">g</span><span>glory<span className="brand-accent">tiktok</span></span></button><div className="topbar-center"><span className="live-dot" /> Gerçek görev akışı</div><div className="profile"><span>1,240 puan</span><span className="avatar"><UserRound size={16} /></span><button className="logout-button" onClick={() => supabase?.auth.signOut()} title="Çıkış yap" aria-label="Çıkış yap"><LogOut size={15} /></button></div></header>
    {screen === 'feed' && <Feed tasks={taskList} onStart={startTask} />}
    {screen === 'admin' && isAdmin && <Admin onToast={setToast} />}
    {screen === 'wallet' && <WalletPage />}
    {screen === 'advertiser' && <Advertiser onToast={setToast} />}
    {activeTask && task && <TaskModal task={task} liked={liked} setLiked={setLiked} subscribed={subscribed} setSubscribed={setSubscribed} playing={playing} setPlaying={setPlaying} watched={watched} code={code} codeInput={codeInput} setCodeInput={setCodeInput} submitted={submitted} canSubmit={canSubmit} requiresYoutubeProof={requiresYoutubeProof} youtubeToken={youtubeToken} youtubeVerified={youtubeVerified} onConnectYouTube={connectYouTube} onVerifyYouTube={verifyYouTube} onSubmit={submit} onClose={() => setActiveTask(null)} />}
    {toast && <div className="toast"><Check size={18} />{toast}</div>}
    <nav className="bottom-nav"><NavButton active={screen === 'feed'} onClick={() => setScreen('feed')} icon={<Sparkles size={18} />} label="Akış" />{isAdmin && <NavButton active={screen === 'admin'} onClick={() => setScreen('admin')} icon={<LayoutDashboard size={18} />} label="Admin" />}<NavButton active={screen === 'wallet'} onClick={() => setScreen('wallet')} icon={<Wallet size={18} />} label="Cüzdan" /><NavButton active={screen === 'advertiser'} onClick={() => setScreen('advertiser')} icon={<Plus size={18} />} label="Kampanya" /></nav>
  </div>;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) { return <button className={active ? 'active' : ''} onClick={onClick}>{icon}{label}</button>; }

function Feed({ tasks, onStart }: { tasks: Task[]; onStart: (id: number) => void }) { return <main className="feed"><section className="intro"><div><p className="eyebrow"><Sparkles size={14} /> BUGÜNÜN AKIŞI</p><h1>İzle. Etkileşime geç.<br /><em>Gerçek katkı bırak.</em></h1><p className="intro-copy">Her görevde işlem kullanıcıya aittir. Biz yalnızca izleme ve işlem kanıtını güvenle toplarız.</p></div><div className="trust-chip"><ShieldCheck size={18} /><div><strong>İnsan destekli</strong><span>Otomatik bot yok</span></div></div></section><div className="feed-hint"><span>Görevleri keşfet</span><ChevronDown size={16} /></div><div className="task-stream">{tasks.map((item) => <article className="task-card" key={item.id} style={{ '--poster': item.color } as CSSProperties}><div className="card-poster"><div className="poster-gradient" /><div className="poster-top"><span className="creator-pill"><span className="creator-avatar">{item.creator[0]}</span>{item.creator}</span><span className="points">+{item.points} puan</span></div><div className="poster-play"><Play size={22} fill="currentColor" /></div><div className="poster-bottom"><span><Clock3 size={14} /> {item.duration} sn izleme</span><span className="organic"><ShieldCheck size={14} /> Organik katılım</span></div></div><div className="card-info"><div><p className="card-label">YOUTUBE GÖREVİ</p><h2>{item.title}</h2><p>{item.description}</p></div><button className="start-button" onClick={() => onStart(item.id)}>Görevi başlat <span>↗</span></button></div></article>)}</div></main>; }

function TaskModal({ task, liked, setLiked, subscribed, setSubscribed, playing, setPlaying, watched, code, codeInput, setCodeInput, submitted, canSubmit, requiresYoutubeProof, youtubeToken, youtubeVerified, onConnectYouTube, onVerifyYouTube, onSubmit, onClose }: { task: Task; liked: boolean; setLiked: (v: boolean) => void; subscribed: boolean; setSubscribed: (v: boolean) => void; playing: boolean; setPlaying: (v: boolean) => void; watched: number; code: string | null; codeInput: string; setCodeInput: (v: string) => void; submitted: boolean; canSubmit: boolean; requiresYoutubeProof: boolean; youtubeToken: string | null; youtubeVerified: boolean; onConnectYouTube: () => void; onVerifyYouTube: () => void; onSubmit: () => void; onClose: () => void }) { return <div className="modal-backdrop"><div className="task-modal"><button className="close" onClick={onClose}><X size={18} /></button><div className="modal-head"><div><p className="eyebrow">AKTİF GÖREV · {task.creator}</p><h2>{task.title}</h2></div><span className="modal-points">+{task.points}</span></div><div className="player-wrap"><iframe title={task.title} src={`https://www.youtube.com/embed/${task.videoId}?rel=0&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /><button className={`player-action ${playing ? 'is-playing' : ''}`} onClick={() => setPlaying(!playing)}><Play size={16} fill="currentColor" />{playing ? 'Video oynuyor' : 'İzlemeyi başlat'}</button>{code && <div className="code-overlay"><p>GÖREV DOĞRULAMA KODU</p><strong>{code}</strong><span>Kodu aşağıdaki alana gir</span></div>}</div><div className="progress-line"><span style={{ width: `${Math.round(watched / task.duration * 100)}%` }} /></div><div className="step-row"><Step number="1" label="Videoyu beğen" done={liked} disabled={submitted} onClick={() => setLiked(true)} icon={<ThumbsUp size={16} />} /><Step number="2" label="Kanala abone ol" done={subscribed} disabled={submitted} onClick={() => setSubscribed(true)} icon={<Video size={16} />} /><Step number="3" label={`${task.duration} sn izle`} done={watched >= task.duration} disabled={submitted} onClick={() => setPlaying(true)} icon={<Clock3 size={16} />} /></div>{requiresYoutubeProof && <div className="youtube-proof"><span>{youtubeVerified ? 'YouTube kanıtı doğrulandı' : 'YouTube hesabından kanıt doğrula'}</span>{!youtubeToken ? <button className="outline-button" onClick={onConnectYouTube}>YouTube’a bağlan</button> : <button className="outline-button" onClick={onVerifyYouTube}>Kanıtı doğrula</button>}</div>}<div className="verify-panel"><div className="verify-copy"><ShieldCheck size={19} /><div><strong>{submitted ? 'Görev admin onayına gönderildi' : code ? 'Kod ekranda — son adım' : 'Kanıt zinciri hazırlanıyor'}</strong><span>{submitted ? 'Puan onaydan sonra hesabına eklenir.' : code ? 'Video üzerindeki kodu forma girerek tamamla.' : 'Adımları sırayla tamamla; her işlem senin hesabından yapılır.'}</span></div></div>{!submitted && <div className="code-form"><input value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Secret Code" inputMode="numeric" disabled={!code} /><button onClick={onSubmit} disabled={!canSubmit}>Görevi tamamla</button></div>}</div></div></div>; }
function Step({ number, label, done, disabled, onClick, icon }: { number: string; label: string; done: boolean; disabled: boolean; onClick: () => void; icon: ReactNode }) { return <button className={`step ${done ? 'done' : ''}`} disabled={disabled} onClick={onClick}><span className="step-num">{done ? <Check size={13} /> : number}</span><span>{label}</span>{done && <small>tamam</small>}</button>; }

type TaskForm = { title: string; description: string; campaignName: string; platform: string; actionType: string; targetUrl: string; verificationMethod: string; fallbackMethod: string; points: string; totalQuota: string; userLimit: string; estimatedDuration: string; youtubeMinWatchSeconds: string; secretCodeDisplaySeconds: string; randomCodeStartSeconds: string; randomCodeEndSeconds: string; sessionDurationSeconds: string; dailyTaskLimit: string; startsAt: string; endsAt: string; eligibilityRules: string; videoId: string; youtubeChannelId: string; creator: string; audience: string; color: string };
const newTaskForm = (): TaskForm => ({ title: '', description: '', campaignName: 'Bağımsız görev', platform: 'youtube', actionType: 'WATCH', targetUrl: '', verificationMethod: 'secret_code', fallbackMethod: 'manual_review', points: '100', totalQuota: '100', userLimit: '1', estimatedDuration: '30', youtubeMinWatchSeconds: '30', secretCodeDisplaySeconds: '12', randomCodeStartSeconds: '30', randomCodeEndSeconds: '60', sessionDurationSeconds: '900', dailyTaskLimit: '5', startsAt: '', endsAt: '', eligibilityRules: '', videoId: '', youtubeChannelId: '', creator: '', audience: '', color: '#5576d9' });

function Admin({ onToast }: { onToast: (v: string) => void }) {
  const [showTask, setShowTask] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>(newTaskForm());
  const update = (field: keyof TaskForm, value: string) => setTaskForm((current) => ({ ...current, [field]: value }));
  const create = async (e: FormEvent) => {
    e.preventDefault();
    const number = (field: keyof TaskForm) => Number(taskForm[field]);
    let eligibilityRules = '{}';
    try { eligibilityRules = taskForm.eligibilityRules.trim() ? JSON.stringify(JSON.parse(taskForm.eligibilityRules)) : '{}'; } catch { onToast('Uygunluk kuralları geçerli JSON formatında olmalı.'); return; }
    const result = await createTask({ title: taskForm.title, creator: taskForm.creator || taskForm.campaignName, description: taskForm.description, videoId: taskForm.videoId, youtubeChannelId: taskForm.youtubeChannelId, campaignName: taskForm.campaignName, platform: taskForm.platform, actionType: taskForm.actionType, targetUrl: taskForm.targetUrl, verificationMethod: taskForm.verificationMethod, fallbackMethod: taskForm.fallbackMethod, points: number('points'), totalQuota: number('totalQuota'), userLimit: number('userLimit'), estimatedDuration: number('estimatedDuration'), youtubeMinWatchSeconds: number('youtubeMinWatchSeconds'), secretCodeDisplaySeconds: number('secretCodeDisplaySeconds'), randomCodeStartSeconds: number('randomCodeStartSeconds'), randomCodeEndSeconds: number('randomCodeEndSeconds'), sessionDurationSeconds: number('sessionDurationSeconds'), dailyTaskLimit: number('dailyTaskLimit'), startsAt: taskForm.startsAt, endsAt: taskForm.endsAt, eligibilityRules, audience: taskForm.audience, color: taskForm.color });
    if (result.error) { onToast(`Görev oluşturulamadı: ${result.error.message}`); return; }
    setShowTask(false); setTaskForm(newTaskForm()); onToast('Görev oluşturuldu ve akışa eklendi.');
  };
  const items = [{ id: 1, user: 'Ayşe Yılmaz', task: 'Algoritmanın arkasındaki gerçek', points: 150, time: '2 dk önce', status: 'İnceleniyor' }, { id: 2, user: 'Murat Kaya', task: 'Bilim: İnsanlar neden av eti yemez?', points: 100, time: '18 dk önce', status: 'İnceleniyor' }, { id: 3, user: 'Deniz Acar', task: 'Gündelik hayatın küçük bilimi', points: 80, time: '1 saat önce', status: 'Onaylandı' }];
  return <main className="dashboard"><PageTitle eyebrow="YÖNETİM MERKEZİ" title="Kontrol paneli" sub="Görevleri yayınlayın, kanıtları inceleyin ve ödül akışını yönetin." /><div className="advertiser-actions"><div className="metric-grid" style={{ marginBottom: 0, flex: 1 }}><Metric label="Bekleyen kanıt" value="2" accent="lime" /><Metric label="Bugün onaylanan" value="24" /><Metric label="Dağıtılan puan" value="3,840" /></div><button className="primary-button" onClick={() => setShowTask(!showTask)}><Plus size={17} /> Yeni görev</button></div>{showTask && <form className="inline-form detailed-task-form" onSubmit={create}><div className="panel-head"><div><h3>Yeni görev oluştur</h3><p>Görevin davranışını, doğrulama kurallarını ve kapasitesini belirleyin.</p></div><button type="button" className="close-small" onClick={() => setShowTask(false)}><X size={16} /></button></div><div className="form-section-title">Temel bilgiler</div><div className="form-grid"><Field label="Görev başlığı" value={taskForm.title} onChange={(v) => update('title', v)} required placeholder="Örn. Kampanya sayfasını incele" /><Field label="Kanal adı" value={taskForm.creator} onChange={(v) => update('creator', v)} placeholder="İçerik üreticisi" /><Field label="YouTube video ID" value={taskForm.videoId} onChange={(v) => update('videoId', v)} required placeholder="dQw4w9WgXcQ" /><Field label="YouTube kanal ID" value={taskForm.youtubeChannelId} onChange={(v) => update('youtubeChannelId', v)} placeholder="UC... (OAuth doğrulaması için)" /></div><label className="wide-field">Açıklama<textarea required value={taskForm.description} onChange={(e) => update('description', e.target.value)} placeholder="Kullanıcıya gösterilecek net adımlar" /></label><div className="form-grid"><SelectField label="Kampanya" value={taskForm.campaignName} onChange={(v) => update('campaignName', v)} options={['Bağımsız görev', 'Kampanya seç']}/><SelectField label="Platform" value={taskForm.platform} onChange={(v) => update('platform', v)} options={['youtube', 'web', 'tiktok', 'instagram']} /><Field label="Eylem tipi" value={taskForm.actionType} onChange={(v) => update('actionType', v)} required /><Field label="Hedef URL (isteğe bağlı)" value={taskForm.targetUrl} onChange={(v) => update('targetUrl', v)} placeholder="https://..." /><SelectField label="Doğrulama yöntemi" value={taskForm.verificationMethod} onChange={(v) => update('verificationMethod', v)} options={['manual_review', 'secret_code', 'youtube_oauth']} /><SelectField label="Fallback" value={taskForm.fallbackMethod} onChange={(v) => update('fallbackMethod', v)} options={['manual_review', 'secret_code', 'none']} /></div><div className="form-section-title">Ödül ve kapasite</div><div className="form-grid"><NumberField label="Ödül puanı" value={taskForm.points} onChange={(v) => update('points', v)} /><NumberField label="Toplam kota" value={taskForm.totalQuota} onChange={(v) => update('totalQuota', v)} /><NumberField label="Kullanıcı limiti" value={taskForm.userLimit} onChange={(v) => update('userLimit', v)} /><NumberField label="Tahmini süre (sn)" value={taskForm.estimatedDuration} onChange={(v) => update('estimatedDuration', v)} /><NumberField label="YouTube minimum izleme (sn)" value={taskForm.youtubeMinWatchSeconds} onChange={(v) => update('youtubeMinWatchSeconds', v)} /><NumberField label="Kod ekranda kalma (sn)" value={taskForm.secretCodeDisplaySeconds} onChange={(v) => update('secretCodeDisplaySeconds', v)} /><NumberField label="Rastgele kod başlangıcı (sn)" value={taskForm.randomCodeStartSeconds} onChange={(v) => update('randomCodeStartSeconds', v)} /><NumberField label="Rastgele kod bitişi (sn)" value={taskForm.randomCodeEndSeconds} onChange={(v) => update('randomCodeEndSeconds', v)} /><NumberField label="Oturum süresi (sn)" value={taskForm.sessionDurationSeconds} onChange={(v) => update('sessionDurationSeconds', v)} /><NumberField label="Günlük görev limiti" value={taskForm.dailyTaskLimit} onChange={(v) => update('dailyTaskLimit', v)} /></div><div className="form-section-title">Zamanlama ve uygunluk</div><div className="form-grid"><Field label="Başlangıç (isteğe bağlı)" type="datetime-local" value={taskForm.startsAt} onChange={(v) => update('startsAt', v)} /><Field label="Bitiş (isteğe bağlı)" type="datetime-local" value={taskForm.endsAt} onChange={(v) => update('endsAt', v)} /><Field label="Hedef kitle" value={taskForm.audience} onChange={(v) => update('audience', v)} placeholder="Yeni izleyiciler" /><Field label="Uygunluk kuralları" value={taskForm.eligibilityRules} onChange={(v) => update('eligibilityRules', v)} placeholder='JSON, örn. {"minAccountAgeDays": 7}' /></div><button className="primary-button" type="submit">Görevi yayınla <Plus size={16} /></button></form>}<section className="panel"><div className="panel-head"><div><h3>Görev gönderimleri</h3><p>Ekran görüntüsü, izleme süresi ve sosyal işlem kanıtları.</p></div><span className="filter-pill">Tümü · {items.length}</span></div><div className="review-list">{items.map((item) => <div className="review-row" key={item.id}><div className="review-avatar">{item.user[0]}</div><div className="review-main"><strong>{item.user}</strong><span>{item.task} · +{item.points} puan</span></div><div className="evidence"><FileCheck2 size={15} /> 4 kanıt <small>{item.time}</small></div><span className={`status ${item.status === 'Onaylandı' ? 'approved' : ''}`}>{item.status}</span>{item.status === 'İnceleniyor' && <div className="review-actions"><button className="approve" onClick={() => onToast('Kanıt onaylama RPC’si hazır; migration uygulandığında puan atomik aktarılır.')}><Check size={14} /> Onayla</button><button className="reject" onClick={() => onToast('Kanıt reddedildi.')}><X size={14} /> Reddet</button></div>}</div>)}</div></section></main>;
}
function Field({ label, value, onChange, required = false, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string }) { return <label>{label}<input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label} value={value} onChange={onChange} type="number" />; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option === 'manual_review' ? 'Manuel inceleme' : option === 'secret_code' ? 'Secret Code' : option === 'youtube_oauth' ? 'YouTube OAuth/API' : option}</option>)}</select></label>; }
function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) { return <div className="metric"><span>{label}</span><strong className={accent || ''}>{value}</strong><small>Son 24 saat <b>↗ 12%</b></small></div>; }
function PageTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) { return <section className="page-title"><p className="eyebrow"><ShieldCheck size={14} /> {eyebrow}</p><h1>{title}</h1><p>{sub}</p></section>; }
function WalletPage() { return <main className="dashboard"><PageTitle eyebrow="KULLANICI HESABI" title="Cüzdanım" sub="Kazançlarını, görev geçmişini ve doğrulama itibarını tek yerde gör." /><div className="wallet-hero"><div><span>KULLANILABILIR BAKİYE</span><strong>1,240 <small>puan</small></strong><button className="light-button">Ödülleri keşfet ↗</button></div><div className="wallet-orb"><Wallet size={32} /></div></div><div className="metric-grid wallet-metrics"><Metric label="Toplam kazanım" value="2,840 puan" /><Metric label="Tamamlanan görev" value="28" /><Metric label="Onay oranı" value="96%" accent="lime" /></div><section className="panel"><div className="panel-head"><div><h3>Son görevler</h3><p>Onaylanan ve bekleyen görevlerin.</p></div><span className="filter-pill">Bu ay</span></div><div className="history"><HistoryRow icon={<Check size={16} />} title="Algoritmanın arkasındaki gerçek" meta="Admin onayladı · Bugün" amount="+150" state="Onaylandı" /><HistoryRow icon={<Clock3 size={16} />} title="Gündelik hayatın küçük bilimi" meta="İnceleniyor · Dün" amount="+80" state="Bekliyor" /><HistoryRow icon={<Check size={16} />} title="Bilim: İnsanlar neden av eti yemez?" meta="Admin onayladı · 28 Ağu" amount="+100" state="Onaylandı" /></div></section></main>; }
function HistoryRow({ icon, title, meta, amount, state }: { icon: ReactNode; title: string; meta: string; amount: string; state: string }) { return <div className="history-row"><span className="history-icon">{icon}</span><div><strong>{title}</strong><span>{meta}</span></div><b>{amount} puan</b><small className={state === 'Onaylandı' ? 'good' : ''}>{state}</small></div>; }

function Advertiser({ onToast }: { onToast: (v: string) => void }) { const [show, setShow] = useState(false); const [form, setForm] = useState({ name: '', videoUrl: '', target: '100', points: '100' }); const [campaigns, setCampaigns] = useState([{ name: 'Bilim serisi lansmanı', video: 'Why humans never eat predator meat?', status: 'Yayında', progress: '64 / 100', budget: '6,400 puan' }, { name: 'Teknoloji kanal büyümesi', video: 'Algoritmanın arkasındaki gerçek', status: 'Taslak', progress: '0 / 150', budget: '15,000 puan' }]); const create = async (e: FormEvent) => { e.preventDefault(); const result = await createCampaign({ name: form.name, videoUrl: form.videoUrl, targetParticipants: Number(form.target), pointsPerTask: Number(form.points) }); if (result.error) { onToast(`Kampanya oluşturulamadı: ${result.error.message}`); return; } setCampaigns((value) => [{ name: form.name, video: form.videoUrl, status: 'Taslak', progress: `0 / ${form.target}`, budget: `${(Number(form.target) * Number(form.points)).toLocaleString('tr-TR')} puan` }, ...value]); setForm({ name: '', videoUrl: '', target: '100', points: '100' }); setShow(false); onToast('Kampanya taslağı veritabanına kaydedildi.'); }; return <main className="dashboard"><PageTitle eyebrow="İÇERİK ÜRETİCİSİ" title="Kampanyalarım" sub="Kanalın için gerçek kullanıcı katılımına dayalı görev kampanyaları oluştur." /><div className="advertiser-actions"><div className="balance-card"><span>KAMPANYA BAKİYESİ</span><strong>42,800 <small>puan</small></strong><span className="muted">Bütçe kontrolü aktif</span></div><button className="primary-button" onClick={() => setShow(true)}><Plus size={17} /> Yeni kampanya</button></div><section className="campaign-grid">{campaigns.map((campaign, index) => <article className="campaign-card" key={`${campaign.name}-${index}`}><div className="campaign-cover"><span className="creator-pill"><span className="creator-avatar">{index ? 'T' : 'B'}</span> YouTube</span><span className={`status ${campaign.status === 'Yayında' ? 'approved' : ''}`}>{campaign.status}</span><div className="campaign-cover-icon"><Video size={28} /></div></div><div className="campaign-body"><p className="card-label">VİDEO KAMPANYASI</p><h3>{campaign.name}</h3><p>{campaign.video}</p><div className="campaign-stats"><span><UserRound size={14} /> {campaign.progress} katılım</span><span>{campaign.budget}</span></div><div className="campaign-progress"><span style={{ width: index ? '0%' : '64%' }} /></div><button className="outline-button" onClick={() => onToast('Kampanya yönetim detayları yakında hazır.')}>Kampanyayı yönet ↗</button></div></article>)}</section>{show && <form className="inline-form" onSubmit={create}><div className="panel-head"><div><h3>Yeni kampanya talebi</h3><p>Görev yayınlanmadan önce bütçe ve hedefleri belirleyin.</p></div><button type="button" className="close-small" onClick={() => setShow(false)}><X size={16} /></button></div><div className="form-grid"><label>Kampanya adı<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn. Yeni video lansmanı" /></label><label>YouTube video URL<input required value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></label><label>Hedef katılım<input required type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></label><label>Görev başı puan<input required type="number" min="1" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label></div><button className="primary-button" type="submit">Taslak oluştur <Plus size={16} /></button></form>}</main>; }

function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [user, setUser] = useState<any>(null); const [isAdmin, setIsAdmin] = useState(false); const [checking, setChecking] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    const sync = async (session: any) => { const currentUser = session?.user ?? null; setUser(currentUser); setIsAdmin(false); if (currentUser?.email?.toLowerCase() === adminEmail) { const result = await supabase.rpc('is_admin'); setIsAdmin(Boolean(result.data) && !result.error); } setChecking(false); };
    supabase.auth.getSession().then(({ data }) => sync(data.session)); const { data } = supabase.auth.onAuthStateChange((_event, session) => { void sync(session); }); return () => data.subscription.unsubscribe();
  }, []);
  if (!supabase) return <div className="auth-page"><div className="auth-card"><h1>Supabase ayarı bekleniyor</h1><p>VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY değişkenlerini ekleyin.</p></div></div>;
  if (checking) return <div className="auth-page"><div className="auth-card"><div className="auth-icon"><ShieldCheck size={22} /></div><h1>Oturum kontrol ediliyor</h1><p>Yetki bilgileriniz güvenli biçimde doğrulanıyor.</p></div></div>;
  if (user) return <App initialScreen={isAdmin ? 'admin' : 'feed'} isAdmin={isAdmin} />;
  return <main className="auth-page"><div className="auth-card"><div className="auth-icon"><ShieldCheck size={22} /></div><p className="eyebrow">GLORYTIKTOK</p><h1>{mode === 'login' ? 'Tekrar hoş geldin' : 'Hesap oluştur'}</h1><p>{mode === 'login' ? 'Görev akışına devam etmek için giriş yap.' : 'Görevleri keşfetmek için ücretsiz hesabını oluştur.'}</p><form onSubmit={async (e) => { e.preventDefault(); setError(''); setMessage(''); const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password }); if (result.error) setError(result.error.message); else setMessage(mode === 'login' ? 'Giriş başarılı.' : 'Kayıt başarılı. E-posta doğrulamanı kontrol et.'); }}><label>E-posta<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Şifre<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <span className="login-error">{error}</span>}{message && <span className="login-success">{message}</span>}<button className="primary-button" type="submit">{mode === 'login' ? 'E-posta ile giriş yap' : 'Kayıt ol'}</button></form><button className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Yeni hesap oluştur' : 'Zaten hesabım var, giriş yap'}</button></div></main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><AuthGate /></StrictMode>);
