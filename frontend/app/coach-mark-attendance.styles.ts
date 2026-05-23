import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWarm,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: AppColors.darkSurface2,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    gap: Spacing.tight,
  },
  sidebarLogo: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },
  navSpacer: {
    height: 24,
  },
  navGroup: {
    gap: Spacing.tight,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    height: 40,
  },
  navLabel: {
    fontSize: FontSizes.body,
  },
  navLabelInactive: {
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextMuted,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  backBtnText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextDim,
    fontWeight: FontWeights.regular,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 130,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundScreen,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.xxxl,
  },
  infoItem: {
    gap: Spacing.tight,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDisabled,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  statLabel: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textMuted,
  },
  statValueBadge: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.tight,
    minWidth: 36,
    alignItems: 'center',
  },
  statValueText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
  },

  // Attendance card
  attendanceCard: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  sectionBadge: {
    backgroundColor: AppColors.badgeBlueBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  sectionBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.actionBlue,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundScreen,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
  },
  tableHeaderCell: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    borderTopWidth: 1,
    borderTopColor: AppColors.backgroundDivider,
  },
  tableRowAlt: {
    backgroundColor: AppColors.backgroundScreen,
  },

  // Column widths
  colAthlete: {
    flex: 1,
  },
  colStatus: {
    width: 120,
    textAlign: 'right',
  },

  // Athlete cell
  athleteNameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.backgroundDivider,
  },
  athleteNameText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textHeading,
  },

  // Toggle cell
  attendanceToggleCell: {
    width: 120,
    alignItems: 'flex-end',
  },
  toggleBtn: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.tight,
  },
  toggleBtnPresent: {
    backgroundColor: AppColors.successBgVivid,
  },
  toggleBtnAbsent: {
    backgroundColor: AppColors.errorBgSoft,
  },
  toggleBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  toggleBtnTextPresent: {
    color: AppColors.successDefault,
  },
  toggleBtnTextAbsent: {
    color: AppColors.errorDarkest,
  },

  // Submit button
  submitBtn: {
    backgroundColor: AppColors.textHeading,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Feedback
  successBanner: {
    backgroundColor: AppColors.successBgVivid,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
  },
  successText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.successDefault,
  },
  errorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.jumboLg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.darkTextDim,
    textAlign: 'center',
  },
});

// ─── Mobile Styles (≤768px) ────────────────────────────────────────────────

export const mobileStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: AppColors.backgroundWarm,
  },

  // Main area — no sidebar
  main: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },

  // Header
  header: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextDim,
    fontWeight: FontWeights.regular,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },

  // Info card — vertical on mobile
  infoCard: {
    backgroundColor: AppColors.backgroundScreen,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDisabled,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },

  // Stats row — wrap on mobile
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  statValueBadge: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.tight,
    minWidth: 36,
    alignItems: 'center',
  },
  statValueText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
  },

  // Attendance card
  attendanceCard: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  sectionBadge: {
    backgroundColor: AppColors.badgeBlueBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  sectionBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.actionBlue,
  },

  // Athlete row — 64px height on mobile
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.backgroundDivider,
  },
  athleteRowAlt: {
    backgroundColor: AppColors.backgroundScreen,
  },
  athleteNameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xl,
    backgroundColor: AppColors.backgroundDivider,
  },
  athleteNameText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },

  // Toggle button — large touch target on mobile
  attendanceToggleCell: {
    alignItems: 'flex-end',
  },
  toggleBtn: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.smMd,
    minHeight: 44,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnPresent: {
    backgroundColor: AppColors.successBgVivid,
  },
  toggleBtnAbsent: {
    backgroundColor: AppColors.errorBgSoft,
  },
  toggleBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  toggleBtnTextPresent: {
    color: AppColors.successDefault,
  },
  toggleBtnTextAbsent: {
    color: AppColors.errorDarkest,
  },

  // Submit button
  submitBtn: {
    backgroundColor: AppColors.textHeading,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.mdPlus,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Feedback
  successBanner: {
    backgroundColor: AppColors.successBgVivid,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
  },
  successText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.successDefault,
  },
  errorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.jumboLg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    textAlign: 'center',
  },
});
