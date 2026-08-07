import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Accent, Status, Radius, Space, Elevation, Type } from '@/constants/design';

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
  color: Ink.strong,
  fontFamily: Type.family.regular,
  fontSize: Type.size.body,
  padding: 0,
} as const;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  scrollContent: {
    padding: Space.xl,
    paddingBottom: Space.jumbo,
  },
  header: {
    marginBottom: Space.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginBottom: Space.sm,
  },
  headerSubtitle: {
    marginTop: Space.hair,
  },
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
  fieldContainer: {
    gap: Space.xs,
  },
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
  pickerValueText: {
    flex: 1,
    color: Ink.strong,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
  },
  trailingIcon: {
    marginLeft: Space.sm,
  },
  inputBoxValidationError: {
    borderColor: Status.danger,
  },
  validationErrorText: {
    marginTop: Space.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
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
  noticeBanner: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.sunken,
    padding: Space.md,
  },
  noticeText: {
    lineHeight: Type.lineHeight.body,
  },

  // Segmented mode toggle (Single / Recurring) — quiet sunken track, white
  // lifted active pill. Selection reads through elevation + weight, not color.
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radius.control,
    backgroundColor: Ground.sunken,
    padding: Space.xs - 1,
    gap: Space.xs - 1,
  },
  segmentedItem: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedItemActive: {
    backgroundColor: Ground.surface,
    ...Elevation.card,
  },

  // Weekday selector chips
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  weekdayChip: {
    minWidth: 42,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    backgroundColor: Ground.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipSelected: {
    backgroundColor: Accent.base,
    borderColor: Accent.base,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.md,
  },
  btnWrap: {
    minWidth: 130,
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
    flexDirection: 'column-reverse',
    gap: Space.sm,
  },
  btnWrapMobile: {
    width: '100%',
    minWidth: 0,
  },
});
