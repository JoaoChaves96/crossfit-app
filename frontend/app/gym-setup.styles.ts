import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Status, Radius, Space, Type, Elevation } from '@/constants/design';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  scrollContent: {
    padding: Space.lg,
    paddingBottom: Space.jumbo,
  },

  // Step indicator — selection reads through ink + weight, not the accent.
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xl,
    paddingTop: Space.md,
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
  stepCircleCompleted: {
    backgroundColor: Status.open,
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: Line.divider,
    marginHorizontal: Space.hair,
  },
  stepConnectorCompleted: {
    backgroundColor: Status.open,
  },
  stepLabelWrap: {
    marginLeft: Space.hair,
    marginRight: Space.hair,
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
  removeBtn: {
    paddingVertical: Space.xs,
    paddingHorizontal: Space.sm,
  },

  // Add button (secondary add-more action)
  addBtnWrap: {
    marginBottom: Space.xl,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
    marginBottom: Space.base,
    gap: Space.xs,
  },
  emptyStateSubText: {
    textAlign: 'center',
    maxWidth: 360,
  },

  // Button row
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.md,
    marginTop: Space.sm,
  },
  buttonWrap: {
    minWidth: 100,
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

  // Error banner
  errorBanner: {
    backgroundColor: Status.dangerWash,
    borderRadius: Radius.control,
    borderLeftWidth: 4,
    borderLeftColor: Status.danger,
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
  successBody: {
    textAlign: 'center',
    marginBottom: Space.lg,
    maxWidth: 400,
  },
  successBtnWrap: {
    minWidth: 220,
  },
});
