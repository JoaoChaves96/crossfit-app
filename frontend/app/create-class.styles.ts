import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

/**
 * Inline style for the raw HTML <input type="date|time"> rendered on web.
 * This targets a DOM element (not an RN component), so it is a plain CSS
 * object rather than a StyleSheet entry. Values still reference design tokens.
 */
export const webDateTimeInputStyle = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: AppColors.textHeading,
  fontFamily: 'Inter',
  fontSize: FontSizes.body,
  padding: 0,
} as const;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWhite,
  },
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.jumboLg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  formCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  rowItem: {
    flex: 1,
  },
  fieldContainer: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    backgroundColor: AppColors.backgroundWhite,
    minHeight: 42,
  },
  inputBoxText: {
    flexDirection: 'column',
    alignItems: undefined,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
  },
  inputBoxDisabled: {
    backgroundColor: AppColors.backgroundLight,
  },
  pickerValueText: {
    flex: 1,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
  },
  pickerPlaceholderText: {
    color: AppColors.textDisabled,
  },
  trailingIcon: {
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
    marginLeft: Spacing.sm,
  },
  inputBoxError: {
    borderColor: AppColors.errorBgRose,
    backgroundColor: AppColors.errorBgLight,
  },
  inputBoxValidationError: {
    borderColor: AppColors.errorBgRose,
  },
  validationErrorText: {
    fontSize: FontSizes.smMd,
    color: AppColors.errorDefault,
    marginTop: Spacing.tight,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    overflow: 'hidden',
    marginTop: Spacing.tight,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  dropdownItemSelected: {
    backgroundColor: AppColors.backgroundLight,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.backgroundDivider,
  },
  submitErrorBanner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.errorBgRose,
    backgroundColor: AppColors.errorBgLight,
    padding: Spacing.md,
  },
  submitErrorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    lineHeight: LineHeights.body,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: AppColors.textHeading,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  headerSubtitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textMuted,
    marginTop: Spacing.tight,
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
  },

  // Mobile responsive styles
  scrollContentMobile: {
    padding: Spacing.base,
    paddingBottom: Spacing.jumbo,
  },
  formCardMobile: {
    padding: Spacing.base,
    borderWidth: 0,
  },
  rowMobile: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  btnRowMobile: {
    flexDirection: 'column-reverse',
    gap: Spacing.sm,
  },
  btnMobile: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
