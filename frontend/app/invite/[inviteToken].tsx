import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { createApiClient, ApiError } from '@/utils/api-client';
import type { components } from '@/types/api.gen';

// ─── Generated API types ──────────────────────────────────────────────────────

type ValidateInviteResponse = components['schemas']['ValidateInviteResponseDto'];

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLOR = {
  bg: '#FFFFFF',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  border: '#E0E0E0',
  cardBg: '#F5F5F5',
  joinBtn: '#1A1A1A',
  joinBtnText: '#FFFFFF',
  declineBtnText: '#666666',
  errorBg: '#FFF5F5',
  errorBorder: '#FECACA',
  errorTitle: '#D32F2F',
  errorDesc: '#B91C1C',
  heroIconBg: '#1A1A1A',
  heroIconFg: '#FFFFFF',
  divider: '#E0E0E0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
          <ActivityIndicator size="large" color={COLOR.fontPrimary} />
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
            <HeroSection subtitle="We couldn't load this invite." />
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
            <HeroSection subtitle={`Join ${invite.gymName} on CrossFit Box`} />
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
          <ActivityIndicator size="large" color={COLOR.fontPrimary} />
          <Text style={styles.acceptingText}>Joining gym...</Text>
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

function HeroSection({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroIcon}>
        <Text style={styles.heroIconGlyph}>✉</Text>
      </View>
      <Text style={styles.heroTitle}>{"You've been invited!"}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
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
          <Text style={styles.gymAvatarText}>{initials}</Text>
        </View>
        <View style={styles.gymTextGroup}>
          <Text style={styles.gymName}>{invite.gymName}</Text>
          <Text style={styles.gymSubtext}>CrossFit Box</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.inviteMeta}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Invited to</Text>
          <Text style={styles.metaValue}>{invite.inviteeEmail}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Expires</Text>
          <Text style={styles.metaValue}>{formatExpiry(invite.expiresAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function JoinButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={styles.joinBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.joinBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function DeclineButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.declineBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.declineBtnText}>Decline</Text>
    </TouchableOpacity>
  );
}

function ErrorBanner({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDesc}>{desc}</Text>
    </View>
  );
}

function BackToLoginLink({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backToLoginLink} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.backToLoginText}>Back to Login</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.bg,
    borderRadius: 20,
  },
  scroll: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  acceptingText: {
    fontSize: 15,
    color: COLOR.fontSecondary,
  },

  // Content area
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR.heroIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconGlyph: {
    fontSize: 28,
    color: COLOR.heroIconFg,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.fontPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: COLOR.fontSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Gym card
  gymCard: {
    backgroundColor: COLOR.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: 16,
    gap: 12,
  },
  gymCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gymAvatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLOR.fontPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.heroIconFg,
  },
  gymTextGroup: {
    flex: 1,
    gap: 2,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.fontPrimary,
  },
  gymSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.fontSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.divider,
  },

  // Invite meta
  inviteMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.fontSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.fontPrimary,
  },

  // CTA section
  ctaSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 12,
  },
  joinBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLOR.joinBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.joinBtnText,
  },
  declineBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: COLOR.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLOR.declineBtnText,
  },

  // Error banner
  errorBanner: {
    backgroundColor: COLOR.errorBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.errorBorder,
    padding: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.errorTitle,
  },
  errorDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.errorDesc,
    lineHeight: 18,
  },

  // Back to login
  backToLoginLink: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.fontSecondary,
  },
});
