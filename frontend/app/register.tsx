import React, { useContext, useState } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { ApiError, createApiClient } from '@/utils/api-client';
import { Ink, Status } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import { styles } from './register.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterResponse {
  accessToken: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const { email: emailParam, inviteToken } = useLocalSearchParams<{
    email?: string;
    inviteToken?: string;
  }>();

  const prefillEmail = emailParam ?? '';
  const fromInvite = typeof inviteToken === 'string' && inviteToken.length > 0;

  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Keep the focused field above the on-screen keyboard (mobile only).
  const kb = useKeyboardAwareScroll();

  const handleRegister = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const client = createApiClient({});
      const response = await client.post<RegisterResponse>('/api/auth/register', {
        name,
        email,
        password,
      });

      await auth?.login(response.accessToken);

      if (fromInvite) {
        router.replace(`/invite/${inviteToken}` as never);
      } else {
        router.replace('/no-gym' as never);
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : (err as { status?: number }).status;
      if (status === 409) {
        setError('An account with this email already exists.');
      } else if (status === 400) {
        setError('Please check your details and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[styles.scrollContent, kb.contentInsetStyle]}
        {...kb.scrollViewProps}>
        {/* Status Bar placeholder */}
        <View style={styles.statusBar} />

        {/* Content */}
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.appIcon}>
              <Icon name="gym" size={26} tone={Ink.inverse} />
            </View>
            <Text size="screen" weight="bold" tracking="snug" style={styles.brandName}>
              CrossFit Box
            </Text>
            <Text size="body" tone={Ink.muted} style={styles.brandTagline}>
              Create your account
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Field */}
            <View style={styles.field}>
              <Text size="meta" weight="semibold">Name</Text>
              <TextInput
                testID="register-name-input"
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={Ink.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Email Field */}
            <View style={styles.field}>
              <Text size="meta" weight="semibold">Email</Text>
              <TextInput
                testID="register-email-input"
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
                style={[styles.input, fromInvite && styles.inputReadOnly]}
                placeholder="your@email.com"
                placeholderTextColor={Ink.faint}
                value={email}
                onChangeText={fromInvite ? undefined : setEmail}
                editable={!fromInvite}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password Field */}
            <View style={styles.field}>
              <Text size="meta" weight="semibold">Password</Text>
              <TextInput
                testID="register-password-input"
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Ink.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            {/* Inline error */}
            {error !== null ? (
              <Text size="meta" tone={Status.danger} style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Submit Button */}
            <Button
              testID="register-submit-btn"
              label="Create Account"
              variant="primary"
              onPress={handleRegister}
              loading={isLoading}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text size="body" tone={Ink.muted}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/login' as never)}>
              <Text size="body" weight="semibold">Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

