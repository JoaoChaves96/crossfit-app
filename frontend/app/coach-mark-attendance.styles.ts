import { StyleSheet } from 'react-native';
import { Ground, Line, Radius, Space, Elevation } from '@/constants/design';

// ─── Desktop Styles ────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.base,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  // Balances the back button so the title stays visually centered.
  headerSpacer: {
    width: 200,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    gap: Space.xxl,
    flexWrap: 'wrap',
    alignItems: 'center',
    ...Elevation.card,
  },
  infoItem: {
    gap: Space.hair,
    minWidth: 80,
  },

  // Stats row — three quiet monochrome cards
  statsRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.base,
    gap: Space.hair,
    ...Elevation.card,
  },

  // Attendance card
  attendanceCard: {
    flex: 1,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.md,
    ...Elevation.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Table
  table: {
    flex: 1,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Ground.base,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
  },

  // Column widths
  colAthlete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  colStatus: {
    width: 132,
    alignItems: 'flex-end',
  },

  // Avatar (initials) — consistent with BookingsPanel
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Present/Absent toggle — selection reads through elevation + weight
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    minWidth: 116,
  },
  toggleBtnPresent: {
    backgroundColor: Ground.surface,
    borderColor: Line.hairline,
    ...Elevation.card,
  },
  toggleBtnAbsent: {
    backgroundColor: Ground.sunken,
    borderColor: Line.divider,
  },

  // Submit button wrapper
  submitWrap: {
    minWidth: 200,
    alignSelf: 'flex-start',
  },

  // Feedback
  feedbackRow: {
    paddingTop: Space.xs,
  },

  // Empty / loading state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.jumbo,
    gap: Space.sm,
  },
});

// ─── Mobile Styles (≤768px) ──────────────────────────────────────────────────

export const mobileStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Ground.base,
  },
  main: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.xl,
    gap: Space.base,
  },

  // Header
  header: {
    gap: Space.sm,
    paddingTop: Space.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    alignSelf: 'flex-start',
    paddingRight: Space.sm,
    paddingVertical: Space.sm,
    minHeight: 44,
  },

  // Subheader with Select All
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllBtn: {
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
    minHeight: 44,
    justifyContent: 'center',
  },

  // Attendance card
  attendanceCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.md,
    ...Elevation.card,
  },

  // Athlete row — generous touch target
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
    minHeight: 64,
    paddingVertical: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
  },
  // The rows separate each other; the card border already closes the top edge,
  // so the first row must not draw a leading hairline.
  athleteRowFirst: {
    borderTopWidth: 0,
  },
  athleteNameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Present/Absent toggle — large touch target
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    minHeight: 44,
    minWidth: 108,
  },
  toggleBtnPresent: {
    backgroundColor: Ground.surface,
    borderColor: Line.hairline,
    ...Elevation.card,
  },
  toggleBtnAbsent: {
    backgroundColor: Ground.sunken,
    borderColor: Line.divider,
  },

  // Footer count
  footerRow: {
    alignItems: 'center',
    paddingTop: Space.xs,
  },

  // Feedback
  feedbackRow: {
    paddingTop: Space.xs,
  },

  // Empty / loading state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.xxl,
    gap: Space.sm,
  },
});
