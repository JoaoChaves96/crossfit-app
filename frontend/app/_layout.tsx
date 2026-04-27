import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { GymProvider } from '@/context/GymContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <GymProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen
              name="gym-setup"
              options={{ title: 'Create Your Gym', headerShown: true }}
            />
            <Stack.Screen
              name="schedule-dashboard"
              options={{ title: 'Schedule Dashboard', headerShown: false }}
            />
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
