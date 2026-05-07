import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.jumbo,
    paddingBottom: Spacing.base,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.textDark,
    borderRadius: BorderRadius.mdSm,
    paddingVertical: Spacing.smMd,
    paddingHorizontal: Spacing.base,
    gap: Spacing.compact,
  },
  createBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  headerDivider: {
    height: 1,
    backgroundColor: AppColors.backgroundDivider,
    marginHorizontal: 0,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.backgroundScreen,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
  },
  tableHeaderCellEmail: {
    flex: 2,
  },
  tableHeaderDivider: {
    height: 1,
    backgroundColor: AppColors.backgroundDivider,
  },
  tableBody: {
    flexGrow: 1,
  },

  // Row
  row: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.mdPlus,
    backgroundColor: AppColors.backgroundWhite,
    gap: Spacing.sm,
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
    gap: Spacing.sm,
  },
  rowLeft: {
    flex: 1,
    gap: Spacing.hairline,
  },
  rowEmail: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
  },
  rowEmailExpired: {
    fontStyle: 'italic',
    color: AppColors.textMuted,
  },
  rowDate: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  noActionsText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
  },
  rowDivider: {
    height: 1,
    backgroundColor: AppColors.backgroundLight,
    marginHorizontal: 0,
  },

  // Action buttons (row level)
  actionBtn: {
    borderRadius: BorderRadius.mdSm,
    paddingVertical: Spacing.compact,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRevoke: {
    borderColor: AppColors.errorBgPale,
  },
  actionBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  revokeText: {
    color: AppColors.errorDefault,
  },

  // Badge
  badge: {
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.micro,
    paddingHorizontal: Spacing.smMd,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.jumbo,
    paddingVertical: Spacing.super,
    gap: Spacing.base,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconGlyph: {
    fontSize: FontSizes.display,
    color: AppColors.textDisabled,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
    textAlign: 'center',
    lineHeight: LineHeights.medium,
    maxWidth: 400,
  },

  // Centered state
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.jumbo,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    color: AppColors.errorDefault,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: AppColors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textMuted,
  },
  modalDivider: {
    height: 1,
    backgroundColor: AppColors.backgroundDivider,
  },
  modalBody: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.smMd,
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },

  // Form fields
  fieldGroup: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  fieldInput: {
    height: 42,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    paddingHorizontal: Spacing.md,
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
    backgroundColor: AppColors.backgroundWhite,
  },

  // Success state
  successBox: {
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.successBg50Alt,
    borderWidth: 1,
    borderColor: AppColors.successBgLighter,
    padding: Spacing.mdPlus,
    gap: Spacing.sm,
  },
  successLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.successDefault,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  linkTextBox: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    paddingHorizontal: Spacing.smMd,
    backgroundColor: AppColors.backgroundWhite,
    justifyContent: 'center',
  },
  linkTextContent: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.textDark,
    borderRadius: BorderRadius.mdSm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.tight,
  },
  copyBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Modal buttons
  cancelBtn: {
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingVertical: Spacing.smMd,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  sendBtn: {
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.textDark,
    paddingVertical: Spacing.smMd,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
});
