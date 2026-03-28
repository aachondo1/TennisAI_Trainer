import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useJobPoller, saveJob, clearJob, type JobStatus } from '../hooks/useJobPoller';
import { Upload as UploadIcon, Film, Check, Camera, CalendarDays, Briefcase, Plus, AlertCircle } from 'lucide-react';
import { C } from '../lib/theme';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: opacity(0.5); cursor: pointer;
  }
  input[type="date"]::-webkit-inner-spin-button { display: none; }
  select option { background: #ffffff; color: #0f1923; }
`;

/* ─── TIPOS ───────────────────────────────────────────────────── */
type SessionType = 'clase' | 'paleteo' | 'partido';

type Racket = {
  id: string;
  brand: string;
  model: string;
  head_size: string;
  nickname: string;
};

/* ─── ENDPOINTS ───────────────────────────────────────────────── */
const VISION_ENDPOINT = 'https://aachondo--tennis-vision-pipeline-vision-endpoint.modal.run';

/* ─── CONSTANTES ──────────────────────────────────────────────── */
const SESSION_TYPES: { value: SessionType; label: string; icon: string; desc: string }[] = [
  {
    value: 'clase',
    label: 'Clase',
    icon: '🎓',
    desc: 'Con instructor — se espera mayor corrección técnica y posiciones controladas',
  },
  {
    value: 'paleteo',
    label: 'Paleteo',
    icon: '🎾',
    desc: 'Peloteo libre — técnica en condiciones reales pero sin presión de juego',
  },
  {
    value: 'partido',
    label: 'Partido',
    icon: '🏆',
    desc: 'Situación competitiva — mayor exigencia física, táctica y presión mental',
  },
];

const CAMERA_ORIGINS = [
  { value: 'Red',           label: 'Red',           icon: '🎾' },
  { value: 'Fondo Trasero', label: 'Fondo Trasero', icon: '↑' },
  { value: 'Fondo Frontal', label: 'Fondo Frontal', icon: '↓' },
  { value: 'Lateral',       label: 'Lateral',       icon: '↔' },
];

const CAMERA_POSITIONS = [
  { value: 'Izquierda', label: 'Izquierda del jugador' },
  { value: 'Centro',    label: 'Centro' },
  { value: 'Derecha',   label: 'Derecha del jugador' },
];

const STEPS = ['Tipo de sesión', 'Equipamiento', 'Metadatos', 'Subir video', 'Analizar'];

type ProcessStep = { label: string; statuses: JobStatus[] };

const PROCESS_STEPS: ProcessStep[] = [
  { label: 'Subiendo video a la nube...',               statuses: ['uploading']         },
  { label: 'Comprimiendo y extrayendo frames...',        statuses: ['vision_processing'] },
  { label: 'Detectando pose, jugador y pelota...',       statuses: ['vision_done']       },
  { label: 'Agentes IA analizando tu técnica...',        statuses: ['agents_processing'] },
  { label: 'Generando reporte y plan de ejercicios...', statuses: ['completed']         },
];

const STATUS_LABELS: Record<JobStatus, string> = {
  idle:               'Preparando...',
  uploading:          'Subiendo video...',
  vision_processing:  'Procesando video con visión computacional...',
  vision_done:        'Visión completada — iniciando agentes IA...',
  agents_processing:  'Agentes IA analizando tu técnica...',
  completed:          'Análisis completado ✓',
  error:              'Error en el análisis',
};

/* ─── HELPERS ─────────────────────────────────────────────────── */
const todayISO   = () => new Date().toISOString().split('T')[0];
const formatSize = (bytes: number) => {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

/* ─── UI PRIMITIVES ───────────────────────────────────────────── */
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'DM Mono', monospace",
  }}>{children}</div>
);

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', background: C.surface,
  border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.textPri,
  fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%234a5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', outline: 'none',
};

const BtnBack = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} style={{
    padding: '14px', background: 'none', border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.textSec, fontSize: 13, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  }}>← Atrás</button>
);

const BtnNext = ({ onClick, children = 'Continuar →', disabled = false }: {
  onClick: () => void; children?: React.ReactNode; disabled?: boolean;
}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '14px', background: disabled ? C.border : C.accent,
    border: 'none', borderRadius: 8,
    color: disabled ? C.textMut : '#0f1923',
    fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
  }}>{children}</button>
);

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export function Upload() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [sessionType, setSessionType] = useState<SessionType>('paleteo');
  const [rackets, setRackets]               = useState<Racket[]>([]);
  const [racketLoading, setRacketLoading]   = useState(true);
  const [selectedRacket, setSelectedRacket] = useState<Racket | null>(null);
  const [sessionDate,    setSessionDate]    = useState(todayISO());
  const [cameraOrigin,   setCameraOrigin]   = useState('Fondo Trasero');
  const [cameraPosition, setCameraPosition] = useState('Centro');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging,     setDragging]     = useState(false);
  const [error,        setError]        = useState('');

  const cameraOrientation = `${cameraOrigin}-${cameraPosition}`;

  const poller = useJobPoller({
    sessionMeta: {
      session_date:       sessionDate,
      camera_orientation: cameraOrientation,
      equipment_used:     selectedRacket,
    },
    onCompleted: (sessionId) => { navigate(`/report/${sessionId}`); },
    onError: (msg) => { setError(msg); setStep(3); },
  });

  useEffect(() => {
    const job = poller.resumeIfActive();
    if (job) { poller.setStatus('vision_processing'); setStep(4); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setRacketLoading(true);
      const { data } = await supabase.from('profiles').select('equipment_bag').eq('id', user.id).single();
      const bag: Racket[] = Array.isArray(data?.equipment_bag) ? data.equipment_bag : [];
      setRackets(bag);
      if (bag.length === 1) setSelectedRacket(bag[0]);
      setRacketLoading(false);
    };
    load();
  }, [user]);

  const handleFile = (file: File) => {
    setError('');
    if (!file.type.includes('mp4') && !file.name.endsWith('.mp4')) { setError('Solo se aceptan archivos .mp4'); return; }
    if (file.size > 500 * 1024 * 1024) { setError('El archivo supera el límite de 500MB'); return; }
    setSelectedFile(file); setStep(3);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const handleSubmit = async () => {
    if (!selectedFile || !user) return;
    setError(''); poller.setStatus('uploading'); setStep(4);
    let videoPath = '';
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No autenticado');
      const fileName = `${authUser.id}/${Date.now()}.mp4`;
      videoPath = fileName;
      const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, selectedFile, { contentType: 'video/mp4' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      poller.setStatus('vision_processing');
      const response = await fetch(VISION_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: urlData.publicUrl, session_type: sessionType, user_id: authUser.id, camera_orientation: cameraOrientation, equipment_used: selectedRacket ?? null }),
      });
      if (!response.ok) throw new Error('Error al iniciar el análisis');
      const { vision_job_id } = await response.json();
      if (!vision_job_id) throw new Error('No se recibió vision_job_id');
      saveJob({ vision_job_id, session_type: sessionType, started_at: new Date().toISOString(), session_date: sessionDate, camera: cameraOrientation, racket_name: selectedRacket?.nickname });
      poller.startPolling(vision_job_id);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar el video');
      if (videoPath) await supabase.storage.from('videos').remove([videoPath]);
      clearJob(); poller.setStatus('error'); setStep(3);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     PROCESSING SCREEN
  ══════════════════════════════════════════════════════════════ */
  if (poller.isProcessing) {
    const jobMeta = poller.activeJob;
    const statusOrder: JobStatus[] = ['uploading','vision_processing','vision_done','agents_processing','completed'];
    return (
      <>
        <style>{fonts}</style>
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f1923" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri }}>Tennis<span style={{ color: C.accentDark }}>AI</span></span>
          </div>
          <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accentDark} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
            </div>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: C.textPri, marginBottom: 8, textAlign: 'center' }}>Analizando tu técnica</div>
          <div style={{ fontSize: 14, color: C.textSec, marginBottom: 12, textAlign: 'center' }}>Esto puede tomar entre 5 y 10 minutos. Puedes cerrar esta ventana — recibirás el resultado en el dashboard.</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {(jobMeta?.session_date || sessionDate) && <MetaPill color={C.accent} icon="📅">{new Date(`${jobMeta?.session_date || sessionDate}T12:00:00Z`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</MetaPill>}
            <MetaPill color={C.blue} icon="📷">{jobMeta?.camera || cameraOrientation}</MetaPill>
            {(jobMeta?.racket_name || selectedRacket?.nickname) && <MetaPill color={C.green} icon="🎾">{jobMeta?.racket_name || selectedRacket?.nickname}</MetaPill>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 380 }}>
            {PROCESS_STEPS.map((ps, i) => {
              const currentIdx = statusOrder.indexOf(poller.status);
              const stepMinIdx = Math.min(...ps.statuses.map(s => statusOrder.indexOf(s)));
              const isDone = currentIdx > stepMinIdx, isActive = ps.statuses.includes(poller.status);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: isActive ? C.accent + '10' : 'transparent', border: `1px solid ${isActive ? C.accent + '40' : C.border}`, opacity: !isDone && !isActive ? 0.35 : 1, transition: 'all 0.3s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: isDone ? C.green + '20' : isActive ? C.accent + '20' : C.border, border: `1.5px solid ${isDone ? C.green : isActive ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDone ? <Check size={11} color={C.green} /> : isActive ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'pulse 1.2s ease infinite' }} /> : null}
                  </div>
                  <span style={{ fontSize: 12, color: isDone ? C.textSec : isActive ? C.textPri : C.textMut }}>{ps.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textMut }}>{STATUS_LABELS[poller.status]}</div>
            {(poller.jobId || jobMeta?.vision_job_id) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textMut + '80' }}>job: {(poller.jobId || jobMeta?.vision_job_id)?.slice(0, 8)}...</div>}
          </div>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: C.green + '0c', border: `1px solid ${C.green}30`, borderRadius: 8 }}>
            <Check size={13} color={C.green} />
            <span style={{ fontSize: 12, color: C.textSec }}>Tu análisis continuará aunque cierres esta ventana</span>
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN WIZARD UI
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ marginBottom: 40, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Nuevo análisis</div>
            <div style={{ fontSize: 14, color: C.textSec }}>Sube un video de tu sesión y la IA analizará tu técnica en detalle</div>
          </div>

          {/* STEPPER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? C.green + '20' : i === step ? C.accent + '20' : C.border, border: `1.5px solid ${i < step ? C.green : i === step ? C.accent : C.borderHi}`, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: i < step ? C.green : i === step ? C.accentDark : C.textMut, transition: 'all 0.3s' }}>
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: i === step ? 500 : 400, color: i === step ? C.textPri : C.textMut, transition: 'color 0.3s' }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? C.green + '60' : C.border, margin: '0 12px', transition: 'background 0.3s' }} />}
              </div>
            ))}
          </div>

          {/* STEP 0 — Tipo de sesión */}
      {step === 0 && (
  <div style={{ animation: 'fadeIn 0.3s ease' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 32 }}>
      {SESSION_TYPES.map(({ value, label, icon, desc }) => (
        <button
          key={value}
          onClick={() => setSessionType(value)}
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            textAlign: 'left',
            cursor: 'pointer',
            background: sessionType === value ? C.accent + '10' : C.surface,
            border: `1.5px solid ${sessionType === value ? C.accent : C.border}`,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: sessionType === value ? C.accentDark : C.textPri,
              }}>
                {label}
              </span>
              {sessionType === value && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: C.accentDark,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={10} color="#fff" />
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>{desc}</div>
          </div>
        </button>
      ))}
    </div>
    <button onClick={() => setStep(1)} style={{
      width: '100%', padding: '14px', background: C.accent, color: '#0f1923',
      border: 'none', borderRadius: 8, fontFamily: "'Syne', sans-serif",
      fontSize: 14, fontWeight: 700, cursor: 'pointer',
    }}>
      Continuar →
    </button>
  </div>
)}


          {/* STEP 1 — Equipamiento */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 2 — ¿Con qué raqueta entrenaste?</FieldLabel>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Briefcase size={15} color={C.blue} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: C.textPri }}>Mi Bolso</span>
                  </div>
                  <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.borderHi}`, background: 'transparent', color: C.textSec, fontSize: 11, textDecoration: 'none', fontFamily: "'DM Mono', monospace" }}>
                    <Plus size={11} /> Gestionar bolso
                  </Link>
                </div>
                {racketLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[0, 1].map(i => <div key={i} style={{ height: 64, borderRadius: 10, background: C.panel, border: `1px solid ${C.border}`, animation: 'pulse 1.5s ease infinite' }} />)}
                  </div>
                ) : rackets.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 10 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🎾</div>
                    <div style={{ fontSize: 13, color: C.textSec, marginBottom: 6 }}>Tu bolso está vacío</div>
                    <div style={{ fontSize: 12, color: C.textMut, marginBottom: 16 }}>Puedes continuar sin seleccionar raqueta, o agregar una en tu perfil.</div>
                    <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.accent + '60'}`, background: C.accent + '12', color: C.accentDark, fontSize: 12, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                      <Plus size={13} /> Agregar raqueta al perfil
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rackets.map(racket => {
                      const selected = selectedRacket?.id === racket.id;
                      return (
                        <button key={racket.id} onClick={() => setSelectedRacket(selected ? null : racket)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, textAlign: 'left', background: selected ? C.accent + '10' : C.panel, border: `1.5px solid ${selected ? C.accent : C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: selected ? C.accent + '20' : C.surface, border: `1px solid ${selected ? C.accent + '40' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selected ? C.accent : C.textMut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="10" cy="9" rx="6" ry="8" /><line x1="10" y1="17" x2="10" y2="21" /><line x1="7" y1="21" x2="13" y2="21" /><line x1="4" y1="9" x2="16" y2="9" /><line x1="10" y1="3" x2="10" y2="15" /></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: selected ? C.accentDark : C.textPri, fontFamily: "'Syne', sans-serif" }}>{racket.nickname}</span>
                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: C.blue + '18', color: C.blue, border: `1px solid ${C.blue}30`, fontFamily: "'DM Mono', monospace" }}>{racket.head_size}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.textSec }}>{racket.brand} {racket.model}</div>
                          </div>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: selected ? C.accent : C.border, border: `1.5px solid ${selected ? C.accent : C.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected && <Check size={12} color="#0f1923" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!racketLoading && rackets.length > 0 && !selectedRacket && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8, background: C.amber + '08', border: `1px solid ${C.amber + '25'}` }}>
                    <AlertCircle size={13} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: C.textSec }}>Continuar sin seleccionar raqueta. No se guardará en el historial de esta sesión.</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <BtnBack onClick={() => setStep(0)} />
                <BtnNext onClick={() => setStep(2)} />
              </div>
            </div>
          )}

          {/* STEP 2 — Metadatos */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 3 — Metadatos de la sesión</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CalendarDays size={15} color={C.accentDark} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: C.textPri }}>Fecha del entrenamiento</span>
                  </div>
                  <input type="date" value={sessionDate} max={todayISO()} onChange={(e) => setSessionDate(e.target.value)} style={{ ...selectStyle, background: C.panel, colorScheme: 'light' }} />
                  <div style={{ marginTop: 8, fontSize: 11, color: C.textMut }}>La fecha real del entrenamiento se usará para ordenar tu historial cronológicamente.</div>
                </div>

                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Camera size={15} color={C.blue} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: C.textPri }}>Orientación de la cámara</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>ORIGEN</div>
                      <select value={cameraOrigin} onChange={(e) => setCameraOrigin(e.target.value)} style={selectStyle}>
                        {CAMERA_ORIGINS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>POSICIÓN</div>
                      <select value={cameraPosition} onChange={(e) => setCameraPosition(e.target.value)} style={selectStyle}>
                        {CAMERA_POSITIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.blue + '10', border: `1px solid ${C.blue + '30'}`, borderRadius: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.textSec }}>Orientación activa: </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.blue, fontWeight: 500 }}>{cameraOrientation}</span>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <CourtDiagram origin={cameraOrigin} position={cameraPosition} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: C.textMut }}>Esta información elimina la ambigüedad en el análisis de visión computacional.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <BtnBack onClick={() => setStep(1)} />
                <BtnNext onClick={() => setStep(3)} />
              </div>
            </div>
          )}

          {/* STEP 3 — Subir video */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 4 — Sube tu video</FieldLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <MetaPill color={C.accent} icon="📅">{new Date(`${sessionDate}T12:00:00Z`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</MetaPill>
                <MetaPill color={C.blue} icon="📷">{cameraOrientation}</MetaPill>
                <MetaPill color={C.amber} icon="🎾">{SESSION_TYPES.find(s => s.value === sessionType)?.label}</MetaPill>
                {selectedRacket && <MetaPill color={C.green} icon="🏸">{selectedRacket.nickname}</MetaPill>}
              </div>
              <div onClick={() => !selectedFile && fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} style={{ border: `2px dashed ${dragging ? C.accent : selectedFile ? C.green : C.borderHi}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center', background: dragging ? C.accent + '06' : selectedFile ? C.green + '06' : C.surface, cursor: selectedFile ? 'default' : 'pointer', transition: 'all 0.2s', marginBottom: 20 }}>
                <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileInput} style={{ display: 'none' }} />
                {selectedFile ? (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: C.green + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Film size={24} color={C.green} /></div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: C.textPri, marginBottom: 4 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: C.textSec, marginBottom: 12 }}>{formatSize(selectedFile.size)}</div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} style={{ padding: '6px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSec, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cambiar archivo</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><UploadIcon size={24} color={C.accentDark} /></div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{dragging ? 'Suelta el video aquí' : 'Arrastra tu video o haz clic'}</div>
                    <div style={{ fontSize: 12, color: C.textSec }}>Formato .mp4 · Máximo 500MB</div>
                  </div>
                )}
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Tips para mejores resultados</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['Cámara fija en la posición configurada', 'Jugador visible en todo momento', 'Buena iluminación, sin contraluz', 'Mínimo 30 segundos de video'].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: C.textSec }}><span style={{ color: C.accentDark, flexShrink: 0 }}>→</span>{tip}</div>
                  ))}
                </div>
              </div>
              {error && <div style={{ padding: '12px 16px', background: C.red + '15', border: `1px solid ${C.red + '40'}`, borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <BtnBack onClick={() => { setStep(2); setSelectedFile(null); setError(''); }} />
                <BtnNext onClick={handleSubmit} disabled={!selectedFile}>Analizar video →</BtnNext>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

function MetaPill({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: color + '15', border: `1px solid ${color + '35'}`, borderRadius: 20, fontSize: 11, color, fontFamily: "'DM Mono', monospace" }}>
      <span>{icon}</span><span>{children}</span>
    </div>
  );
}

/* ─── COURT DIAGRAM ───────────────────────────────────────────────────────────
 *
 * Layout (vista cenital):
 *   - Eje Y = profundidad. TOP = Fondo Frontal, BOTTOM = Fondo Trasero (jugador).
 *   - Jugador siempre en mitad inferior.
 *   - NET = línea horizontal en el centro.
 *   - svcB = línea de saque del lado del jugador (mitad inferior).
 *
 * Cámara LATERAL:
 *   - Se posiciona FUERA del costado de la cancha, alineada verticalmente con svcB.
 *   - Esto representa que la cámara está a la altura de la línea de saque (~1.5 m real).
 *   - La línea de saque del jugador se resalta en amber con label.
 *   - Posición Izquierda → costado izquierdo | Derecha/Centro → costado derecho.
 *
 * ─────────────────────────────────────────────────────────────────────────── */
function CourtDiagram({ origin, position }: { origin: string; position: string }) {
  const W = 260, H = 210;

  // Court geometry
  const cL = 60, cR = 200, cT = 24, cB = 176;
  const netY   = (cT + cB) / 2;        // 100
  const halfH  = (cB - cT) / 2;        // 76
  const svcOff = halfH * 0.42;          // ≈ 32
  const svcT   = netY - svcOff;         // ≈ 68
  const svcB   = netY + svcOff;         // ≈ 132 — línea saque del jugador
  const singlesInset = (cR - cL) * 0.10;
  const sL = cL + singlesInset, sR = cR - singlesInset;
  const xCentre = (cL + cR) / 2;       // 130

  const playerX = xCentre;
  const playerY = cB - halfH * 0.30;   // ≈ 153

  const C2 = {
    accentDk: '#4a7a00', amber: '#d97706', blue: '#2563eb',
    green: '#16a34a', border: '#dde1e7', borderHi: '#c4cad4',
    panel: '#f7f8fa', textMut: '#8896a5', textSec: '#4a5568',
  };

  const isLateral = origin === 'Lateral';

  // ── Camera position ──────────────────────────────────────────
  let camX: number, camY: number;

  switch (origin) {
    case 'Fondo Trasero':
      camY = cB + 20;
      camX = position === 'Izquierda' ? cL + 15 : position === 'Derecha' ? cR - 15 : xCentre;
      break;
    case 'Fondo Frontal':
      camY = cT - 20;
      camX = position === 'Izquierda' ? cL + 15 : position === 'Derecha' ? cR - 15 : xCentre;
      break;
    case 'Red':
      camY = netY;
      camX = position === 'Izquierda' ? cL - 20 : position === 'Derecha' ? cR + 20 : xCentre;
      break;
    case 'Lateral':
      // Alineada con la línea de saque del jugador (svcB), fuera del costado
      camY = svcB;
      camX = position === 'Izquierda' ? cL - 26 : cR + 26; // Centro → default derecha
      break;
    default:
      camY = cB + 20; camX = xCentre;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>

      {/* Court fill + alleys */}
      <rect x={cL} y={cT} width={cR - cL} height={cB - cT} fill={C2.accentDk + '0a'} />
      <rect x={cL}  y={cT} width={singlesInset}  height={cB - cT} fill={C2.border + '80'} />
      <rect x={sR}  y={cT} width={singlesInset}  height={cB - cT} fill={C2.border + '80'} />
      <rect x={cL} y={cT} width={cR - cL} height={cB - cT} fill="none" stroke={C2.borderHi} strokeWidth="1.5" />

      {/* Singles sidelines */}
      <line x1={sL} y1={cT} x2={sL} y2={cB} stroke={C2.textMut} strokeWidth="1" />
      <line x1={sR} y1={cT} x2={sR} y2={cB} stroke={C2.textMut} strokeWidth="1" />

      {/* Service lines — svcT siempre normal, svcB resaltada si Lateral */}
      <line x1={sL} y1={svcT} x2={sR} y2={svcT} stroke={C2.textMut} strokeWidth="1" />
      <line
        x1={sL} y1={svcB} x2={sR} y2={svcB}
        stroke={isLateral ? C2.amber : C2.textMut}
        strokeWidth={isLateral ? 1.8 : 1}
        strokeDasharray={isLateral ? '5 2' : undefined}
      />
      {/* Centre service line */}
      <line x1={xCentre} y1={svcT} x2={xCentre} y2={svcB} stroke={C2.textMut} strokeWidth="1" />

      {/* Lateral: label sobre la línea de saque */}
      {isLateral && (
        <text
          x={xCentre} y={svcB - 4}
          textAnchor="middle" fontSize={6.5}
          fill={C2.amber} fontFamily="'DM Mono', monospace"
        >
          ← alt. línea saque →
        </text>
      )}

      {/* Net */}
      <line x1={cL - 4} y1={netY} x2={cR + 4} y2={netY} stroke="#b5f542" strokeWidth="4" opacity={0.15} />
      <line x1={cL - 4} y1={netY} x2={cR + 4} y2={netY} stroke={C2.amber} strokeWidth="2.5" />
      <circle cx={cL - 4} cy={netY} r={3.5} fill={C2.amber} />
      <circle cx={cR + 4} cy={netY} r={3.5} fill={C2.amber} />
      <rect x={xCentre - 14} y={netY - 9} width={28} height={13} rx={3} fill={C2.panel} stroke={C2.amber + '60'} strokeWidth="1" />
      <text x={xCentre} y={netY} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill={C2.amber} fontFamily="'DM Mono', monospace" fontWeight="600">RED</text>

      {/* Zone labels */}
      <text x={xCentre} y={cT - 7} textAnchor="middle" fontSize={7} fill={C2.textMut} fontFamily="'DM Mono', monospace">FONDO FRONTAL</text>
      <text x={xCentre} y={cB + 11} textAnchor="middle" fontSize={7} fill={C2.textMut} fontFamily="'DM Mono', monospace">FONDO TRASERO</text>

      {/* Player */}
      <ellipse cx={playerX} cy={playerY + 1} rx={6} ry={3} fill="#000" opacity={0.2} />
      <circle cx={playerX} cy={playerY} r={5} fill={C2.green} />
      <circle cx={playerX} cy={playerY - 8} r={3.5} fill={C2.green} opacity={0.85} />
      <text x={playerX + 9} y={playerY + 1} fontSize={7} fill={C2.green} fontFamily="'DM Mono', monospace" dominantBaseline="middle">jugador</text>

      {/* Camera → player dashed line */}
      <line x1={camX} y1={camY} x2={playerX} y2={playerY} stroke={C2.blue} strokeWidth="1" strokeDasharray="4 3" opacity={0.5} />

      {/* Camera icon */}
      <circle cx={camX} cy={camY} r={12} fill={C2.blue + '18'} />
      <rect x={camX - 8} y={camY - 6} width={16} height={11} rx={2.5} fill={C2.panel} stroke={C2.blue} strokeWidth="1.5" />
      <circle cx={camX} cy={camY - 0.5} r={3.5} fill="none" stroke={C2.blue} strokeWidth="1.5" />
      <circle cx={camX} cy={camY - 0.5} r={1.5} fill={C2.blue} opacity={0.7} />
      <rect x={camX + 4} y={camY - 9} width={4} height={3} rx={1} fill={C2.panel} stroke={C2.blue} strokeWidth="1" />
      {/* Dot amber = indica altura específica cuando Lateral */}
      {isLateral && <circle cx={camX + 5} cy={camY - 5} r={2.5} fill={C2.amber} />}

      {/* Footer */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={7.5} fill={C2.textSec} fontFamily="'DM Mono', monospace">
        {origin}  ·  {position}
      </text>
    </svg>
  );
}
