import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload as UploadIcon, Film, Check, Camera, CalendarDays } from 'lucide-react';

/* ─── DESIGN TOKENS ───────────────────────────────────────────── */
const C = {
  bg:       '#0a0c0e',
  surface:  '#111316',
  panel:    '#161a1e',
  border:   '#1e2328',
  borderHi: '#2a3038',
  accent:   '#b5f542',
  blue:     '#4a9eff',
  red:      '#ff5a5a',
  amber:    '#f5a623',
  green:    '#3dd68c',
  textPri:  '#f0f2f4',
  textSec:  '#7a8694',
  textMut:  '#404850',
};

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1) opacity(0.4);
    cursor: pointer;
  }
  input[type="date"]::-webkit-inner-spin-button { display: none; }

  select option { background: #161a1e; color: #f0f2f4; }
`;

type SessionType = 'forehand' | 'backhand' | 'saque' | 'mezcla';

const SESSION_TYPES: { value: SessionType; label: string; desc: string }[] = [
  { value: 'forehand', label: 'Forehand', desc: 'Análisis de tu golpe de derecha' },
  { value: 'backhand', label: 'Backhand', desc: 'Análisis de tu golpe de revés' },
  { value: 'saque',    label: 'Saque',    desc: 'Análisis de tu servicio' },
  { value: 'mezcla',   label: 'Mezcla',   desc: 'Análisis completo de tu juego' },
];

/* ─── CAMERA ORIENTATION OPTIONS ─────────────────────────────── */
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

const STEPS = ['Tipo de sesión', 'Metadatos', 'Subir video', 'Analizar'];

/* ─── HELPERS ─────────────────────────────────────────────────── */
const todayISO = () => new Date().toISOString().split('T')[0];

const formatSize = (bytes: number) => {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

/* ─── SHARED UI PRIMITIVES ────────────────────────────────────── */
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, color: C.textMut,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: 10, fontFamily: "'DM Mono', monospace",
  }}>
    {children}
  </div>
);

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: C.surface,
  border: `1.5px solid ${C.borderHi}`,
  borderRadius: 8,
  color: C.textPri,
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%237a8694' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  outline: 'none',
};

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Steps */
  const [step, setStep] = useState(0);

  /* Step 0 — Session type */
  const [sessionType, setSessionType] = useState<SessionType>('mezcla');

  /* Step 1 — Metadata */
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [cameraOrigin, setCameraOrigin] = useState('Fondo Trasero');
  const [cameraPosition, setCameraPosition] = useState('Centro');

  /* Step 2 — File */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  /* Processing */
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Subiendo video...');
  const [error, setError] = useState('');

  /* ── Derived ── */
  const cameraOrientation = `${cameraOrigin}-${cameraPosition}`;

  /* ── FILE HANDLERS ── */
  const handleFile = (file: File) => {
    setError('');
    if (!file.type.includes('mp4') && !file.name.endsWith('.mp4')) {
      setError('Solo se aceptan archivos .mp4');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('El archivo supera el límite de 500MB');
      return;
    }
    setSelectedFile(file);
    setStep(2);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    if (!selectedFile || !user) return;
    setError('');
    setUploading(true);
    setStep(3);
    let videoPath = '';

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No autenticado');

      const fileName = `${authUser.id}/${Date.now()}.mp4`;
      videoPath = fileName;
      setProcessingMsg('Subiendo video a la nube...');

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, selectedFile, { contentType: 'video/mp4' });

      if (uploadError) throw uploadError;

      setUploading(false);
      setProcessing(true);
      setProcessingMsg('Analizando biomecánica con IA...');

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000);

      const response = await fetch(
        'https://aachondo--tennis-pipeline-v2-analyze-video-endpoint.modal.run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_url: urlData.publicUrl,
            session_type: sessionType,
            user_id: authUser.id,
            camera_orientation: cameraOrientation,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Error al procesar el video');

      const result = await response.json();
      setProcessingMsg('Guardando resultados...');

      await supabase.storage.from('videos').remove([fileName]);

      // Build actual_session_date from the date picker value (noon UTC to avoid TZ drift)
      const actualSessionDate = new Date(`${sessionDate}T12:00:00Z`).toISOString();

      const { data: sessionData, error: dbError } = await supabase
        .from('sessions')
        .insert({
          user_id:             authUser.id,
          session_type:        result.session_type,
          global_score:        result.global_score,
          nivel_general:       result.nivel_general,
          diagnostico_global:  result.reporte?.diagnostico_global || '',
          reporte_narrativo:   result.reporte?.reporte_narrativo_completo || '',
          scores_detalle:      result.reporte?.scores_detalle || {},
          plan_ejercicios:     result.plan_ejercicios || [],
          actual_session_date: actualSessionDate,
          camera_orientation:  cameraOrientation,
        })
        .select();

      if (dbError) throw dbError;
      navigate(`/report/${sessionData![0].id}`);

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar el video');
      if (videoPath) await supabase.storage.from('videos').remove([videoPath]);
      setUploading(false);
      setProcessing(false);
      setStep(selectedFile ? 2 : 0);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     PROCESSING SCREEN
  ══════════════════════════════════════════════════════════════ */
  if (uploading || processing) {
    const msgs = [
      'Extrayendo frames del video...',
      'Analizando posición corporal con MediaPipe...',
      'Detectando jugador y golpes con YOLOv8...',
      'Calculando velocidad de pelota...',
      'Generando reporte técnico con IA...',
    ];
    return (
      <>
        <style>{fonts}</style>
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0c0e" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri }}>Tennis<span style={{ color: C.accent }}>AI</span></span>
          </div>

          <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
          </div>

          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: C.textPri, marginBottom: 8, textAlign: 'center' }}>
            Analizando tu técnica
          </div>
          <div style={{ fontSize: 14, color: C.textSec, marginBottom: 12, textAlign: 'center' }}>
            Esto puede tomar entre 5 y 10 minutos. No cierres esta ventana.
          </div>

          {/* Metadata summary */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            <div style={{ padding: '4px 10px', background: C.accent + '15', border: `1px solid ${C.accent + '30'}`, borderRadius: 20, fontSize: 11, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
              📅 {new Date(`${sessionDate}T12:00:00Z`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ padding: '4px 10px', background: C.blue + '15', border: `1px solid ${C.blue + '30'}`, borderRadius: 20, fontSize: 11, color: C.blue, fontFamily: "'DM Mono', monospace" }}>
              📷 {cameraOrientation}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
            {msgs.map((msg, i) => {
              const done = i < 2;
              const active = i === 2;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: active ? C.accent + '10' : 'transparent', border: `1px solid ${active ? C.accent + '40' : C.border}`, opacity: i > 2 ? 0.35 : 1 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? C.green + '20' : active ? C.accent + '20' : C.border, border: `1.5px solid ${done ? C.green : active ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done ? <Check size={11} color={C.green} /> : active ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'pulse 1.2s ease infinite' }} /> : null}
                  </div>
                  <span style={{ fontSize: 12, color: done ? C.textSec : active ? C.textPri : C.textMut }}>{msg}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 32, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textMut }}>
            {processingMsg}
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN UI
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 32px' }}>

          {/* TITLE */}
          <div style={{ marginBottom: 40, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Nuevo análisis</div>
            <div style={{ fontSize: 14, color: C.textSec }}>Sube un video de tu sesión y la IA analizará tu técnica en detalle</div>
          </div>

          {/* STEPPER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? C.green + '20' : i === step ? C.accent + '20' : C.border,
                    border: `1.5px solid ${i < step ? C.green : i === step ? C.accent : C.borderHi}`,
                    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
                    color: i < step ? C.green : i === step ? C.accent : C.textMut,
                    transition: 'all 0.3s',
                  }}>
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: i === step ? 500 : 400, color: i === step ? C.textPri : C.textMut, transition: 'color 0.3s' }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: i < step ? C.green + '60' : C.border, margin: '0 12px', transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          {/* ─────────────────────────────────────────────────────────
              STEP 0 — Tipo de sesión
          ───────────────────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 1 — Selecciona el tipo de sesión</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                {SESSION_TYPES.map(({ value, label, desc }) => (
                  <button key={value} onClick={() => setSessionType(value)} style={{
                    padding: '18px 20px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                    background: sessionType === value ? C.accent + '10' : C.surface,
                    border: `1.5px solid ${sessionType === value ? C.accent : C.border}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: sessionType === value ? C.accent : C.textPri }}>{label}</span>
                      {sessionType === value && (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#0a0c0e" />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSec }}>{desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} style={{
                width: '100%', padding: '14px', background: C.accent, color: '#0a0c0e',
                border: 'none', borderRadius: 8, fontFamily: "'Syne', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
                Continuar →
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              STEP 1 — Metadatos (fecha + cámara)
          ───────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 2 — Metadatos de la sesión</FieldLabel>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>

                {/* ── Fecha ── */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CalendarDays size={15} color={C.accent} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: C.textPri }}>
                      Fecha del entrenamiento
                    </span>
                  </div>
                  <input
                    type="date"
                    value={sessionDate}
                    max={todayISO()}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{
                      ...selectStyle,
                      background: C.panel,
                      colorScheme: 'dark',
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 11, color: C.textMut }}>
                    La fecha real del entrenamiento se usará para ordenar tu historial cronológicamente.
                  </div>
                </div>

                {/* ── Cámara ── */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Camera size={15} color={C.blue} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: C.textPri }}>
                      Orientación de la cámara
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {/* Origen */}
                    <div>
                      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>ORIGEN</div>
                      <select value={cameraOrigin} onChange={(e) => setCameraOrigin(e.target.value)} style={selectStyle}>
                        {CAMERA_ORIGINS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Posición */}
                    <div>
                      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>POSICIÓN</div>
                      <select value={cameraPosition} onChange={(e) => setCameraPosition(e.target.value)} style={selectStyle}>
                        {CAMERA_POSITIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.blue + '10', border: `1px solid ${C.blue + '30'}`, borderRadius: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.textSec }}>
                      Orientación activa:{' '}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.blue, fontWeight: 500 }}>
                      {cameraOrientation}
                    </span>
                  </div>

                  {/* Court diagram hint */}
                  <div style={{ marginTop: 14 }}>
                    <CourtDiagram origin={cameraOrigin} position={cameraPosition} />
                  </div>

                  <div style={{ marginTop: 10, fontSize: 11, color: C.textMut }}>
                    Esta información elimina la ambigüedad en el análisis de visión computacional.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <button onClick={() => setStep(0)} style={{
                  padding: '14px', background: 'none', border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.textSec, fontSize: 13, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  ← Atrás
                </button>
                <button onClick={() => setStep(2)} style={{
                  padding: '14px', background: C.accent, border: 'none',
                  borderRadius: 8, color: '#0a0c0e', fontFamily: "'Syne', sans-serif",
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              STEP 2 — Subir video
          ───────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <FieldLabel>Paso 3 — Sube tu video</FieldLabel>

              {/* Metadata summary pill row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <MetaPill color={C.accent} icon="📅">
                  {new Date(`${sessionDate}T12:00:00Z`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                </MetaPill>
                <MetaPill color={C.blue} icon="📷">
                  {cameraOrientation}
                </MetaPill>
                <MetaPill color={C.amber} icon="🎾">
                  {SESSION_TYPES.find(s => s.value === sessionType)?.label}
                </MetaPill>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                style={{
                  border: `2px dashed ${dragging ? C.accent : selectedFile ? C.green : C.borderHi}`,
                  borderRadius: 12, padding: '48px 32px', textAlign: 'center',
                  background: dragging ? C.accent + '06' : selectedFile ? C.green + '06' : C.surface,
                  cursor: selectedFile ? 'default' : 'pointer',
                  transition: 'all 0.2s', marginBottom: 20,
                }}
              >
                <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileInput} style={{ display: 'none' }} />

                {selectedFile ? (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: C.green + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Film size={24} color={C.green} />
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: C.textPri, marginBottom: 4 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: C.textSec, marginBottom: 12 }}>{formatSize(selectedFile.size)}</div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} style={{
                      padding: '6px 14px', background: 'none', border: `1px solid ${C.border}`,
                      borderRadius: 6, color: C.textSec, fontSize: 12, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Cambiar archivo
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <UploadIcon size={24} color={C.accent} />
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                      {dragging ? 'Suelta el video aquí' : 'Arrastra tu video o haz clic'}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSec }}>Formato .mp4 · Máximo 500MB</div>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
                  Tips para mejores resultados
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    'Cámara fija en la posición configurada',
                    'Jugador visible en todo momento',
                    'Buena iluminación, sin contraluz',
                    'Mínimo 30 segundos de video',
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: C.textSec }}>
                      <span style={{ color: C.accent, flexShrink: 0 }}>→</span>{tip}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ padding: '12px 16px', background: C.red + '15', border: `1px solid ${C.red + '40'}`, borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <button onClick={() => { setStep(1); setSelectedFile(null); setError(''); }} style={{
                  padding: '14px', background: 'none', border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.textSec, fontSize: 13, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  ← Atrás
                </button>
                <button onClick={handleSubmit} disabled={!selectedFile} style={{
                  padding: '14px', background: selectedFile ? C.accent : C.border,
                  border: 'none', borderRadius: 8, color: selectedFile ? '#0a0c0e' : C.textMut,
                  fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: selectedFile ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                }}>
                  Analizar video →
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════════════════════ */

/** Small colored pill to summarise selected metadata */
function MetaPill({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: color + '15',
      border: `1px solid ${color + '35'}`,
      borderRadius: 20,
      fontSize: 11,
      color,
      fontFamily: "'DM Mono', monospace",
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/** Minimal tennis court SVG diagram showing camera position */
function CourtDiagram({ origin, position }: { origin: string; position: string }) {
  // Map origin + position to a camera dot coordinate on the small court SVG
  const courtW = 260, courtH = 120;
  const courtPad = 20;

  // X position of camera
  const xMap: Record<string, number> = {
    Izquierda: courtPad - 14,
    Centro:    courtW / 2,
    Derecha:   courtW - courtPad + 14,
  };

  // Y position based on origin
  const yMap: Record<string, number> = {
    'Red':           courtH / 2,
    'Fondo Trasero': courtPad - 14,
    'Fondo Frontal': courtH - courtPad + 14,
    'Lateral':       position === 'Izquierda' ? courtH / 2 : courtH / 2,
  };

  const cx = xMap[position] ?? courtW / 2;
  const cy = yMap[origin]   ?? courtPad - 14;

  return (
    <svg
      width={courtW} height={courtH}
      viewBox={`0 0 ${courtW} ${courtH}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      {/* Court outline */}
      <rect x={courtPad} y={courtPad} width={courtW - courtPad * 2} height={courtH - courtPad * 2}
        fill="none" stroke={C.border} strokeWidth="1.5" rx="1" />
      {/* Net */}
      <line x1={courtPad} y1={courtH / 2} x2={courtW - courtPad} y2={courtH / 2}
        stroke={C.borderHi} strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Service boxes */}
      <line x1={courtW / 2} y1={courtPad} x2={courtW / 2} y2={courtH - courtPad}
        stroke={C.border} strokeWidth="1" />
      <line x1={courtPad} y1={courtH / 2 - (courtH - courtPad * 2) * 0.22} x2={courtW - courtPad} y2={courtH / 2 - (courtH - courtPad * 2) * 0.22}
        stroke={C.border} strokeWidth="1" />
      <line x1={courtPad} y1={courtH / 2 + (courtH - courtPad * 2) * 0.22} x2={courtW - courtPad} y2={courtH / 2 + (courtH - courtPad * 2) * 0.22}
        stroke={C.border} strokeWidth="1" />

      {/* Player dot */}
      <circle cx={courtW / 2} cy={courtH / 2 + 15} r={4} fill={C.green} opacity={0.8} />

      {/* Camera */}
      <circle cx={cx} cy={cy} r={6} fill={C.blue + 'cc'} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#0a0c0e" fontWeight="bold">📷</text>

      {/* Dashed line from camera to player */}
      <line x1={cx} y1={cy} x2={courtW / 2} y2={courtH / 2 + 15}
        stroke={C.blue} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />

      {/* Labels */}
      <text x={courtW / 2} y={courtH - 3} textAnchor="middle" fontSize={8} fill={C.textMut} fontFamily="'DM Mono', monospace">
        {origin} · {position}
      </text>
    </svg>
  );
}
