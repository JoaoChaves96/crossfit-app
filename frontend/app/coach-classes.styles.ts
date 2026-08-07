import { StyleSheet } from 'react-native';
import { Ground, Line, Radius, Space } from '@/constants/design';

const COL_CLASS_TYPE = 180;
const COL_DATE_TIME = 200;
const COL_SPACE = 100;
const COL_CAPACITY = 100;
const COL_STATUS = 160;
const COL_ACTION = 110;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.lg,
  },
  mainMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    gap: Space.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggle: {
    minWidth: 220,
  },
  filterToggleMobile: {
    flex: 1,
  },

  // Classes card (desktop table container)
  classesCard: {
    flex: 1,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    overflow: 'hidden',
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Space.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // Table rows — hairline separators, no zebra
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Line.hairline,
  },

  // Column widths — Space flexes so the row fills the card and Action stays
  // pinned to the right edge, matching the owner coaches table.
  colClassType: {
    width: COL_CLASS_TYPE,
  },
  colDateTime: {
    width: COL_DATE_TIME,
  },
  colSpace: {
    flex: 1,
    minWidth: COL_SPACE,
  },
  colCapacity: {
    width: COL_CAPACITY,
  },
  colStatus: {
    width: COL_STATUS,
  },
  colAction: {
    width: COL_ACTION,
    alignItems: 'flex-end',
  },

  // Loading / error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  retryBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.jumbo,
    gap: Space.sm,
  },
});

// ─── Mobile Styles ─────────────────────────────────────────────────────────────

export const mobileStyles = StyleSheet.create({
  // Vertical card list
  cardList: {
    paddingBottom: Space.xl,
    gap: Space.md,
  },

  // Class card
  classCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.hair,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  classCardMeta: {
    gap: Space.sm,
    marginTop: Space.sm,
  },
  classCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  classCardFooter: {
    marginTop: Space.md,
  },
});
