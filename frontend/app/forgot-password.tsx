import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { createApiClient } from '@/utils/api-client';
import { Ink } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import { styles } from './forgot-password.styles';

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = 'form' | 'sent';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');

  // Keep the focused field above the on-screen keyboard (mobile only).
  const kb = useKeyboardAwareScroll();

  async function handleSubmit() {
    const address = email.trim();
    if (address === '' || isLoading) return;

    setIsLoading(true);

    try {
      // Unauthenticated route — no token.
      const client = createApiClient({});
      await client.post('/api/auth/forgot-password', { email: address });
    } catch {
      // Deliberately swallowed. The backend already answers identically for a
      // known address, an unknown one, a throttled request and a failed send;
      // showing an error here would put back the very distinction it removes.
      // The only thing lost is a genuine outage, and the user's recovery is the
      // same either way: try again.
    } finally {
      setIsLoading(false);
      setPhase('sent');
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
            BoxOps
          </Text>
          <Text size="body" tone={Ink.muted} style={styles.tagline}>
            {phase === 'form' ? 'Reset your password' : 'Check your inbox'}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {phase === 'form' ? (
            <>
              <Text size="meta" tone={Ink.muted} style={styles.sentMessage}>
                Enter the email you sign in with and we&apos;ll send you a link to set a
                new password.
              </Text>

              {/* Email field */}
              <View style={styles.field}>
                <Text size="meta" weight="semibold">Email</Text>
                <TextInput
                  testID="forgot-email-input"
                  onFocus={kb.onInputFocus}
                  onBlur={kb.onInputBlur}
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Ink.faint}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* The one accent on this view. */}
              <Button
                testID="forgot-submit-btn"
                label="Send reset link"
                variant="primary"
                onPress={handleSubmit}
                loading={isLoading}
              />
            </>
          ) : (
            <View style={styles.sentBody}>
              <View style={styles.sentIcon}>
                <Icon name="mail" size={24} tone={Ink.faint} />
              </View>
              {/* Quiet meta text, not a banner: there is no success role in this
                  design system, and this copy is also what an unknown address
                  gets. */}
              <Text
                testID="forgot-sent-message"
                size="body"
                tone={Ink.muted}
                style={styles.sentMessage}>
                If an account exists for that address, we&apos;ve sent a reset link. It
                expires in an hour.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text size="body" tone={Ink.muted}>Remembered it?</Text>
          <TouchableOpacity
            testID="forgot-back-to-login"
            onPress={() => router.push('/login' as never)}>
            <Text size="body" weight="semibold">Back to log in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
