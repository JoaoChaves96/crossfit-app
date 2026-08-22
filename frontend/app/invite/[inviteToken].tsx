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
import { useGym } from '@/hooks/useGym';
import { createApiClient, ApiError } from '@/utils/api-client';
import { routeForRole } from '@/utils/routeForRole';
import { Ink, Status } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import type { components } from '@/types/api.gen';

// ─── Generated API types ──────────────────────────────────────────────────────

type ValidateInviteResponse = components['schemas']['ValidateInviteResponseDto'];
type AcceptInviteResponse = components['schemas']['AcceptInviteResponseDto'];

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
  | { phase: 'accepting'; invite: ValidateInviteResponse }
  | { phase: 'error-accept'; message: string; invite: ValidateInviteResponse };

export default function InviteAcceptanceScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const gym = useGym();
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

    setState({ phase: 'accepting', invite });

    try {
      const client = createApiClient({ token: auth?.token });
      const result = await client.post<AcceptInviteResponse>(
        `/api/invites/${inviteToken}/accept`,
      );

      // The token we arrived with predates this acceptance: its gymId/role
      // claims are stale (null for a fresh registration), and every gym-scoped
      // request would 403. Replacing it is what makes the next screen work.
      await auth?.login(result.token);

      // The token alone is not enough: gym-scoped screens read the gym from
      // GymContext, not from the token, and nothing else writes it on this
      // path. Without this an accepted coach lands on a screen that never
      // issues a request until they log out and back in. Same for an athlete.
      //
      // Cannot fail this acceptance: by this point the server has committed the
      // staff/membership row, so a storage failure must not route the user into
      // the error state. That state offers "Try Again", which re-posts accept
      // and now answers 400 — telling someone who really is a coach, twice,
      // that they are not.
      //
      // setCurrentGymId already absorbs its own persistence failure, so this
      // catch is deliberate redundancy rather than a live path. It stays because
      // this is the one writer whose bad outcome is unrepairable by the user,
      // and the one that cannot be made safe by ordering instead: the gym has to
      // be written before we navigate, or the destination mounts without it.
      try {
        await gym.setCurrentGymId(result.gym.id);
      } catch {
        console.error(
          '[invite] accepted, but persisting gym context failed; this session works, a restart will not',
        );
      }

      routeForRole(router, result.role);
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
    const isCoachInvite = invite.role === 'coach';
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.contentWrap}>
            <HeroSection
              title={isCoachInvite ? "You've been invited to coach" : undefined}
              subtitle={
                isCoachInvite
                  ? `Coach at ${invite.gymName} on BoxOps`
                  : `Join ${invite.gymName} on BoxOps`
              }
            />
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
    const isCoachInvite = state.invite.role === 'coach';
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Ink.strong} />
          <Text size="body" tone={Ink.muted} style={styles.acceptingText}>
            {isCoachInvite ? 'Setting you up as coach...' : 'Joining gym...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Ready ────────────────────────────────────────────────────────────────

  const { invite } = state;
  const isCoachInvite = invite.role === 'coach';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.contentWrap}>
          <HeroSection
            title={isCoachInvite ? "You've been invited to coach" : undefined}
            subtitle={
              isCoachInvite
                ? `Coach at ${invite.gymName} on BoxOps`
                : `Join ${invite.gymName} on BoxOps`
            }
          />
          <GymCard invite={invite} />
        </View>
        <View style={styles.ctaSection}>
          <JoinButton
            onPress={() => void handleJoin(invite)}
            label={isCoachInvite ? 'Accept & Join as Coach' : 'Join Gym'}
          />
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
          <Text size="meta" tone={Ink.muted}>Role</Text>
          <Text size="meta" weight="medium" style={styles.metaValue}>
            {invite.role === 'coach' ? 'Coach' : 'Athlete'}
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
  return <Button testID="invite-join-btn" variant="primary" label={label} onPress={onPress} />;
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

