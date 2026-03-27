import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, User, Briefcase, Plus, Trash2, Edit3,
  Check, X, AlertCircle, Loader2, Trophy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/theme';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;

type Racket = {
  id: string; brand: string; model: string; head_size: string; nickname: string;
};

type ProfileData = {
  id: string; email: string; first_name: string; last_name: string;
  dominant_hand: 'right' | 'left' | ''; equipment_bag: Racket[];
};

const genId = () => Math.random().toString(36).slice(2, 10);

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
      type={type} value={value} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      style={{
        background: readOnly ? C.panel : C.surface,
        border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '10px 14px',
        color: readOnly ? C.textMut : C.textPri,
        fontSize: 14, fontFamily: "'DM Sans', sans-serif",
        outline: 'none', cursor: readOnly ? 'default' : 'text',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = C.accentDark + '60'; }}
      onBlur={e => { e.target.style.borderColor = C.border; }}
    />
    {hint && <span style={{ fontSize: 11, color: C.textMut }}>{hint}</span>}
  </div>
);

/* ─── RACKET MODAL ───────────────────────────────────────────── */
const RacketModal = ({
  racket, onSave, onClose
}: { racket: Racket | null; onSave: (r: Racket) => void; onClose: () => void; }) => {
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
    setErrors(e); return Object.keys(e).length === 0;
  };

  const headSizes = ['93 sq in','95 sq in','97 sq in','98 sq in','100 sq in','102 sq in','104 sq in','107 sq in','110+ sq in'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
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

          <div>
            <label style={{ fontSize: 11, color: C.textSec, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>TAMAÑO DE CABEZA</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {headSizes.map(s => (
                <button key={s} onClick={() => set('head_size')(s)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12,
                  border: `1px solid ${form.head_size === s ? C.accentDark : C.border}`,
                  background: form.head_size === s ? C.accentDark + '12' : 'transparent',
                  color: form.head_size === s ? C.accentDark : C.textSec,
                  cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'all 0.15s',
                }}>{s}</button>
              ))}
            </div>
            {errors.head_size && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: 'block' }}>{errors.head_size}</span>}
          </div>

          <div>
            <InputField label="APODO" value={form.nickname} onChange={set('nickname')} placeholder="Ej: La Bestia, Mi Wilson, Azulita…" hint="El nombre que usas para identificarla" />
            {errors.nickname && <span style={{ fontSize: 11, color: C.red }}>{errors.nickname}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Cancelar</button>
          <button onClick={() => { if (validate()) onSave(form); }} style={{ flex: 2, padding: '11px 0', borderRadius: 8, border: 'none', background: C.accent, color: '#0f1923', fontSize: 14, cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Check size={16} />
            {racket ? 'Guardar Cambios' : 'Agregar al Bolso'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── RACKET CARD ────────────────────────────────────────────── */
const RacketCard = ({ racket, onEdit, onDelete }: { racket: Racket; onEdit: () => void; onDelete: () => void; }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s', fontFamily: "'DM Sans', sans-serif" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: C.accentDark + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accentDark} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="10" cy="9" rx="6" ry="8" /><line x1="10" y1="17" x2="10" y2="21" /><line x1="7" y1="21" x2="13" y2="21" /><line x1="4" y1="9" x2="16" y2="9" /><line x1="10" y1="3" x2="10" y2="15" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>{racket.nickname}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: C.blue + '12', color: C.blue, border: `1px solid ${C.blue}25`, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{racket.head_size}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textSec }}>{racket.brand} {racket.model}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: C.amber, marginRight: 4 }}>¿Eliminar?</span>
            <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.red}`, background: C.red + '12', color: C.red, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>Sí</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, fontSize: 12, cursor: 'pointer' }}>No</button>
          </>
        ) : (
          <>
            <button onClick={onEdit} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}>
              <Edit3 size={14} />
            </button>
            <button onClick={() => setConfirmDelete(true)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData>({ id: '', email: '', first_name: '', last_name: '', dominant_hand: '', equipment_bag: [] });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'success'|'error'>('idle');
  const [saveError,  setSaveError]  = useState('');
  const [racketModal, setRacketModal] = useState<{ open: boolean; racket: Racket | null }>({ open: false, racket: null });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setProfile({ id: data.id, email: data.email || user.email || '', first_name: data.first_name || '', last_name: data.last_name || '', dominant_hand: data.dominant_hand || '', equipment_bag: Array.isArray(data.equipment_bag) ? data.equipment_bag : [] });
      } else {
        setProfile(p => ({ ...p, email: user.email || '', id: user.id }));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true); setSaveStatus('idle'); setSaveError('');
    const { error } = await supabase.from('profiles').upsert({ id: user.id, email: profile.email, first_name: profile.first_name.trim() || null, last_name: profile.last_name.trim() || null, dominant_hand: profile.dominant_hand || null, equipment_bag: profile.equipment_bag }, { onConflict: 'id' });
    setSaving(false);
    if (error) { setSaveStatus('error'); setSaveError(error.message); }
    else { setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 3000); }
  }, [user, profile]);

  const handleSaveRacket = (racket: Racket) => {
    setProfile(p => ({ ...p, equipment_bag: p.equipment_bag.some(r => r.id === racket.id) ? p.equipment_bag.map(r => r.id === racket.id ? racket : r) : [...p.equipment_bag, racket] }));
    setRacketModal({ open: false, racket: null });
  };

  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{fonts}</style>
      <Loader2 size={36} style={{ color: C.accentDark, animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
      <style>{fonts}</style>

      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textSec, textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 5, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f1923" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 2C6 8 6 16 12 22"/><path d="M12 2C18 8 18 16 12 22"/><line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri }}>Tennis<span style={{ color: C.accentDark }}>AI</span></span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textMut }}>{profile.email}</div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: C.textPri, marginBottom: 6 }}>Mi Perfil</div>
          <div style={{ fontSize: 14, color: C.textSec }}>Tu información personal y equipamiento para sesiones de análisis</div>
        </div>

        {/* Datos Personales */}
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.accentDark + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={17} style={{ color: C.accentDark }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>Datos Personales</div>
              <div style={{ fontSize: 11, color: C.textMut }}>Tu información básica de jugador</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InputField label="NOMBRE" value={profile.first_name} onChange={v => setProfile(p => ({ ...p, first_name: v }))} placeholder="Tu nombre" />
              <InputField label="APELLIDO" value={profile.last_name} onChange={v => setProfile(p => ({ ...p, last_name: v }))} placeholder="Tu apellido" />
            </div>
            <InputField label="CORREO ELECTRÓNICO" value={profile.email} readOnly hint="El email no puede modificarse" />
            <div>
              <label style={{ fontSize: 11, color: C.textSec, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>MANO DOMINANTE</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ value: 'right', label: 'Diestro', emoji: '🤜' }, { value: 'left', label: 'Zurdo', emoji: '🤛' }].map(opt => (
                  <button key={opt.value} onClick={() => setProfile(p => ({ ...p, dominant_hand: opt.value as 'right'|'left' }))} style={{
                    flex: 1, padding: '12px 0', borderRadius: 10,
                    border: `1px solid ${profile.dominant_hand === opt.value ? C.accentDark : C.border}`,
                    background: profile.dominant_hand === opt.value ? C.accentDark + '10' : C.panel,
                    color: profile.dominant_hand === opt.value ? C.accentDark : C.textSec,
                    fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    fontWeight: profile.dominant_hand === opt.value ? 600 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                    {opt.label}
                    {profile.dominant_hand === opt.value && <Check size={14} style={{ color: C.accentDark }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mi Bolso */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blue + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={17} style={{ color: C.blue }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>Mi Bolso</div>
                <div style={{ fontSize: 11, color: C.textMut }}>{profile.equipment_bag.length === 0 ? 'Sin raquetas cargadas' : `${profile.equipment_bag.length} raqueta${profile.equipment_bag.length > 1 ? 's' : ''} en tu bolso`}</div>
              </div>
            </div>
            <button onClick={() => setRacketModal({ open: true, racket: null })} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.accentDark}40`, background: C.accentDark + '08', color: C.accentDark, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentDark + '15'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.accentDark + '08'; }}>
              <Plus size={15} /> Agregar Raqueta
            </button>
          </div>

          {profile.equipment_bag.length === 0 ? (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎾</div>
              <div style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>Tu bolso está vacío</div>
              <div style={{ fontSize: 12, color: C.textMut }}>Agrega tus raquetas para que el Agente Coach conozca tu equipamiento</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profile.equipment_bag.map(racket => (
                <RacketCard key={racket.id} racket={racket}
                  onEdit={() => setRacketModal({ open: true, racket })}
                  onDelete={() => setProfile(p => ({ ...p, equipment_bag: p.equipment_bag.filter(r => r.id !== racket.id) }))}
                />
              ))}
            </div>
          )}

          {profile.equipment_bag.length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: C.blue + '08', border: `1px solid ${C.blue}20`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={14} style={{ color: C.blue, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>Al subir un video podrás seleccionar qué raqueta usaste en esa sesión. Esto queda guardado en el historial aunque modifiques o elimines la raqueta después.</span>
            </div>
          )}
        </div>

        {/* Guardar */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', background: saving ? C.border : C.accent, color: saving ? C.textMut : '#0f1923', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Syne', sans-serif", letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.2s' }}>
            {saving ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Guardando…</> : <><Check size={18} />Guardar Cambios</>}
          </button>
          {saveStatus === 'success' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.green, fontSize: 13, fontWeight: 500 }}><Check size={16} />Guardado correctamente</div>}
          {saveStatus === 'error'   && <div style={{ color: C.red, fontSize: 12 }}>{saveError || 'Error al guardar'}</div>}
        </div>
      </div>

      {racketModal.open && (
        <RacketModal racket={racketModal.racket} onSave={handleSaveRacket} onClose={() => setRacketModal({ open: false, racket: null })} />
      )}
    </div>
  );
}
