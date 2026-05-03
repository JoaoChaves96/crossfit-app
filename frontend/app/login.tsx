import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createApiClient, ApiError } from '@/utils/api-client';

// ─── Local type for login response (not in Swagger schema) ────────────────────

interface LoginResponse {
  accessToken: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLOR = {
  bg: '#F5F5F5',
  white: '#FFFFFF',
  black: '#1A1A1A',
  subText: '#666666',
  placeholder: '#999999',
  border: '#E0E0E0',
  cardBorder: '#E8E8E8',
  error: '#DC2626',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const gym = useContext(GymContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (role === 'owner') {
        router.replace('/(tabs)/schedule' as never);
      } else if (role === 'coach') {
        router.replace('/coach-classes' as never);
      } else if (role === 'athlete') {
        router.replace('/(tabs)/schedule' as never);
      } else {
        router.replace('/no-gym' as never);
      }
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.appIcon} />
          <Text style={styles.appName}>CrossFit Box</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>

          {/* Email field */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLOR.placeholder}
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
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLOR.placeholder}
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
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLOR.white} />
            ) : (
              <Text style={styles.loginBtnLabel}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account?"}</Text>
          <TouchableOpacity onPress={() => router.push('/register' as never)}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Brand
  brand: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
    gap: 8,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLOR.black,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.black,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: COLOR.subText,
  },

  // Card
  card: {
    backgroundColor: COLOR.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    padding: 20,
    gap: 16,
  },

  // Field
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.black,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: COLOR.white,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLOR.black,
  },

  // Error
  errorText: {
    fontSize: 13,
    color: COLOR.error,
    marginTop: -4,
  },

  // Button
  loginBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLOR.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.white,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLOR.subText,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.black,
  },
});
