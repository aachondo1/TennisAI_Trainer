/*
  # Create TennisAI Database Schema

  ## Overview
  This migration creates the core database structure for the TennisAI application,
  including user profiles and tennis session analysis records.

  ## New Tables

  ### `profiles`
  User profile information linked to Supabase Auth users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### `sessions`
  Tennis analysis session records with AI-generated reports
  - `id` (uuid, primary key) - Unique session identifier
  - `user_id` (uuid, foreign key) - References profiles table
  - `session_type` (text) - Type of analysis: forehand, backhand, saque, mezcla
  - `global_score` (integer) - Overall performance score (0-100)
  - `nivel_general` (text) - Player skill level: principiante, intermedio, avanzado, experto
  - `diagnostico_global` (text) - Overall diagnosis from AI analysis
  - `reporte_narrativo` (text) - Complete narrative report
  - `plan_ejercicios` (jsonb) - Weekly exercise plan in JSON format
  - `scores_detalle` (jsonb) - Detailed scores by stroke type in JSON format
  - `created_at` (timestamptz) - Session creation timestamp

  ## Security
  - Enable Row Level Security on both tables
  - Users can only read and write their own data
  - Authenticated users required for all operations
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('forehand', 'backhand', 'saque', 'mezcla')),
  global_score integer CHECK (global_score >= 0 AND global_score <= 100),
  nivel_general text CHECK (nivel_general IN ('principiante', 'intermedio', 'avanzado', 'experto')),
  diagnostico_global text,
  reporte_narrativo text,
  plan_ejercicios jsonb DEFAULT '[]'::jsonb,
  scores_detalle jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions(created_at DESC);
