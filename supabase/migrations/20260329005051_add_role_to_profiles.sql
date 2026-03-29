/*
  # Add role column to profiles table

  ## Changes
  - Add `role` column to profiles table with default value 'user'
  - Allows roles: 'user' (student/player), 'profesor', 'admin'
  - Users will select their role during registration
  - Admins can change roles later if needed

  ## New Column
  - `role` (text) - User role: 'user', 'profesor', or 'admin' (defaults to 'user')
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'profesor', 'admin'));