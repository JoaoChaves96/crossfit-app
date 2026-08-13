import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Accent, Status, Radius, Space, Elevation, Type } from '@/constants/design';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Main
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: Space.md,
  },
  headerTitleWrap: {
    gap: Space.hair,
    flexShrink: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Accent.base,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
  },
  createIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Accent.base,
    borderRadius: Radius.control,
  },

  // Loading / error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  errorText: {
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  emptyBtnWrap: {
    marginTop: Space.sm,
    minWidth: 180,
  },

  // Content row (table + detail panel)
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Space.lg,
  },

  // List card
  listCard: {
    flex: 1,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    overflow: 'hidden',
    ...Elevation.card,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    backgroundColor: Ground.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  colName: {
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  colEmail: {
    width: 220,
    justifyContent: 'center',
  },
  colStatus: {
    width: 90,
    justifyContent: 'center',
  },
  colClasses: {
    flex: 1,
    justifyContent: 'center',
  },
  colActionsHeader: {
    width: 80,
    textAlign: 'right',
  },
  colActions: {
    width: 80,
    alignItems: 'flex-end',
  },

  // Coach row
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  coachRowSelected: {
    backgroundColor: Accent.wash,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachNameText: {
    flex: 1,
  },

  // Pending invite row (desktop) — same column skeleton as coachRow (no
  // row-level gap, same fixed widths) so cells land under their own header.
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  // colActions is a column (default flexDirection), so the two quiet actions
  // stack rather than needing width beyond the Actions header's 80px.
  pendingRevokeBtn: {
    marginTop: Space.xs,
  },

  // View button (desktop actions)
  viewBtn: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.control,
  },

  // Detail panel (desktop)
  detailPanel: {
    width: 340,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.xl,
    gap: Space.base,
    ...Elevation.card,
  },
  detailField: {
    gap: Space.xs,
  },
  detailBtnRow: {
    flexDirection: 'row',
    marginTop: Space.xs,
  },
  detailBtnWrap: {
    flex: 1,
  },

  // Badge (mobile/desktop status pill handled by StatusChip)

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Ground.surface,
    borderRadius: Radius.sheet,
    padding: Space.xxl,
    gap: Space.base,
    ...Elevation.raised,
  },
  modalSubtitle: {
    marginTop: -Space.sm,
  },

  // Form field
  fieldGroup: {
    gap: Space.xs,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    height: 46,
    justifyContent: 'center',
  },
  // TextInput can't route through the Text primitive; name the face explicitly.
  input: {
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },

  // Inline error
  inlineError: {
    marginTop: -Space.xs,
  },

  // Invite-created link box — quiet meta, no success-role color per DESIGN.md.
  linkBox: {
    borderRadius: Radius.control,
    backgroundColor: Ground.sunken,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.md,
    gap: Space.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
  },
  linkText: {
    flex: 1,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.xs,
    justifyContent: 'flex-end',
  },
  modalActionBtn: {
    minWidth: 110,
  },

  // Mobile responsive styles
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },
  mainMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    gap: Space.base,
  },

  // Coach cards (mobile)
  coachCardList: {
    gap: Space.md,
    paddingBottom: Space.lg,
  },
  coachCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.md,
    ...Elevation.card,
  },
  coachCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  coachCardInfo: {
    flex: 1,
    gap: Space.hair,
  },
  coachCardClasses: {
    gap: Space.hair,
  },
  coachCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  coachCardActionBtn: {
    minWidth: 140,
  },

  // Pending invite card (mobile) — same shape as coachCard so the two read
  // as one list rather than two different registers stacked together.
  pendingCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.md,
    ...Elevation.card,
  },
  pendingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  pendingCardInfo: {
    flex: 1,
    gap: Space.hair,
  },
  pendingCardActions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  pendingCardActionBtn: {
    flex: 1,
  },
});
