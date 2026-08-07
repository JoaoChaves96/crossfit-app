import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './[inviteToken].styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { createApiClient, ApiError } from '@/utils/api-client';
import { Ink, Status } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import type { components } from '@/types/api.gen';

// ─── Generated API types ──────────────────────────────────────────────────────

type ValidateInviteResponse = components['schemas']['ValidateInviteResponseDto'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRole(role: ValidateInviteResponse['inviterRole']): string {
  return role === 'owner' ? 'Gym Owner' : 'Coach';
}

function getStatusError(status: ValidateInviteResponse['status']): string | null {
  if (status === 'expired') return 'expired';
  if (status === 'revoked') return 'revoked';
  if (status === 'accepted') return 'accepted';
  return null;
}

function errorTitle(kind: string): string {
  if (kind === 'expired') return 'This invite has expired';
  if (kind === 'revoked') return 'This invite has been revoked';
  if (kind === 'accepted') return 'This invite has already been accepted';
  return 'This invite is not valid';
}

function errorDesc(kind: string): string {
  if (kind === 'expired')
    return 'This invite link is no longer valid. Contact your gym to request a new one.';
  if (kind === 'revoked')
    return 'This invite has been cancelled. Contact your gym to request a new one.';
  if (kind === 'accepted')
    return 'This invite has already been used to join the gym.';
  return 'This invite link is not valid. Contact your gym to request a new one.';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type ScreenState =
  | { phase: 'loading' }
  | { phase: 'error-fetch'; message: string }
  | { phase: 'invalid'; kind: string; invite: ValidateInviteResponse }
  | { phase: 'ready'; invite: ValidateInviteResponse }
  | { phase: 'accepting' }
  | { phase: 'error-accept'; message: string; invite: ValidateInviteResponse };

export default function InviteAcceptanceScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const { inviteToken } = useLocalSearchParams<{ inviteToken: string }>();

  const [state, setState] = useState<ScreenState>({ phase: 'loading' });

  const loadInvite = useCallback(async () => {
    if (!inviteToken) {
      setState({ phase: 'error-fetch', message: 'Invalid invite link.' });
      return;
    }

    setState({ phase: 'loading' });

    try {
      const client = createApiClient({});
      const invite = await client.get<ValidateInviteResponse>(
        `/api/invites/${inviteToken}`,
      );

      const kind = getStatusError(invite.status);
      if (kind !== null) {
        setState({ phase: 'invalid', kind, invite });
      } else {
        setState({ phase: 'ready', invite });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ phase: 'error-fetch', message: 'Invite not found.' });
      } else {
        setState({ phase: 'error-fetch', message: 'Something went wrong. Please try again.' });
      }
    }
  }, [inviteToken]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  function handleDecline() {
    router.replace('/login' as never);
  }

  async function handleJoin(invite: ValidateInviteResponse) {
    if (!inviteToken) return;

    const isAuthenticated = auth?.isAuthenticated ?? false;

    if (!isAuthenticated) {
      router.push({
        pathname: '/register' as never,
        params: {
          inviteToken,
          email: invite.inviteeEmail,
        },
      });
      return;
    }

    setState({ phase: 'accepting' });

    try {
      const client = createApiClient({ token: auth?.token });
      await client.post(`/api/invites/${inviteToken}/accept`);
      router.replace('/(tabs)/schedule' as never);
    } catch (err) {
      let message = 'Something went wrong. Please try again.';
      if (err instanceof ApiError) {
        if (err.status === 400) message = 'This invite is no longer valid.';
        else if (err.status === 409) message = 'You are already a member of this gym.';
        else if (err.status === 404) message = 'Invite not found.';
      }
      setState({ phase: 'error-accept', message, invite });
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (state.phase === 'loading') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Ink.strong} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Fetch error (not found / network) ───────────────────────────────────

  if (state.phase === 'error-fetch') {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.contentWrap}>
            <HeroSection title="Invite unavailable" subtitle="We couldn't load this invite." />
          </View>
          <View style={styles.ctaSection}>
            <ErrorBanner title="Invite not found" desc={state.message} />
            <BackToLoginLink onPress={handleDecline} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Accept error ─────────────────────────────────────────────────────────

  if (state.phase === 'error-accept') {
    const { message, invite } = state;
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.contentWrap}>
            <HeroSection subtitle={`Join ${invite.gymName} on CrossFit Box`} />
            <GymCard invite={invite} />
          </View>
          <View style={styles.ctaSection}>
            <JoinButton onPress={() => void handleJoin(invite)} label="Try Again" />
            <DeclineButton onPress={handleDecline} />
            <ErrorBanner title="Could not join gym" desc={message} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Invalid invite status ────────────────────────────────────────────────

  if (state.phase === 'invalid') {
    const { kind, invite } = state;
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.contentWrap}>
            <HeroSection title="Invite unavailable" subtitle={`This invite to ${invite.gymName} can no longer be used.`} />
            <GymCard invite={invite} />
          </View>
          <View style={styles.ctaSection}>
            <ErrorBanner title={errorTitle(kind)} desc={errorDesc(kind)} />
            <BackToLoginLink onPress={handleDecline} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Accepting in progress ────────────────────────────────────────────────

  if (state.phase === 'accepting') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Ink.strong} />
          <Text size="body" tone={Ink.muted} style={styles.acceptingText}>Joining gym...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Ready ────────────────────────────────────────────────────────────────

  const { invite } = state;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.contentWrap}>
          <HeroSection subtitle={`Join ${invite.gymName} on CrossFit Box`} />
          <GymCard invite={invite} />
        </View>
        <View style={styles.ctaSection}>
          <JoinButton onPress={() => void handleJoin(invite)} label="Join Gym" />
          <DeclineButton onPress={handleDecline} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroSection({
  subtitle,
  title = "You've been invited!",
}: {
  subtitle: string;
  title?: string;
}) {
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroIcon}>
        <Icon name="mail" size={30} tone={Ink.faint} />
      </View>
      <Text size="screen" weight="bold" tracking="snug" style={styles.heroTitle}>
        {title}
      </Text>
      <Text size="body" tone={Ink.muted} style={styles.heroSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

function GymCard({ invite }: { invite: ValidateInviteResponse }) {
  const initials = invite.gymName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.gymCard}>
      <View style={styles.gymCardHeader}>
        <View style={styles.gymAvatar}>
          <Text size="body" weight="bold">{initials}</Text>
        </View>
        <View style={styles.gymTextGroup}>
          <Text size="title" weight="semibold" tracking="snug">{invite.gymName}</Text>
          <Text size="meta" tone={Ink.muted}>
            {invite.gymLocation || 'Welcome to our community!'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.inviteMeta}>
        <View style={styles.metaRow}>
          <Text size="meta" tone={Ink.muted}>Invited by</Text>
          <Text size="meta" weight="medium" style={styles.metaValue}>
            {`${invite.inviterName} (${formatRole(invite.inviterRole)})`}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text size="meta" tone={Ink.muted}>Invited to</Text>
          <Text size="meta" weight="medium" style={styles.metaValue}>{invite.inviteeEmail}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text size="meta" tone={Ink.muted}>Expires</Text>
          <Text size="meta" weight="medium" style={styles.metaValue}>{formatExpiry(invite.expiresAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function JoinButton({ onPress, label }: { onPress: () => void; label: string }) {
  return <Button variant="primary" label={label} onPress={onPress} />;
}

function DeclineButton({ onPress }: { onPress: () => void }) {
  return <Button variant="quiet" label="Decline" onPress={onPress} />;
}

function ErrorBanner({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text size="body" weight="semibold" tone={Status.danger}>{title}</Text>
      <Text size="meta" tone={Status.danger} style={styles.errorDesc}>{desc}</Text>
    </View>
  );
}

function BackToLoginLink({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backToLoginLink} onPress={onPress} activeOpacity={0.7}>
      <Text size="body" weight="medium" tone={Ink.muted}>Back to Login</Text>
    </TouchableOpacity>
  );
}

