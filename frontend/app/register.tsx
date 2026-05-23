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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ApiError, createApiClient } from '@/utils/api-client';
import { AppColors } from '@/constants/theme';
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Status Bar placeholder */}
        <View style={styles.statusBar} />

        {/* Content */}
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandIcon}>⚡</Text>
            <Text style={styles.brandName}>CrossFit Box</Text>
            <Text style={styles.brandTagline}>Create your account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                testID="register-name-input"
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={AppColors.textGray500}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Email Field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                testID="register-email-input"
                style={[styles.input, fromInvite && styles.inputReadOnly]}
                placeholder="your@email.com"
                placeholderTextColor={AppColors.textGray500}
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
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                testID="register-password-input"
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={AppColors.textGray500}
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
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              testID="register-submit-btn"
              style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
              ) : (
                <Text style={styles.registerBtnLabel}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/login' as never)}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

