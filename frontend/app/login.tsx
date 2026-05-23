import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createApiClient, ApiError } from '@/utils/api-client';
import { AppColors } from '@/constants/theme';
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
              testID="login-email-input"
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={AppColors.textGray500}
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
              testID="login-password-input"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={AppColors.textGray500}
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
            testID="login-submit-btn"
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
            ) : (
              <Text style={styles.loginBtnLabel}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account?"}</Text>
          <TouchableOpacity testID="login-register-link" onPress={() => router.push('/register' as never)}>
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

