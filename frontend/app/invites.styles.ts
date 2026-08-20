import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Accent, Status, Radius, Space, Elevation, Type } from '@/constants/design';

export const styles = StyleSheet.create({
  // Shell
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },
  main: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  mainMobile: {
    paddingHorizontal: 0,
  },

  // Mobile drawer / hamburger
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    paddingTop: Space.jumbo,
    paddingBottom: Space.base,
    backgroundColor: Ground.surface,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Accent.base,
    borderRadius: Radius.control,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.base,
    gap: Space.xs,
  },
  headerDivider: {
    height: 1,
    backgroundColor: Line.hairline,
    marginHorizontal: 0,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    backgroundColor: Ground.base,
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderCellEmail: {
    flex: 2,
  },
  tableHeaderDivider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  tableBody: {
    flexGrow: 1,
  },

  // Row
  row: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    backgroundColor: Ground.surface,
    gap: Space.sm,
  },
  rowAccepted: {
    opacity: 0.6,
  },
  rowExpired: {
    opacity: 0.5,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  rowLeft: {
    flex: 1,
    gap: Space.hair,
  },
  rowEmail: {
    // rendered via Text primitive
  },
  rowEmailExpired: {
    fontStyle: 'italic',
  },
  rowActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Line.hairline,
    marginHorizontal: 0,
  },

  // Action buttons (row level)
  actionBtn: {
    borderRadius: Radius.control,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.md,
    borderWidth: 1,
    borderColor: Line.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRevoke: {
    borderColor: Status.danger,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.jumbo,
    paddingVertical: Space.jumbo,
    gap: Space.base,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 400,
  },
  emptyBtnWrap: {
    marginTop: Space.sm,
    minWidth: 200,
  },

  // Centered state (guards)
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.jumbo,
  },
  errorText: {
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Ground.surface,
    borderRadius: Radius.sheet,
    overflow: 'hidden',
    ...Elevation.raised,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Space.lg,
    paddingHorizontal: Space.xl,
    paddingBottom: Space.base,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.control,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  modalBody: {
    padding: Space.xl,
    gap: Space.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.sm,
    paddingTop: Space.base,
    paddingHorizontal: Space.xl,
    paddingBottom: Space.xl,
  },
  modalActionBtn: {
    minWidth: 110,
  },

  // Form fields
  fieldGroup: {
    gap: Space.xs,
  },
  fieldInput: {
    height: 46,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.md,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
    backgroundColor: Ground.surface,
  },

  // Success state
  // Not a success box: it reports a link that still has to be delivered by hand.
  // Status.openWash is reserved for open/available status, and DESIGN.md has no
  // success role — so this is a plain sunken panel bounded by a hairline.
  successBox: {
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
    gap: Space.sm,
  },
  linkTextBox: {
    flex: 1,
    height: 36,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.sm,
    backgroundColor: Ground.surface,
    justifyContent: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    gap: Space.xs,
  },
});
