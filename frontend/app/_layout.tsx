import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useContext, useEffect } from 'react';
import { useFonts } from 'expo-font';

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
  // and password-reset deep links plus the auth screens themselves. Without
  // /register here the guard redirects any unauthenticated visitor off the
  // sign-up screen straight back to login, making registration (and the
  // invite → register hand-off) unreachable — and without /reset-password/ a
  // reset link opened from a mail client lands on login instead of the form.
  const isPublicRoute =
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

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
  //
  // Vendored into assets/fonts rather than imported from
  // @expo-google-fonts/hanken-grotesk: that package's path put the exported
  // files under dist/assets/node_modules/…, and Cloudflare Pages skips any
  // path containing a node_modules segment. The fonts were never uploaded, so
  // every .ttf fell through the SPA rewrite and came back as index.html.
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular: require('../assets/fonts/HankenGrotesk_400Regular.ttf'),
    HankenGrotesk_500Medium: require('../assets/fonts/HankenGrotesk_500Medium.ttf'),
    HankenGrotesk_600SemiBold: require('../assets/fonts/HankenGrotesk_600SemiBold.ttf'),
    HankenGrotesk_700Bold: require('../assets/fonts/HankenGrotesk_700Bold.ttf'),
  });

  // Hold the first paint so text never flashes in the system face — but only
  // while loading is still in flight. Gating on fontsLoaded alone meant a
  // single unreachable .ttf returned null forever: a blank page, no error,
  // nothing to debug from. A wrong face beats no app.
  if (!fontsLoaded && !fontError) {
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
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password/[token]" options={{ headerShown: false }} />
            <Stack.Screen name="no-gym" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            {/* The wizard draws its own header. The navigator's had no back
                target, so its arrow fell back to the parent group and sent a
                deep-linked owner into /my-bookings — the athlete surface. */}
            <Stack.Screen name="gym-setup" options={{ headerShown: false }} />
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
