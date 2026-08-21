import { StyleSheet } from 'react-native';
import { Ground, Line, Measure, Radius, Space, Status, Type } from '@/constants/design';

/*
 * ─── Clean Ink · Invite acceptance (restyle) ─────────────────────────────────
 * The athlete-facing invite screen: an ink hero mark, a hairline gym card, and
 * one confident crimson action (Join Gym / Try Again) with a quiet outlined
 * Decline. Invalid/expired states surface in a deeper-red danger banner (Two
 * Reds), distinct from the accent. All text via the Text primitive; only the
 * visual world changes — behavior, navigation, and copy preserved exactly.
 */
export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Hero, gym card and the CTA section are siblings in here, so the cap goes on
  // the shared container — same measure as the other signed-out screens.
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Measure.auth,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  acceptingText: {
    textAlign: 'center',
  },

  // Content area
  contentWrap: {
    flex: 1,
    paddingHorizontal: Space.lg,
    gap: Space.lg,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: Space.jumbo,
    gap: Space.sm,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: Type.lineHeight.relaxed,
  },

  // Gym card
  gymCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.md,
  },
  gymCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  gymAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.control,
    backgroundColor: Ground.base,
    borderWidth: 1,
    borderColor: Line.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymTextGroup: {
    flex: 1,
    gap: Space.hair,
  },
  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },

  // Invite meta
  inviteMeta: {
    gap: Space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  metaValue: {
    flexShrink: 1,
    textAlign: 'right',
  },

  // CTA section
  ctaSection: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.jumbo,
    gap: Space.md,
  },

  // Error banner
  errorBanner: {
    backgroundColor: Status.dangerWash,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    padding: Space.md,
    paddingHorizontal: Space.base,
    gap: Space.xs,
  },
  errorDesc: {
    lineHeight: Type.lineHeight.body,
  },

  // Back to login
  backToLoginLink: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
