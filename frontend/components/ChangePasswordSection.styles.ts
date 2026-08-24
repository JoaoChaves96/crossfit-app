/*
 * ─── Clean Ink · Profile → Security section ──────────────────────────────────
 * Deliberately the notification section's shell (uppercase label, description,
 * hairline card with a whisper of elevation) so the two read as siblings on the
 * same screen. Every value references a design.ts role — no theme.ts, no raw hex.
 */
import { StyleSheet } from 'react-native';
import { Ground, Line, Space, Radius, Elevation } from '@/constants/design';

export const styles = StyleSheet.create({
  section: {
    marginTop: Space.xl,
    width: '100%',
  },
  description: {
    marginTop: Space.sm,
    marginBottom: Space.lg,
  },
  card: {
    width: '100%',
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    ...Elevation.card,
  },
  // Row spacing only — the field itself is the PasswordField primitive, which
  // owns the label, the box and the label→box gap.
  field: {
    paddingBottom: Space.md,
  },
  errorText: {
    paddingBottom: Space.md,
  },
  // Two quiet actions side by side: the accent on this screen belongs to Save
  // Changes, and a password change is not a more confident act than that.
  actionRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  actionItem: {
    flex: 1,
  },
  // Confirmation is quiet meta text, never a green banner — there is no success
  // role in this system.
  confirmation: {
    paddingTop: Space.md,
  },
});
