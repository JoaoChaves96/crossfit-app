import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Measure, Radius, Space, Type } from '@/constants/design';

/*
 * ─── Clean Ink · Reset password ──────────────────────────────────────────────
 * Deliberately the same body as `login.styles.ts` and `forgot-password.styles.ts`:
 * someone arrives here from a mail client, having never seen the app, and the
 * next thing they do is log in. The three screens are one place.
 *
 * One accent per phase — the primary Button in the form phase, and in the
 * invalid phase the "Request a new link" action. The mismatch/expired message is
 * the deeper `Status.danger` red, never the crimson accent (Two Reds Rule).
 */
export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Same capped, centred column as login and forgot-password — all three phases
  // (form, invalid link, loading) sit on the same measure.
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Measure.auth,
    alignSelf: 'center',
    paddingHorizontal: Space.xl,
    paddingBottom: Space.jumbo,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.base,
  },

  // Brand
  brand: {
    alignItems: 'center',
    paddingTop: Space.jumbo,
    paddingBottom: Space.jumbo,
    gap: Space.sm,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.card,
    backgroundColor: Ink.strong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  appName: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.lg,
    gap: Space.base,
  },

  // Field
  field: {
    gap: Space.sm,
  },
  input: {
    height: 48,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
    paddingHorizontal: Space.base,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  hint: {
    lineHeight: Type.lineHeight.relaxed,
  },

  // Error
  errorText: {
    marginTop: -Space.xs,
  },

  // Invalid link
  invalidIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.card,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidBody: {
    gap: Space.sm,
  },
  invalidMessage: {
    lineHeight: Type.lineHeight.relaxed,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Space.lg,
    gap: Space.xs,
  },
});
