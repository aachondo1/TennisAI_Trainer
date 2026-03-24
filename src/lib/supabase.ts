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
  session_type: 'forehand' | 'backhand' | 'saque' | 'mezcla';
  global_score: number;
  nivel_general: 'principiante' | 'intermedio' | 'avanzado' | 'experto';
  diagnostico_global: string;
  reporte_narrativo: string;
  plan_ejercicios: ExercisePlan[];
  scores_detalle: ScoresDetalle;
  created_at: string;
};

export type ExercisePlan = {
  dia: string;
  ejercicios: string[];
};

export type ScoresDetalle = {
  forehand?: number;
  backhand?: number;
  saque?: number;
  [key: string]: number | undefined;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};
