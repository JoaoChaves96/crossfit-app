import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useContext, useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthContext, AuthProvider } from '@/context/AuthContext';
import { GymProvider } from '@/context/GymContext';

const DEV_BOOTSTRAP_ROUTE = '/dev-bootstrap';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useContext(AuthContext);

  const isDevBootstrap = __DEV__ && pathname === DEV_BOOTSTRAP_ROUTE;
  const isPublicRoute = pathname.startsWith('/invite/');

  useEffect(() => {
    if (isDevBootstrap) return;
    if (isPublicRoute) return;
    if (!auth || auth.isLoading) return;
    if (!auth.isAuthenticated) {
      router.replace('/login' as never);
    }
    if (auth.isAuthenticated && pathname === DEV_BOOTSTRAP_ROUTE) {
      router.replace('/(tabs)' as never);
    }
  }, [auth, isDevBootstrap, isPublicRoute, pathname, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <GymProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NavigationGuard />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="no-gym" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen
              name="gym-setup"
              options={{ title: 'Create Your Gym', headerShown: true }}
            />
            <Stack.Screen
              name="schedule-dashboard"
              options={{ title: 'Schedule Dashboard', headerShown: false }}
            />
            <Stack.Screen name="invite/[inviteToken]" options={{ headerShown: false }} />
            <Stack.Screen name="coaches" options={{ headerShown: false }} />
            <Stack.Screen name="coach-classes" options={{ headerShown: false }} />
            <Stack.Screen name="coach-class-details" options={{ headerShown: false }} />
            <Stack.Screen name="coach-mark-attendance" options={{ headerShown: false }} />
            {__DEV__ && (
              <Stack.Screen
                name="dev-bootstrap"
                options={{
                  title: 'Dev Bootstrap',
                  headerShown: true,
                }}
              />
            )}
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GymProvider>
    </AuthProvider>
  );
}
