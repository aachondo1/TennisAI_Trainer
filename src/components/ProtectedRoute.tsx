import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from './Navbar';
import { IncompleteProfileBanner } from './IncompleteProfileBanner';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

type ProfileData = {
  id: string;
  dominant_hand: 'right' | 'left' | null;
  equipment_bag: Array<{ id: string; brand: string; model: string }>;
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, dominant_hand, equipment_bag')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile(data as ProfileData);
        }
      };
      loadProfile();
    }
  }, [user]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  const isDominantHandMissing = !profile?.dominant_hand;
  const isEquipmentMissing = !profile?.equipment_bag || profile.equipment_bag.length === 0;

  return (
    <>
      <Navbar />
      <IncompleteProfileBanner
        isDominantHandMissing={isDominantHandMissing}
        isEquipmentMissing={isEquipmentMissing}
      />
      {children}
    </>
  );
}
