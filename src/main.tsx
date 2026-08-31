import { StrictMode, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, ChevronDown, Clock3, Heart, Play, ShieldCheck, Sparkles, ThumbsUp, UserRound, Video } from 'lucide-react';
import './styles.css';

type Task = {
  id: number;
  title: string;
  creator: string;
  description: string;
  videoId: string;
  points: number;
  duration: number;
  audience: string;
  color: string;
};

const tasks: Task[] = [
  { id: 1, title: 'Bilim: İnsanlar neden av eti yemez?', creator: 'Tp Dossier', description: 'Videoyu keşfet, gerçek bir izleyici olarak katkını bırak.', videoId: 'J7nGqQJ8K4s', points: 100, duration: 30, audience: 'Yeni izleyiciler', color: '#ed7b42' },
  { id: 2, title: 'Algoritmanın arkasındaki gerçek', creator: 'Kayıp Gerçekler', description: 'İzle, düşünceni bırak ve kanalı keşfet.', videoId: 'dQw4w9WgXcQ', points: 150, duration: 30, audience: 'Teknoloji meraklıları', color: '#5576d9' },
  { id: 3, title: 'Gündelik hayatın küçük bilimi', creator: 'Merak Atölyesi', description: 'Manuel adımları tamamla; kanıt zincirini birlikte oluşturalım.', videoId: 'M7lc1UVf-VE', points: 80, duration: 30, audience: 'Bilim severler', color: '#8b64cf' },
];

function App() {
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');

  const task = tasks.find(item => item.id === activeTask) ?? null;
  const readyForCode = Boolean(task && watched >= task.duration && liked && subscribed);
  const canSubmit = readyForCode && codeInput === code;

  useEffect(() => {
    if (!playing || !task || submitted) return;
    const interval = window.setInterval(() => {
      setWatched(value => {
        const next = Math.min(task.duration, value + 1);
        if (next >= task.duration && liked && subscribed) setCode('' + Math.floor(100000 + Math.random() * 899999));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [playing, task, liked, subscribed, submitted]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const startTask = (id: number) => {
    setActiveTask(id); setLiked(false); setSubscribed(false); setPlaying(false); setWatched(0); setCode(null); setCodeInput(''); setSubmitted(false);
  };

  const closeTask = () => setActiveTask(null);

  const submit = () => {
    if (!canSubmit) return;
    setSubmitted(true); setPlaying(false); setToast('Görev tamamlandı — admin onayı bekleniyor.');
  };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">g</span><span>glory<span className="brand-accent">tiktok</span></span></div><div className="topbar-center"><span className="live-dot" /> Gerçek görev akışı</div><div className="profile"><span>1,240 puan</span><span className="avatar"><UserRound size={16} /></span></div></header>
    <main className="feed" aria-label="Görev akışı">
      <section className="intro"><div><p className="eyebrow"><Sparkles size={14} /> BUGÜNÜN AKIŞI</p><h1>İzle. Etkileşime geç.<br /><em>Gerçek katkı bırak.</em></h1><p className="intro-copy">Her görevde işlem kullanıcıya aittir. Biz yalnızca izleme ve işlem kanıtını güvenle toplarız.</p></div><div className="trust-chip"><ShieldCheck size={18} /><div><strong>İnsan destekli</strong><span>Otomatik bot yok</span></div></div></section>
      <div className="feed-hint"><span>Görevleri keşfet</span><ChevronDown size={16} /></div>
      <div className="task-stream">{tasks.map(item => <article className="task-card" key={item.id} style={{ '--poster': item.color } as CSSProperties}>
        <div className="card-poster"><div className="poster-gradient" /><div className="poster-top"><span className="creator-pill"><span className="creator-avatar">{item.creator[0]}</span>{item.creator}</span><span className="points">+{item.points} puan</span></div><div className="poster-play"><Play size={22} fill="currentColor" /></div><div className="poster-bottom"><span><Clock3 size={14} /> {item.duration} sn izleme</span><span className="organic"><ShieldCheck size={14} /> Organik katılım</span></div></div>
        <div className="card-info"><div><p className="card-label">YOUTUBE GÖREVİ</p><h2>{item.title}</h2><p>{item.description}</p></div><button className="start-button" onClick={() => startTask(item.id)}>Görevi başlat <span>↗</span></button></div>
      </article>)}</div>
    </main>
    {activeTask && task && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="task-modal"><button className="close" onClick={closeTask} aria-label="Kapat">×</button><div className="modal-head"><div><p className="eyebrow">AKTİF GÖREV · {task.creator}</p><h2>{task.title}</h2></div><span className="modal-points">+{task.points}</span></div><div className="player-wrap"><iframe title={task.title} src={`https://www.youtube.com/embed/${task.videoId}?rel=0&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /><button className={`player-action ${playing ? 'is-playing' : ''}`} onClick={() => setPlaying(value => !value)}><Play size={16} fill="currentColor" /> {playing ? 'Video oynuyor' : 'İzlemeyi başlat'}</button>{code && <div className="code-overlay"><p>GÖREV DOĞRULAMA KODU</p><strong>{code}</strong><span>Kodu aşağıdaki alana gir</span></div>}</div><div className="progress-line"><span style={{ width: `${Math.round((watched / task.duration) * 100)}%` }} /></div><div className="step-row"><Step number="1" label="Videoyu beğen" done={liked} disabled={!playing || submitted} onClick={() => setLiked(true)} icon={<ThumbsUp size={16} />} /><Step number="2" label="Kanala abone ol" done={subscribed} disabled={!liked || submitted} onClick={() => setSubscribed(true)} icon={<Video size={16} />} /><Step number="3" label={`${task.duration} sn izle`} done={watched >= task.duration} disabled={!liked || !subscribed || submitted} onClick={() => setPlaying(true)} icon={<Clock3 size={16} />} /></div><div className="verify-panel"><div className="verify-copy"><ShieldCheck size={19} /><div><strong>{submitted ? 'Görev admin onayına gönderildi' : code ? 'Kod ekranda — son adım' : 'Kanıt zinciri hazırlanıyor'}</strong><span>{submitted ? 'Puan onaydan sonra hesabına eklenir.' : code ? 'Video üzerindeki kodu forma girerek tamamla.' : liked && subscribed ? 'Video oynarken gerçek izleme süren kaydedilir.' : 'Adımları sırayla tamamla; her işlem senin hesabından yapılır.'}</span></div></div>{!submitted && <div className="code-form"><input value={codeInput} onChange={event => setCodeInput(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Secret Code" inputMode="numeric" disabled={!code} /><button onClick={submit} disabled={!canSubmit}>Görevi tamamla</button></div>}</div></div></div>}
    {toast && <div className="toast"><Check size={18} />{toast}</div>}
    <nav className="bottom-nav"><button className="active"><Sparkles size={18} />Akış</button><button><Heart size={18} />Görevler</button><button><ShieldCheck size={18} />Kanıtlar</button><button><UserRound size={18} />Profil</button></nav>
  </div>;
}

function Step({ number, label, done, disabled, onClick, icon }: { number: string; label: string; done: boolean; disabled: boolean; onClick: () => void; icon: ReactNode }) {
  return <button className={`step ${done ? 'done' : ''}`} disabled={disabled} onClick={onClick}><span className="step-num">{done ? <Check size={13} /> : number}</span><span className="step-icon">{icon}</span><span>{label}</span>{done && <small>tamam</small>}</button>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
