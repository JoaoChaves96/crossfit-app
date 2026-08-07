/*
 * ─── Clean Ink · Athlete Profile (restyle) ───────────────────────────────────
 * Sibling of the schedule / my-bookings pilots: white-surface hairline header,
 * hairline cards with a whisper of card elevation, one crimson primary action
 * (Save Changes) and a distinct deeper-red danger action (Log Out). Every value
 * references a design.ts role — no theme.ts, no raw hex.
 */
import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Space, Radius, Elevation, Type, Status } from '@/constants/design';

// ── Desktop layout ────────────────────────────────────────────────────────────
export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  contentArea: {
    alignItems: 'center',
    paddingVertical: Space.jumbo,
    paddingHorizontal: Space.jumbo,
  },
  innerWrap: {
    width: 480,
    maxWidth: '100%',
    alignItems: 'center',
  },
});

// ── Shared / mobile ─────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Header — white surface bar with a hairline bottom rule (mirrors the pilot)
  header: {
    backgroundColor: Ground.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  contentWrap: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.base,
    paddingBottom: Space.xl,
  },
  // State screens (loading / error)
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
    gap: Space.base,
  },
  retryButton: {
    minWidth: 160,
  },
  // Avatar section
  avatarSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Space.sm,
    paddingBottom: Space.base,
  },
  avatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Ground.sunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingTop: Space.md,
    paddingBottom: Space.xs,
  },
  memberSinceRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Space.xs,
  },
  // Divider between avatar and info card
  dividerWrap: {
    width: '100%',
    paddingVertical: Space.base,
  },
  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  // Info card (name / email)
  infoCard: {
    width: '100%',
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingHorizontal: Space.base,
    ...Elevation.card,
  },
  fieldRow: {
    width: '100%',
    gap: Space.sm,
    paddingVertical: Space.base,
  },
  fieldInputWrap: {
    width: '100%',
    height: 44,
    borderRadius: Radius.control,
    backgroundColor: Ground.surface,
    justifyContent: 'center',
    paddingHorizontal: Space.md,
    borderWidth: 1,
    borderColor: Line.divider,
  },
  fieldInputWrapActive: {
    borderColor: Ink.strong,
  },
  // TextInput can't route through the Text primitive; name the face explicitly.
  fieldInput: {
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Line.hairline,
    width: '100%',
  },
  emailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  // Notifications
  notificationSection: {
    marginTop: Space.xl,
    width: '100%',
  },
  notificationDescription: {
    marginTop: Space.sm,
    marginBottom: Space.lg,
  },
  notificationCard: {
    width: '100%',
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingHorizontal: Space.base,
    ...Elevation.card,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Space.md,
  },
  notificationTextWrap: {
    flex: 1,
    marginRight: Space.md,
  },
  notificationSubtitle: {
    marginTop: Space.hair,
  },
  notificationDivider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  // Save action
  saveButtonWrap: {
    width: '100%',
    paddingTop: Space.lg,
  },
  saveError: {
    textAlign: 'center',
    paddingTop: Space.sm,
  },
  // Email-immutable note
  noteRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Space.md,
  },
  // Log out (danger — distinct deeper red, never the accent)
  logoutButtonWrap: {
    width: '100%',
    paddingTop: Space.xl,
  },
  logoutButton: {
    width: '100%',
    height: 46,
    backgroundColor: Ground.surface,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.sm,
  },
});
