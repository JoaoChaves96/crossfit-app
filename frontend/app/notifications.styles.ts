/*
 * ─── Clean Ink · Athlete Notifications (restyle) ─────────────────────────────
 * Same white-surface hairline header and quiet list language as the shipped
 * athlete screens. UNREAD vs READ reads through tone + weight + a tonal recess:
 * unread rows sit on the white surface with strong ink and a single crimson
 * dot; read rows recede onto the base ground with muted ink and a quiet check.
 * The accent appears once per unread row (the dot) — nowhere else. Only the
 * visual world changes; data, handlers, and copy are preserved exactly.
 */
import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Space, Radius, Type, Accent } from '@/constants/design';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Header — white surface bar with a hairline bottom rule (mirrors the pilot)
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    backgroundColor: Ground.surface,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  markAllButton: {
    paddingVertical: Space.xs,
    paddingHorizontal: Space.sm,
  },
  // List
  listContent: {
    paddingVertical: Space.sm,
  },
  // Row — unread sits on the white surface; read recedes onto the base ground
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    gap: Space.md,
    backgroundColor: Ground.surface,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  notificationItemRead: {
    backgroundColor: Ground.base,
  },
  // Neutral type-indicator circle (glyph carries the type, not a color splash)
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ground.sunken,
  },
  contentContainer: {
    flex: 1,
    gap: Space.hair,
  },
  bodyText: {
    lineHeight: Type.lineHeight.body,
  },
  statusIndicator: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Space.hair,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Accent.base,
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
    backgroundColor: Ground.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
    gap: Space.md,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Ground.sunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
