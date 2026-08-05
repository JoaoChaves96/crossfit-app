import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWhite,
  },

  // Main
  main: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: Spacing.tight,
  },
  headerTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  headerSubtitle: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
  },
  inviteBtn: {
    backgroundColor: AppColors.textHeading,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
  },
  inviteBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
  },

  // Loading / error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: AppColors.errorDefault,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  retryBtnText: {
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.textMuted,
    marginBottom: Spacing.tight,
  },

  // Content row (table + detail panel)
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.lg,
  },

  // List card
  listCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    borderRadius: BorderRadius.mdLg,
    overflow: 'hidden',
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  tableHeaderCell: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colName: {
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.mdPlus,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  coachRowSelected: {
    backgroundColor: AppColors.surfaceBlueHint,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.backgroundDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.hairline,
  },
  coachName: {
    flex: 1,
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },
  coachEmail: {
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
  },
  coachClasses: {
    fontSize: FontSizes.smMd,
    color: AppColors.textSecondary,
  },
  coachClassesEmpty: {
    fontSize: FontSizes.smMd,
    color: AppColors.textDisabled,
  },

  // View button (desktop actions)
  viewBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.compact,
    borderRadius: BorderRadius.mdSm,
  },
  viewBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.actionBlue,
  },

  // Detail panel (desktop)
  detailPanel: {
    width: 340,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    borderRadius: BorderRadius.mdLg,
    backgroundColor: AppColors.backgroundWhite,
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  detailEmpty: {
    fontSize: FontSizes.body,
    color: AppColors.textMuted,
  },
  detailTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  detailField: {
    gap: Spacing.tight,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  detailValueMuted: {
    fontSize: FontSizes.body,
    color: AppColors.textSecondary,
  },
  detailClassItem: {
    fontSize: FontSizes.body,
    color: AppColors.textSecondary,
  },
  detailClassEmpty: {
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
  },
  detailBtnRow: {
    flexDirection: 'row',
    marginTop: Spacing.tight,
  },

  // Action button
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.compact,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDeactivate: {
    borderColor: AppColors.errorBgRose,
  },
  actionBtnReactivate: {
    borderColor: AppColors.separatorDefault,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
  },
  actionBtnTextDeactivate: {
    color: AppColors.errorDefault,
  },
  actionBtnTextReactivate: {
    color: AppColors.textSecondary,
  },

  // Badge
  badge: {
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: AppColors.successBg,
  },
  badgeInactive: {
    backgroundColor: AppColors.backgroundLight,
  },
  badgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
  },
  badgeTextActive: {
    color: AppColors.successDark,
  },
  badgeTextInactive: {
    color: AppColors.textMuted,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: AppColors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    gap: Spacing.base,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  modalSubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.textMuted,
    marginTop: -Spacing.sm,
  },

  // Form field
  fieldGroup: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
  },

  // Inline error
  inlineError: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    marginTop: -Spacing.tight,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.smMd,
    marginTop: Spacing.tight,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.basePlus,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  cancelBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  submitBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.textHeading,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
  },

  // Mobile responsive styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: 220,
    height: '100%',
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  hamburgerText: {
    fontSize: FontSizes.xl,
    color: AppColors.textHeading,
  },
  mainMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  inviteBtnMobile: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Coach cards (mobile)
  coachCardList: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  coachCard: {
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    borderRadius: BorderRadius.mdLg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  coachCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coachCardInfo: {
    flex: 1,
    gap: Spacing.hairline,
  },
  coachCardClasses: {
    gap: Spacing.hairline,
  },
  coachCardClassesLabel: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
  },
  coachCardClassesValue: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textSecondary,
  },
  coachCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
