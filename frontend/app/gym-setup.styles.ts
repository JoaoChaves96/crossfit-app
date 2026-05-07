import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.jumbo,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: AppColors.brandPrimary,
  },
  stepCircleCompleted: {
    backgroundColor: AppColors.successLight,
  },
  stepCircleText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray500,
  },
  stepCircleTextActive: {
    color: AppColors.backgroundWhite,
  },
  stepLabel: {
    fontSize: FontSizes.sm,
    color: AppColors.textGray500,
    marginLeft: Spacing.tight,
    marginRight: Spacing.tight,
  },
  stepLabelActive: {
    color: AppColors.brandPrimary,
    fontWeight: FontWeights.semibold,
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: AppColors.borderDefault,
    marginHorizontal: Spacing.hairline,
  },
  stepConnectorCompleted: {
    backgroundColor: AppColors.successLight,
  },

  // Step content
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: AppColors.black,
    marginBottom: Spacing.compact,
  },
  stepSubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    marginBottom: Spacing.xl,
    lineHeight: LineHeights.bodyRelaxed,
  },

  // Fields
  field: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
    marginBottom: Spacing.compact,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    fontSize: FontSizes.body,
    color: AppColors.black,
    backgroundColor: AppColors.backgroundFaint,
    minHeight: 44,
  },
  inputError: {
    borderColor: AppColors.errorMaterial,
  },
  textArea: {
    minHeight: 88,
    paddingTop: Spacing.smMd,
  },
  errorText: {
    fontSize: FontSizes.smMd,
    color: AppColors.errorMaterial,
    marginTop: Spacing.tight,
  },

  // Entry cards (spaces, class types)
  entryCard: {
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: AppColors.backgroundFaint,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  entryCardTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
  },
  removeText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorMaterial,
    fontWeight: FontWeights.medium,
  },

  // Add button
  addButton: {
    borderWidth: 1,
    borderColor: AppColors.brandPrimary,
    borderRadius: BorderRadius.mdSm,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  addButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.brandPrimary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    marginBottom: Spacing.base,
  },
  emptyStateText: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray600,
    marginBottom: Spacing.compact,
  },
  emptyStateSubText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray500,
    textAlign: 'center',
    lineHeight: LineHeights.body,
  },

  // Button row
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textDark3,
  },
  primaryButton: {
    backgroundColor: AppColors.brandPrimary,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Review step
  reviewSection: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundSurface,
  },
  reviewSectionTitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.black,
    marginBottom: Spacing.smMd,
  },
  reviewLabel: {
    fontSize: FontSizes.smMd,
    color: AppColors.textGray400,
    marginBottom: Spacing.hairline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: FontSizes.body,
    color: AppColors.black,
    marginBottom: Spacing.sm,
  },
  reviewItem: {
    backgroundColor: AppColors.backgroundSubtle,
    borderRadius: BorderRadius.mdSm,
    padding: Spacing.smMd,
    marginBottom: Spacing.sm,
  },
  reviewItemName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },
  reviewItemDetail: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
    marginTop: Spacing.hairline,
  },
  reviewEmptyNote: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray500,
    fontStyle: 'italic',
  },

  // Error banner
  errorBanner: {
    backgroundColor: AppColors.errorBgFaint,
    borderRadius: BorderRadius.mdSm,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.errorMaterial,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDark,
    lineHeight: LineHeights.body,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.super,
    paddingHorizontal: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    color: AppColors.black,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.brandPrimary,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  successBody: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    textAlign: 'center',
    lineHeight: LineHeights.comfortable,
    marginBottom: Spacing.xxxl,
  },
});
