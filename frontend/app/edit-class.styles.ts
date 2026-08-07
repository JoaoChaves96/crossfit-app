import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Status, Radius, Space, Elevation, Type } from '@/constants/design';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  scrollContent: {
    padding: Space.xl,
    paddingBottom: Space.jumbo,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginBottom: Space.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },

  // Loading / error full-screen states
  centeredFeedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.jumbo,
    gap: Space.md,
    backgroundColor: Ground.base,
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

  // Form card
  formCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xxl,
    gap: Space.lg,
    ...Elevation.card,
  },
  row: {
    flexDirection: 'row',
    gap: Space.base,
  },
  // Picker rows stack above the rows below them so a downward-opening floating
  // dropdown overlays later fields instead of being painted over (native/iOS).
  rowPickerTop: {
    zIndex: 10,
    ...{ elevation: 10 },
  },
  rowPickerBottom: {
    zIndex: 5,
    ...{ elevation: 5 },
  },
  rowItem: {
    flex: 1,
  },

  // Field
  fieldContainer: {
    gap: Space.xs,
  },

  // Input box
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
    minHeight: 46,
  },
  // Applied to the TextInput itself; the face must be named explicitly since
  // a TextInput can't route through the Text primitive.
  inputBoxText: {
    flexDirection: 'column',
    alignItems: undefined,
    color: Ink.strong,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
  },
  inputBoxValidationError: {
    borderColor: Status.danger,
  },
  validationErrorText: {
    marginTop: Space.xs,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },

  // Submit error
  submitErrorBanner: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    backgroundColor: Status.dangerWash,
    padding: Space.md,
  },
  submitErrorText: {
    lineHeight: Type.lineHeight.body,
  },

  // Button row
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftBtns: {
    flexDirection: 'row',
    gap: Space.md,
  },
  btnWrap: {
    minWidth: 130,
  },
  rightGroup: {
    alignItems: 'flex-end',
    gap: Space.hair,
  },

  // Mobile responsive styles
  scrollContentMobile: {
    padding: Space.base,
    paddingBottom: Space.jumbo,
  },
  formCardMobile: {
    padding: Space.base,
    borderWidth: 0,
  },
  rowMobile: {
    flexDirection: 'column',
    gap: Space.md,
  },
  btnRowMobile: {
    flexDirection: 'column',
    gap: Space.md,
  },
  leftBtnsMobile: {
    flexDirection: 'column',
    gap: Space.sm,
  },
  rightGroupMobile: {
    alignItems: 'stretch',
  },
  btnWrapMobile: {
    width: '100%',
    minWidth: 0,
  },
});
