import { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';

// Entry route. Expo Router lands here on cold launch; we forward to the
// authenticated user's role home (mirroring login's routeForRole) or to
// /login when signed out. Kept in sync with app/login.tsx.
function homeForRole(role: string | null): string {
  if (role === 'owner') return '/schedule-dashboard';
  if (role === 'coach') return '/coach-classes';
  if (role === 'athlete') return '/(tabs)/schedule';
  return '/no-gym';
}

export default function Index() {
  const auth = useContext(AuthContext);

  if (!auth || auth.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={AppColors.brandPrimary} />
      </View>
    );
  }

  if (!auth.isAuthenticated) {
    return <Redirect href={'/login' as never} />;
  }

  return <Redirect href={homeForRole(auth.user?.role ?? null) as never} />;
}
