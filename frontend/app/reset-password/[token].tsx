import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { createApiClient, ApiError } from '@/utils/api-client';
import { routeForRole } from '@/utils/routeForRole';
import { Ink, Status } from '@/constants/design';
import { Text, Icon, Button, PasswordField } from '@/components/cleanink';
import type { components } from '@/types/api.gen';
import { styles } from './[token].styles';

// ─── Generated API types ──────────────────────────────────────────────────────

type ValidateResetTokenResponse = components['schemas']['ValidateResetTokenResponseDto'];
type LoginResponse = components['schemas']['LoginResponseDto'];

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'invalid' | 'form';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const { token } = useLocalSearchParams<{ token: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the focused field above the on-screen keyboard (mobile only).
  const kb = useKeyboardAwareScroll();

  // Check the link before drawing a form for it. Any failure — an unknown,
  // expired or spent token, or a network error — lands in 'invalid': asking for
  // a password the backend is going to refuse wastes the one attempt the user
  // came here to make.
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!token) {
        if (!cancelled) setPhase('invalid');
        return;
      }

      try {
        const client = createApiClient({});
        const result = await client.get<ValidateResetTokenResponse>(
          `/api/auth/reset-password/${token}/validate`,
        );
        if (!cancelled) setPhase(result.valid ? 'form' : 'invalid');
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit() {
    if (isLoading) return;

    if (password === '' || confirm === '') {
      setError('Enter your new password twice.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const client = createApiClient({});
      const response = await client.post<LoginResponse>('/api/auth/reset-password', {
        token,
        password,
      });

      await auth?.login(response.accessToken);

      // No gym context is written here, unlike login: the reissued token already
      // carries the gym in its claims, and a reset is not a place to change gyms.
      routeForRole(router, getRoleFromToken(response.accessToken));
    } catch (err) {
      // The backend's 400 is the single message covering unknown, expired and
      // already-used alike — it is the right thing to show, so pass it through.
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setIsLoading(false);
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <View style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Ink.strong} />
        </View>
      </View>
    );
  }

  // ─── Invalid link ────────────────────────────────────────────────────────

  if (phase === 'invalid') {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Brand tagline="Reset link unavailable" />

          <View style={styles.card}>
            <View style={styles.invalidBody}>
              <View style={styles.invalidIcon}>
                <Icon name="info" size={24} tone={Ink.faint} />
              </View>
              <Text
                testID="reset-invalid-message"
                size="body"
                tone={Status.danger}
                style={styles.invalidMessage}>
                This reset link has expired or has already been used.
              </Text>
            </View>

            {/* The one accent in this phase — the only way forward. */}
            <Button
              testID="reset-request-new-link"
              label="Request a new link"
              variant="primary"
              onPress={() => router.push('/forgot-password' as never)}
            />
          </View>

          <BackToLogin onPress={() => router.push('/login' as never)} />
        </ScrollView>
      </View>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[styles.scroll, kb.contentInsetStyle]}
        showsVerticalScrollIndicator={false}
        {...kb.scrollViewProps}>

        <Brand tagline="Set a new password" />

        <View style={styles.card}>
          <Text size="meta" tone={Ink.muted} style={styles.hint}>
            Choose a new password. You&apos;ll be signed in straight away.
          </Text>

          {/* New password */}
          <PasswordField
            testID="reset-password-input"
            label="New password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
            editable={!isLoading}
            onFocus={kb.onInputFocus}
            onBlur={kb.onInputBlur}
          />

          {/* Confirm */}
          <PasswordField
            testID="reset-confirm-input"
            label="Confirm new password"
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              if (error) setError(null);
            }}
            editable={!isLoading}
            onFocus={kb.onInputFocus}
            onBlur={kb.onInputBlur}
          />

          {/* Inline error — the deeper danger red, not the accent. */}
          {error !== null ? (
            <Text testID="reset-error" size="meta" tone={Status.danger} style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          {/* The one accent on this view. */}
          <Button
            testID="reset-submit-btn"
            label="Set new password"
            variant="primary"
            onPress={handleSubmit}
            loading={isLoading}
          />
        </View>

        <BackToLogin onPress={() => router.push('/login' as never)} />

      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Brand({ tagline }: { tagline: string }) {
  return (
    <View style={styles.brand}>
      <View style={styles.appIcon}>
        <Icon name="gym" size={26} tone={Ink.inverse} />
      </View>
      <Text size="screen" weight="bold" tracking="snug" style={styles.appName}>
        BoxOps
      </Text>
      <Text size="body" tone={Ink.muted} style={styles.tagline}>
        {tagline}
      </Text>
    </View>
  );
}

function BackToLogin({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity testID="reset-back-to-login" onPress={onPress}>
        <Text size="body" weight="semibold">Back to log in</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Copied from login.tsx rather than imported: it is a private helper there, and
// exporting it is a refactor this screen does not own.
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
