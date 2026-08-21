import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Measure, Radius, Space, Type } from '@/constants/design';

/*
 * ─── Clean Ink · Register (restyle) ──────────────────────────────────────────
 * Sign-up mirror of the login surface: ink brand mark, one hairline form card,
 * a single crimson action (Button primitive). Read-only invite email reads on a
 * sunken tonal fill. All text via the Text primitive; the crimson accent is
 * carried by the CTA alone. Only the visual world changes — behavior preserved.
 */
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusBar: {
    height: 62,
  },
  // Brand, card and footer live inside this one wrapper, so capping it here
  // keeps them aligned with each other and matches the login measure.
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Measure.auth,
    alignSelf: 'center',
    paddingHorizontal: Space.xl,
    paddingBottom: Space.jumbo,
  },

  // Brand
  brand: {
    alignItems: 'center',
    paddingTop: Space.xl,
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
  brandName: {
    textAlign: 'center',
  },
  brandTagline: {
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.lg,
    gap: Space.base,
  },

  // Fields
  field: {
    gap: Space.sm,
  },
  input: {
    height: 48,
    backgroundColor: Ground.surface,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.base,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  inputReadOnly: {
    backgroundColor: Ground.sunken,
    color: Ink.muted,
    borderColor: Line.hairline,
  },

  // Error
  errorText: {
    marginTop: -Space.xs,
    lineHeight: Type.lineHeight.body,
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
