import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWhite,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: AppColors.backgroundLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    gap: Spacing.tight,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  sidebarLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.textMuted,
  },
  sidebarLogoText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  navGroup: {
    gap: Spacing.hairline,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
  },
  navItemActive: {
    backgroundColor: AppColors.backgroundDivider,
  },
  navIcon: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.hairline,
  },
  navIconActive: {
    backgroundColor: AppColors.textSecondary,
  },
  navIconInactive: {
    backgroundColor: AppColors.textDisabled,
  },
  navLabel: {
    fontSize: FontSizes.body,
  },
  navLabelActive: {
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },
  navLabelInactive: {
    fontWeight: FontWeights.regular,
    color: AppColors.textMuted,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIconDisabled: {
    backgroundColor: AppColors.textDisabled,
  },
  navLabelDisabled: {
    color: AppColors.textDisabled,
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
  colEmail: {
    flex: 1,
  },
  colRole: {
    width: 100,
  },
  colStatus: {
    width: 90,
  },
  colActionsHeader: {
    width: 140,
    textAlign: 'right',
  },
  colActions: {
    width: 140,
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
    gap: Spacing.md,
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
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },
  coachEmail: {
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
  },
  coachRole: {
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
    textTransform: 'capitalize',
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
  coachCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
