import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useContext, useEffect } from 'react';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthContext, AuthProvider } from '@/context/AuthContext';
import { GymProvider } from '@/context/GymContext';
import { NotificationsProvider } from '@/context/NotificationsContext';

const DEV_BOOTSTRAP_ROUTE = '/dev-bootstrap';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useContext(AuthContext);

  const isDevBootstrap = __DEV__ && pathname === DEV_BOOTSTRAP_ROUTE;
  // Public (signed-out) routes the guard must never bounce to /login: the invite
  // deep-link plus the auth screens themselves. Without /register here the guard
  // redirects any unauthenticated visitor off the sign-up screen straight back to
  // login, making registration (and the invite → register hand-off) unreachable.
  const isPublicRoute =
    pathname.startsWith('/invite/') || pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (isDevBootstrap) return;
    if (isPublicRoute) return;
    if (!auth || auth.isLoading) return;
    if (!auth.isAuthenticated) {
      router.replace('/login' as never);
    }
    if (auth.isAuthenticated && pathname === DEV_BOOTSTRAP_ROUTE) {
      router.replace('/(tabs)/schedule' as never);
    }
  }, [auth, isDevBootstrap, isPublicRoute, pathname, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Clean Ink type voice — one self-hosted grotesk across web + native.
  // Render nothing until it's ready so text never flashes in the system face.
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GymProvider>
          <NotificationsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NavigationGuard />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
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
            <Stack.Screen
              name="create-class"
              options={{ title: 'Create Class', headerShown: false }}
            />
            <Stack.Screen name="class-management/index" options={{ headerShown: false }} />
            <Stack.Screen name="gym-settings/index" options={{ headerShown: false }} />
            <Stack.Screen name="members" options={{ headerShown: false }} />
            <Stack.Screen name="invites" options={{ headerShown: false }} />
            <Stack.Screen name="edit-class" options={{ headerShown: false }} />
            <Stack.Screen name="class-details" options={{ headerShown: false }} />
            <Stack.Screen name="log-results" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
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
          </NotificationsProvider>
        </GymProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
