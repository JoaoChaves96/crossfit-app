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
import { ApiError, createApiClient } from '@/utils/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterResponse {
  accessToken: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      router.replace('/no-gym' as never);
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
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#999999"
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
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#999999"
                value={email}
                onChangeText={setEmail}
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
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999999"
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
              style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusBar: {
    height: 62,
  },
  content: {
    flex: 1,
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
  brandIcon: {
    fontSize: 32,
  },
  brandName: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  brandTagline: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 20,
    gap: 16,
  },

  // Fields
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#1A1A1A',
  },

  // Error
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
  },

  // Register Button
  registerBtn: {
    height: 50,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
  },
  loginLink: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
