import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from './Navbar';
import { IncompleteProfileBanner } from './IncompleteProfileBanner';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

type ProfileData = {
  id: string;
  dominant_hand: 'right' | 'left' | null;
  equipment_bag: Array<{ id: string; brand: string; model: string }> | null;
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      setProfileError(false);
      const loadProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, dominant_hand, equipment_bag')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error loading profile:', error);
          setProfileError(true);
        } else if (data) {
          setProfile(data as ProfileData);
        }
        setProfileLoading(false);
      };
      loadProfile();
    } else {
      setProfileLoading(false);
    }
  }, [user?.id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  // Only show banner after profile loaded successfully, and not on /profile page
  const isDominantHandMissing = !profileLoading && !profileError && !profile?.dominant_hand;
  const isEquipmentMissing = !profileLoading && !profileError && (!profile?.equipment_bag || profile.equipment_bag.length === 0);
  const showBanner = location.pathname !== '/profile' && (isDominantHandMissing || isEquipmentMissing);

  return (
    <>
      <Navbar />
      {showBanner && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 32px 0' }}>
          <IncompleteProfileBanner
            isDominantHandMissing={isDominantHandMissing}
            isEquipmentMissing={isEquipmentMissing}
          />
        </div>
      )}
      {children}
    </>
  );
}
