import React, { useContext, useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { createApiClient, ApiError } from '@/utils/api-client';
import { routeForRole } from '@/utils/routeForRole';
import { Ink, Status } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import { styles } from './login.styles';

// ─── Local type for login response (not in Swagger schema) ────────────────────

interface LoginResponse {
  accessToken: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const gym = useContext(GymContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the focused field above the on-screen keyboard (mobile only).
  const kb = useKeyboardAwareScroll();

  // If the user is already authenticated (a valid token was restored from
  // storage on app start), skip the login form and send them to their home
  // screen. Wait for AuthContext to finish loading so we don't redirect on a
  // stale null user.
  useEffect(() => {
    if (!auth || auth.isLoading) return;
    if (auth.isAuthenticated && auth.user) {
      routeForRole(router, auth.user.role);
    }
  }, [auth, router]);

  async function handleSubmit() {
    if (!auth || !gym) return;

    setError(null);
    setIsLoading(true);

    try {
      const client = createApiClient({});
      const response = await client.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      await auth.login(response.accessToken);

      // Decode token to get role and gymId
      const role = getRoleFromToken(response.accessToken);
      const gymId = getGymIdFromToken(response.accessToken);

      // Set gym context if user has a gym
      if (gymId) {
        await gym.setCurrentGymId(gymId);
      }

      routeForRole(router, role);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong email or password. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[styles.scroll, kb.contentInsetStyle]}
        showsVerticalScrollIndicator={false}
        {...kb.scrollViewProps}>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.appIcon}>
            <Icon name="gym" size={26} tone={Ink.inverse} />
          </View>
          <Text size="screen" weight="bold" tracking="snug" style={styles.appName}>
            CrossFit Box
          </Text>
          <Text size="body" tone={Ink.muted} style={styles.tagline}>
            Sign in to your account
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>

          {/* Email field */}
          <View style={styles.field}>
            <Text size="meta" weight="semibold">Email</Text>
            <TextInput
              testID="login-email-input"
              onFocus={kb.onInputFocus}
              onBlur={kb.onInputBlur}
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Ink.faint}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password field */}
          <View style={styles.field}>
            <Text size="meta" weight="semibold">Password</Text>
            <TextInput
              testID="login-password-input"
              onFocus={kb.onInputFocus}
              onBlur={kb.onInputBlur}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Ink.faint}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Inline error */}
          {error !== null ? (
            <Text size="meta" tone={Status.danger} style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Submit button */}
          <Button
            testID="login-submit-btn"
            label="Log In"
            variant="primary"
            onPress={handleSubmit}
            loading={isLoading}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text size="body" tone={Ink.muted}>{"Don't have an account?"}</Text>
          <TouchableOpacity testID="login-register-link" onPress={() => router.push('/register' as never)}>
            <Text size="body" weight="semibold">Sign up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleFromToken(token: string): string | null {
  try {
    const base64 = token.split('.')[1];
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function getGymIdFromToken(token: string): string | null {
  try {
    const base64 = token.split('.')[1];
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.gymId === 'string' ? payload.gymId : null;
  } catch {
    return null;
  }
}

