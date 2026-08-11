import { StyleSheet } from 'react-native';
import { Accent, Ground, Ink, Line, Status, Radius, Space, Type, Elevation } from '@/constants/design';

/*
 * ─── Clean Ink · Gym setup wizard (responsive adapt) ─────────────────────────
 * Two registers off the existing `useResponsiveLayout` split, no new
 * breakpoints. Wide: one centred measure-capped column so the fields stop
 * stretching the full window width. Narrow: the same column edge to edge, with
 * the action row restacked full-width and the step rail reduced to numbered
 * circles so four steps still fit a 320pt screen.
 * The step rail reads through ink + weight only — the green status hue belongs
 * to status-chip text on its wash, not to progress.
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Ground.base,
  },

  // Screen header — white surface with a hairline bottom rule, carrying the one
  // "Create Your Gym" title for the whole wizard. In-screen rather than the
  // navigator's, so its back affordance lands on /no-gym like Cancel does
  // instead of falling back to the parent group (the athlete tabs).
  header: {
    backgroundColor: Ground.surface,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  // The header's contents ride the same measure as the form below it, or the
  // title floats at the window edge while the step heading starts hundreds of
  // pixels to its right — the exact misalignment this pass exists to remove.
  // Padding lives on the outer pad and the cap on the inner row, mirroring the
  // ScrollView's contentContainer → contentWrap order below.
  headerPad: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
  },
  headerPadMobile: {
    paddingHorizontal: Space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Space.sm,
  },

  scrollContent: {
    // flexGrow so the success state's centred column actually has height to
    // centre within — `flex: 1` alone is inert in a scroll content container.
    flexGrow: 1,
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.jumbo,
  },
  scrollContentMobile: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  // A form is read one field at a time: cap the measure and centre it rather
  // than letting inputs run the full width of a desktop window.
  contentWrap: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },

  // Step indicator — progress reads through ink + weight, never the accent and
  // never the green status hue.
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.chip,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Ink.strong,
  },
  // Done steps carry the same ink as the active one but a check instead of a
  // number, so the rail distinguishes them by mark rather than by hue.
  stepCircleCompleted: {
    backgroundColor: Ink.muted,
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: Line.divider,
    marginHorizontal: Space.xs,
  },
  // On a phone the labels are dropped, so the connectors carry the whole sense
  // of a sequence and can afford a little more room.
  stepConnectorMobile: {
    width: 28,
  },
  stepConnectorCompleted: {
    backgroundColor: Ink.muted,
  },
  stepLabelWrap: {
    marginLeft: Space.sm,
    marginRight: Space.xs,
  },

  // Step content
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    marginBottom: Space.sm,
  },
  stepSubtitle: {
    marginBottom: Space.xl,
    maxWidth: 520,
  },

  // Fields
  field: {
    marginBottom: Space.base,
    gap: Space.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
    backgroundColor: Ground.surface,
    minHeight: 46,
  },
  // Focus is already tracked for the keyboard-follow, so the field can show it
  // (same treatment as log-results).
  inputFocused: {
    borderColor: Accent.base,
  },
  inputError: {
    borderColor: Status.danger,
  },
  textArea: {
    minHeight: 88,
    paddingTop: Space.sm,
  },
  errorText: {
    marginTop: Space.xs,
  },

  // Entry cards (spaces, class types)
  entryCard: {
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    marginBottom: Space.md,
    backgroundColor: Ground.surface,
    gap: Space.md,
    ...Elevation.card,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // The one destructive control in the wizard, so it gets a real 44pt target
  // rather than the height of its 13px label.
  removeBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
    marginRight: -Space.sm,
  },
  // Two capacity-sized fields sit side by side once there is width for them,
  // and stack on a phone.
  entryRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  entryRowMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  entryRowItem: {
    flex: 1,
  },

  // Add button (secondary add-more action)
  addBtnWrap: {
    marginBottom: Space.xl,
    alignSelf: 'flex-start',
  },
  addBtnWrapMobile: {
    alignSelf: 'stretch',
  },

  // Empty state — icon circle on a sunken tonal ground, matching the no-gym
  // zero state and the athlete pilot.
  emptyState: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
    marginBottom: Space.base,
    gap: Space.xs,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  emptyStateSubText: {
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: Type.lineHeight.relaxed,
  },

  // Button row — right-aligned pair with width, a full-width stack on a phone
  // (primary on top, matching login and no-gym).
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.md,
    marginTop: Space.sm,
  },
  buttonRowMobile: {
    flexDirection: 'column-reverse',
    gap: Space.sm,
  },
  buttonWrap: {
    minWidth: 120,
  },
  buttonWrapMobile: {
    width: '100%',
    minWidth: 0,
  },

  // Review step
  reviewSection: {
    marginBottom: Space.lg,
    paddingBottom: Space.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
    gap: Space.xs,
  },
  reviewSectionTitle: {
    marginBottom: Space.xs,
  },
  reviewItem: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.control,
    padding: Space.sm,
    marginBottom: Space.sm,
    gap: Space.hair,
  },

  // Error banner — the danger wash inside a full 1px danger hairline. Structure
  // comes from the hairline, not a heavy colored side stripe.
  errorBanner: {
    backgroundColor: Status.dangerWash,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    padding: Space.md,
    marginBottom: Space.base,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Space.jumbo,
    paddingHorizontal: Space.lg,
    gap: Space.base,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  successTitle: {
    textAlign: 'center',
  },
  successBody: {
    textAlign: 'center',
    marginBottom: Space.lg,
    maxWidth: 400,
    lineHeight: Type.lineHeight.relaxed,
  },
  successBtnWrap: {
    minWidth: 220,
    gap: Space.sm,
  },
  successBtnWrapMobile: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
});
