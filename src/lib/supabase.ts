import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Session = {
  id: string;
  user_id: string;
  session_type: 'clase' | 'paleteo' | 'partido';
  global_score: number;
  nivel_general: 'principiante' | 'intermedio' | 'avanzado' | 'experto';
  diagnostico_global: string;
  reporte_narrativo: string;
  plan_ejercicios: ExercisePlan[];
  scores_detalle: ScoresDetalle;
  equipment_used?: Racket | null;
  actual_session_date?: string | null;
  created_at: string;
};

export type ExercisePlan = {
  dia: string;
  ejercicios: string[];
};

export type ScoreDetail = {
  total?: number;
  nivel?: string;
  scores?: Record<string, { score: number }>;
  analisis_tecnico?: {
    fortalezas?: string[];
    debilidades?: string[];
    patron_error_principal?: string;
  };
  metricas_clave?: {
    velocidad_pelota_max?: number;
  };
};

export type ScoresDetalle = {
  forehand?: ScoreDetail;
  backhand?: ScoreDetail;
  saque?: ScoreDetail;
  [key: string]: ScoreDetail | undefined;
};

export type Racket = {
  id: string;
  brand: string;
  model: string;
  head_size: string;
  nickname: string;
};

export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'profesor' | 'admin';
  nivel_general: 'principiante' | 'intermedio' | 'avanzado' | 'experto' | null;
  dominant_hand: 'right' | 'left' | null;
  equipment_bag: Racket[] | null;
  created_at: string;
  updated_at: string;
};
