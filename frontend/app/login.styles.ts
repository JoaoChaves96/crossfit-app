import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Type } from '@/constants/design';

/*
 * ─── Clean Ink · Login (restyle) ─────────────────────────────────────────────
 * Monochrome sign-in on a recessed ground: an ink brand mark, a single hairline
 * form card, and one confident crimson action (the Button primitive). Field
 * labels/links/errors are drawn by the Text primitive; the crimson accent is
 * carried by the CTA alone. Only the visual world changes — behavior preserved.
 */
export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  scroll: {
    flexGrow: 1,
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

  // Error
  errorText: {
    marginTop: -Space.xs,
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
