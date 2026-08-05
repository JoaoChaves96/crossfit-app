import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentArea: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  innerWrap: {
    width: 480,
    maxWidth: '100%',
    alignItems: 'center',
  },
});

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  contentWrap: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundWhite,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.textDark3,
    borderRadius: BorderRadius.md,
  },
  retryButtonLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  statusBar: {
    height: 44,
  },
  pageHeader: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  pageHeaderBell: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  avatarSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.base,
  },
  avatarBg: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.backgroundSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    color: AppColors.textMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
    paddingTop: Spacing.mdPlus,
    paddingBottom: Spacing.tight,
  },
  nameText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  editIconText: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
  },
  emailText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
  },
  memberSinceRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.tight,
  },
  memberSince: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    color: AppColors.textGray500,
  },
  dividerWrap: {
    width: '100%',
    paddingBottom: Spacing.base,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderDefault,
  },
  infoCard: {
    width: '100%',
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingHorizontal: Spacing.base,
  },
  nameFieldRow: {
    width: '100%',
    gap: Spacing.compact,
    paddingVertical: Spacing.base,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray500,
    letterSpacing: 0.3,
  },
  fieldInputWrap: {
    width: '100%',
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: AppColors.borderDefault,
  },
  fieldInputWrapActive: {
    borderColor: AppColors.textDark3,
  },
  fieldInputText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: AppColors.borderDefault,
    width: '100%',
  },
  emailFieldRow: {
    width: '100%',
    gap: Spacing.compact,
    paddingVertical: Spacing.base,
  },
  emailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
  },
  saveButtonWrap: {
    width: '100%',
    paddingTop: Spacing.lg,
  },
  saveButton: {
    width: '100%',
    height: 48,
    backgroundColor: AppColors.textDark3,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  saveErrorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    color: AppColors.errorMaterial,
    textAlign: 'center',
    paddingTop: Spacing.sm,
  },
  logoutButtonWrap: {
    width: '100%',
    paddingTop: Spacing.xl,
  },
  logoutButton: {
    width: '100%',
    height: 48,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.errorMaterial,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoutButtonLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.errorMaterial,
  },
  noteRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.smMd,
  },
  noteText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    color: AppColors.textGray500,
  },
  notificationSection: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  notificationDescription: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  notificationCard: {
    width: '100%',
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingHorizontal: Spacing.base,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  notificationTextWrap: {
    flex: 1,
    marginRight: Spacing.md,
  },
  notificationLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
  },
  notificationSubtitle: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray500,
    marginTop: 2,
  },
  notificationDivider: {
    height: 1,
    backgroundColor: AppColors.borderDefault,
  },
});
