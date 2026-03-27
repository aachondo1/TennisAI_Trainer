import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, User, Briefcase, Plus, Trash2, Edit3,
  Check, X, ChevronRight, AlertCircle, Loader2, Trophy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ─── DESIGN TOKENS (mismo sistema que Dashboard) ───────────── */
const C = {
  bg:       '#0a0c0e',
  surface:  '#111316',
  panel:    '#161a1e',
  border:   '#1e2328',
  borderHi: '#2a3038',
  accent:   '#b5f542',
  accentDim:'#7ab81a',
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
`;

/* ─── TIPOS ──────────────────────────────────────────────────── */
type Racket = {
  id: string;
  brand: string;
  model: string;
  head_size: string;
  nickname: string;
};

type ProfileData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  dominant_hand: 'right' | 'left' | '';
  equipment_bag: Racket[];
};

/* ─── HELPERS ────────────────────────────────────────────────── */
const genId = () => Math.random().toString(36).slice(2, 10);

/* ─── COMPONENTES ATÓMICOS ───────────────────────────────────── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: C.textMut, fontFamily: "'DM Mono', monospace", marginBottom: 16,
  }}>{children}</div>
);

const InputField = ({
  label, value, onChange, type = 'text', placeholder = '', readOnly = false, hint = ''
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean; hint?: string;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, color: C.textSec, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        background: readOnly ? C.surface : C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: readOnly ? C.textMut : C.textPri,
        fontSize: 14,
        fontFamily: "'DM Sans', sans-serif",
        outline: 'none',
        cursor: readOnly ? 'default' : 'text',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = C.accent + '80'; }}
      onBlur={e => { e.target.style.borderColor = C.border; }}
    />
    {hint && <span style={{ fontSize: 11, color: C.textMut }}>{hint}</span>}
  </div>
);

/* ─── MODAL NUEVA / EDITAR RAQUETA ───────────────────────────── */
const RacketModal = ({
  racket, onSave, onClose
}: {
  racket: Racket | null;
  onSave: (r: Racket) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<Racket>(
    racket ?? { id: genId(), brand: '', model: '', head_size: '', nickname: '' }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Racket, string>>>({});

  const set = (k: keyof Racket) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.brand.trim()) e.brand = 'Requerido';
    if (!form.model.trim()) e.model = 'Requerido';
    if (!form.head_size.trim()) e.head_size = 'Requerido';
    if (!form.nickname.trim()) e.nickname = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave(form);
  };

  const headSizes = ['93 sq in', '95 sq in', '97 sq in', '98 sq in', '100 sq in', '102 sq in', '104 sq in', '107 sq in', '110+ sq in'];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 16,
        padding: 32, width: '100%', maxWidth: 480,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>
              {racket ? 'Editar Raqueta' : 'Agregar Raqueta'}
            </div>
            <div style={{ fontSize: 12, color: C.textMut, marginTop: 2 }}>
              {racket ? 'Modifica los datos de tu raqueta' : 'Agrega una raqueta a tu bolso'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <InputField label="MARCA" value={form.brand} onChange={set('brand')} placeholder="Wilson, Babolat, Head…" />
              {errors.brand && <span style={{ fontSize: 11, color: C.red }}>{errors.brand}</span>}
            </div>
            <div>
              <InputField label="MODELO" value={form.model} onChange={set('model')} placeholder="Pro Staff, Pure Drive…" />
              {errors.model && <span style={{ fontSize: 11, color: C.red }}>{errors.model}</span>}
            </div>
          </div>

          {/* Tamaño de cabeza */}
          <div>
            <label style={{ fontSize: 11, color: C.textSec, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              TAMAÑO DE CABEZA
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {headSizes.map(s => (
                <button
                  key={s}
                  onClick={() => set('head_size')(s)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${form.head_size === s ? C.accent : C.border}`,
                    background: form.head_size === s ? C.accent + '18' : 'transparent',
                    color: form.head_size === s ? C.accent : C.textSec,
                    cursor: 'pointer', fontFamily: "'DM Mono', monospace",
                    transition: 'all 0.15s',
                  }}
                >{s}</button>
              ))}
            </div>
            {errors.head_size && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: 'block' }}>{errors.head_size}</span>}
          </div>

          <div>
            <InputField
              label="APODO"
              value={form.nickname}
              onChange={set('nickname')}
              placeholder="Ej: La Bestia, Mi Wilson, Azulita…"
              hint="El nombre que usas para identificarla"
            />
            {errors.nickname && <span style={{ fontSize: 11, color: C.red }}>{errors.nickname}</span>}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.textSec, fontSize: 14, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            }}
          >Cancelar</button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 8, border: 'none',
              background: C.accent, color: '#0a0c0e', fontSize: 14, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Check size={16} />
            {racket ? 'Guardar Cambios' : 'Agregar al Bolso'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── TARJETA DE RAQUETA ─────────────────────────────────────── */
const RacketCard = ({
  racket, onEdit, onDelete
}: {
  racket: Racket;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.15s',
      fontFamily: "'DM Sans', sans-serif",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {/* Ícono */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: C.accent + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {/* Ícono raqueta SVG inline */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="10" cy="9" rx="6" ry="8" />
          <line x1="10" y1="17" x2="10" y2="21" />
          <line x1="7" y1="21" x2="13" y2="21" />
          <line x1="4" y1="9" x2="16" y2="9" />
          <line x1="10" y1="3" x2="10" y2="15" />
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>
            {racket.nickname}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: C.blue + '18', color: C.blue, border: `1px solid ${C.blue}30`,
            fontFamily: "'DM Mono', monospace", fontWeight: 500,
          }}>{racket.head_size}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textSec }}>
          {racket.brand} {racket.model}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: C.amber, marginRight: 4 }}>¿Eliminar?</span>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              style={{
                padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.red}`,
                background: C.red + '18', color: C.red, fontSize: 12,
                cursor: 'pointer', fontFamily: "'DM Mono', monospace",
              }}
            >Sí</button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSec, fontSize: 12,
                cursor: 'pointer',
              }}
            >No</button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSec, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSec, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── PÁGINA PRINCIPAL ───────────────────────────────────────── */
export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    email: '',
    first_name: '',
    last_name: '',
    dominant_hand: '',
    equipment_bag: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const [racketModal, setRacketModal] = useState<{ open: boolean; racket: Racket | null }>({
    open: false, racket: null,
  });

  /* ── Cargar perfil ── */
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile({
          id: data.id,
          email: data.email || user.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          dominant_hand: data.dominant_hand || '',
          equipment_bag: Array.isArray(data.equipment_bag) ? data.equipment_bag : [],
        });
      } else {
        // Perfil aún no tiene email guardado
        setProfile(p => ({ ...p, email: user.email || '', id: user.id }));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  /* ── Guardar perfil ── */
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus('idle');
    setSaveError('');

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: profile.email,
      first_name: profile.first_name.trim() || null,
      last_name: profile.last_name.trim() || null,
      dominant_hand: profile.dominant_hand || null,
      equipment_bag: profile.equipment_bag,
    }, { onConflict: 'id' });

    setSaving(false);
    if (error) {
      setSaveStatus('error');
      setSaveError(error.message);
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [user, profile]);

  /* ── CRUD raquetas ── */
  const handleSaveRacket = (racket: Racket) => {
    setProfile(p => ({
      ...p,
      equipment_bag: p.equipment_bag.some(r => r.id === racket.id)
        ? p.equipment_bag.map(r => r.id === racket.id ? racket : r)
        : [...p.equipment_bag, racket],
    }));
    setRacketModal({ open: false, racket: null });
  };

  const handleDeleteRacket = (id: string) => {
    setProfile(p => ({ ...p, equipment_bag: p.equipment_bag.filter(r => r.id !== id) }));
  };

  /* ── Styles ── */
  const s = {
    page: {
      minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.textPri,
    } as React.CSSProperties,
    card: {
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 28,
    } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{fonts}</style>
        <Loader2 size={36} style={{ color: C.accent, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{fonts}</style>

      {/* ── Navbar ── */}
      <nav style={{
        borderBottom: `1px solid ${C.border}`, background: C.surface,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textSec, textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={18} style={{ color: C.accent }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri }}>TennisAI</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textMut }}>
          {profile.email}
        </div>
      </nav>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: C.textPri, marginBottom: 6 }}>
            Mi Perfil
          </div>
          <div style={{ fontSize: 14, color: C.textSec }}>
            Tu información personal y equipamiento para sesiones de análisis
          </div>
        </div>

        {/* ── Sección Datos Personales ── */}
        <div style={{ ...s.card, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: C.accent + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={17} style={{ color: C.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>Datos Personales</div>
              <div style={{ fontSize: 11, color: C.textMut }}>Tu información básica de jugador</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InputField
                label="NOMBRE"
                value={profile.first_name}
                onChange={v => setProfile(p => ({ ...p, first_name: v }))}
                placeholder="Tu nombre"
              />
              <InputField
                label="APELLIDO"
                value={profile.last_name}
                onChange={v => setProfile(p => ({ ...p, last_name: v }))}
                placeholder="Tu apellido"
              />
            </div>

            <InputField
              label="CORREO ELECTRÓNICO"
              value={profile.email}
              readOnly
              hint="El email no puede modificarse"
            />

            {/* Mano dominante */}
            <div>
              <label style={{ fontSize: 11, color: C.textSec, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                MANO DOMINANTE
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'right', label: 'Diestro', emoji: '🤜' },
                  { value: 'left', label: 'Zurdo', emoji: '🤛' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setProfile(p => ({ ...p, dominant_hand: opt.value as 'right' | 'left' }))}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 10,
                      border: `1px solid ${profile.dominant_hand === opt.value ? C.accent : C.border}`,
                      background: profile.dominant_hand === opt.value ? C.accent + '12' : C.panel,
                      color: profile.dominant_hand === opt.value ? C.accent : C.textSec,
                      fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      fontWeight: profile.dominant_hand === opt.value ? 600 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                    {opt.label}
                    {profile.dominant_hand === opt.value && (
                      <Check size={14} style={{ color: C.accent }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sección Mi Bolso ── */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: C.blue + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Briefcase size={17} style={{ color: C.blue }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>Mi Bolso</div>
                <div style={{ fontSize: 11, color: C.textMut }}>
                  {profile.equipment_bag.length === 0
                    ? 'Sin raquetas cargadas'
                    : `${profile.equipment_bag.length} raqueta${profile.equipment_bag.length > 1 ? 's' : ''} en tu bolso`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setRacketModal({ open: true, racket: null })}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${C.accent + '60'}`,
                background: C.accent + '12', color: C.accent,
                fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accent + '22'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.accent + '12'; }}
            >
              <Plus size={15} />
              Agregar Raqueta
            </button>
          </div>

          {/* Lista de raquetas */}
          {profile.equipment_bag.length === 0 ? (
            <div style={{
              border: `1px dashed ${C.border}`, borderRadius: 12,
              padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎾</div>
              <div style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>Tu bolso está vacío</div>
              <div style={{ fontSize: 12, color: C.textMut }}>
                Agrega tus raquetas para que el Agente Coach conozca tu equipamiento
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profile.equipment_bag.map(racket => (
                <RacketCard
                  key={racket.id}
                  racket={racket}
                  onEdit={() => setRacketModal({ open: true, racket })}
                  onDelete={() => handleDeleteRacket(racket.id)}
                />
              ))}
            </div>
          )}

          {/* Hint de uso */}
          {profile.equipment_bag.length > 0 && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: C.blue + '08', border: `1px solid ${C.blue + '20'}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertCircle size={14} style={{ color: C.blue, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
                Al subir un video podrás seleccionar qué raqueta usaste en esa sesión.
                Esto queda guardado en el historial aunque modifiques o elimines la raqueta después.
              </span>
            </div>
          )}
        </div>

        {/* ── Botón Guardar ── */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 10, border: 'none',
              background: saving ? C.accentDim : C.accent,
              color: '#0a0c0e', fontSize: 15, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Syne', sans-serif", letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s',
            }}
          >
            {saving ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Guardando…
              </>
            ) : (
              <>
                <Check size={18} />
                Guardar Cambios
              </>
            )}
          </button>

          {/* Feedback */}
          {saveStatus === 'success' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: C.green, fontSize: 13, fontWeight: 500,
            }}>
              <Check size={16} />
              Guardado correctamente
            </div>
          )}
          {saveStatus === 'error' && (
            <div style={{ color: C.red, fontSize: 12 }}>
              {saveError || 'Error al guardar'}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Raqueta ── */}
      {racketModal.open && (
        <RacketModal
          racket={racketModal.racket}
          onSave={handleSaveRacket}
          onClose={() => setRacketModal({ open: false, racket: null })}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.textMut}; }
      `}</style>
    </div>
  );
}
