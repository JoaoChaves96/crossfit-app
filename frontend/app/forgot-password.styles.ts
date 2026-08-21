import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Measure, Radius, Space, Type } from '@/constants/design';

/*
 * ─── Clean Ink · Forgot password ─────────────────────────────────────────────
 * The same recessed ground, ink brand mark and single hairline card as
 * `login.styles.ts` — this screen is one step off that one, so it must not read
 * as a different place. One crimson action (Send reset link) in the form phase;
 * the confirmation phase carries no accent at all, because there is no success
 * role in this system — a completed request is quiet meta text.
 */
export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Same capped, centred column as login — one step off that screen must not
  // read as a different place, at any width.
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Measure.auth,
    alignSelf: 'center',
    paddingHorizontal: Space.xl,
    paddingBottom: Space.jumbo,
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

  // Confirmation (quiet — never a banner, never green)
  sentIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.card,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBody: {
    gap: Space.sm,
  },
  sentMessage: {
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
