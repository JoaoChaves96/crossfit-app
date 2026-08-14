import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ink, Ground, Line, Space, Radius, Status, Elevation, Type } from '@/constants/design';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Text } from './Text';
import { Icon } from './Icon';

/**
 * Clean Ink select field.
 *
 * A labelled picker with two registers driven by `useResponsiveLayout`:
 * - **Desktop:** a floating menu that overlays the form (absolute, raised
 *   elevation), anchored to the input's bottom edge.
 * - **Mobile:** a bottom sheet that slides up over a dimmed backdrop, so the
 *   choices own the screen instead of getting lost against the white form.
 *
 * Selection reads through weight + a check glyph on a neutral sunken row — the
 * crimson accent stays reserved (One Accent Rule). Fetch state (loading/error)
 * is rendered inline in the trigger box.
 *
 * The parent must still stack picker rows above later rows for the DESKTOP
 * floating menu to overlay them (see `menuAnchor` note below); the mobile sheet
 * is a Modal and needs no stacking help.
 */

export interface SelectItem {
  id: string;
  label: string;
  /** Exact testID for this row's option, overriding the default of none. */
  testID?: string;
}

export type SelectFetchState<T = unknown> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export interface SelectFieldProps {
  label: string;
  items: SelectItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  fetchState: SelectFetchState;
  testID?: string;
  /**
   * Optional style applied to the field container (e.g. gap). Defaults to the
   * standard label→control gap.
   */
  style?: object;
}

export function SelectField({
  label,
  items,
  selectedId,
  onSelect,
  fetchState,
  testID,
  style,
}: SelectFieldProps) {
  const { isMobile } = useResponsiveLayout();
  const [open, setOpen] = useState(false);
  const selectedLabel = items.find((i) => i.id === selectedId)?.label ?? '';

  // Mobile sheet entrance animation: the backdrop fades in (opacity) while the
  // sheet slides up (translateY). Animating these ourselves — rather than the
  // Modal's built-in "slide", which translates the whole surface, dim included —
  // keeps the backdrop anchored so it settles in place instead of scrolling in
  // with the sheet. Close is instant (the Modal unmounts on `open === false`),
  // which is what the user asked for: no dim sliding back down on dismiss. The
  // value resets to 0 on close so the next open animates fresh.
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [open, anim]);

  const renderRow = (item: SelectItem, inSheet: boolean) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        key={item.id}
        testID={item.testID}
        style={[
          inSheet ? styles.sheetItem : styles.menuItem,
          isSelected && styles.itemSelected,
        ]}
        onPress={() => {
          onSelect(item.id);
          setOpen(false);
        }}>
        <Text size="body" weight={isSelected ? 'semibold' : 'regular'} style={{ flex: 1 }}>
          {item.label}
        </Text>
        {isSelected && <Icon name="check" size={18} tone="strong" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.fieldContainer, style]}>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>

      {fetchState.status === 'loading' && (
        <View style={[styles.inputBox, styles.inputBoxDisabled]}>
          <ActivityIndicator size="small" color={Ink.faint} />
          <Text size="body" tone="faint" style={{ marginLeft: Space.sm }}>Loading…</Text>
        </View>
      )}

      {fetchState.status === 'error' && (
        <View style={[styles.inputBox, styles.inputBoxError]}>
          <Text size="body" tone={Status.danger} style={{ flex: 1 }} numberOfLines={1}>
            {fetchState.message}
          </Text>
        </View>
      )}

      {fetchState.status === 'success' && (
        <View style={[styles.pickerWrap, open && !isMobile && styles.pickerWrapOpen]}>
          <TouchableOpacity
            testID={testID}
            style={[styles.inputBox, open && styles.inputBoxActive]}
            onPress={() => setOpen((prev) => !prev)}
            activeOpacity={0.7}>
            <Text
              size="body"
              tone={selectedLabel ? 'strong' : 'faint'}
              style={{ flex: 1 }}
              numberOfLines={1}>
              {selectedLabel || `Select ${label}`}
            </Text>
            <Icon name="chevronDown" size={18} tone="faint" style={{ marginLeft: Space.sm }} />
          </TouchableOpacity>

          {/* Desktop: floating menu overlaying the form. */}
          {open && !isMobile && (
            <View style={styles.menu}>
              {items.length === 0 ? (
                <View style={styles.menuItem}>
                  <Text size="body" tone="faint">No options available</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.menuScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled">
                  {items.map((item) => renderRow(item, false))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* Mobile: bottom sheet over a dimmed backdrop. */}
      {isMobile && (
        <Modal
          visible={open}
          transparent
          animationType="none"
          onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdropRoot} onPress={() => setOpen(false)}>
            <Animated.View style={[styles.backdropFill, { opacity: anim }]} />
            <Animated.View
              style={[
                styles.sheet,
                {
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SHEET_TRAVEL, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetHandle} />
                <Text size="title" weight="semibold" style={styles.sheetTitle}>
                  {`Select ${label}`}
                </Text>
                {items.length === 0 ? (
                  <View style={styles.sheetItem}>
                    <Text size="body" tone="faint">No options available</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.sheetScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {items.map((item) => renderRow(item, true))}
                  </ScrollView>
                )}
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  // When the (desktop) menu is open, mark the active trigger with an ink border
  // so it reads as the anchored source of the floating menu.
  inputBoxActive: {
    borderColor: Ink.strong,
  },
  inputBoxDisabled: {
    backgroundColor: Ground.sunken,
  },
  inputBoxError: {
    borderColor: Status.danger,
    backgroundColor: Status.dangerWash,
  },

  // ── Desktop floating menu ──────────────────────────────────────────────────
  pickerWrap: {
    position: 'relative',
  },
  pickerWrapOpen: {
    zIndex: 20,
    ...{ elevation: 20 },
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Space.xs,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.control,
    backgroundColor: Ground.surface,
    overflow: 'hidden',
    ...Elevation.raised,
  },
  menuScroll: {
    maxHeight: 240,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // ── Mobile bottom sheet ─────────────────────────────────────────────────────
  // Layout shell — anchors the sheet to the bottom. Transparent; the dim lives
  // on backdropFill so it can fade independently of the sheet's slide.
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.45)',
  },
  sheet: {
    backgroundColor: Ground.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Space.sm,
    paddingBottom: Space.xl,
    paddingHorizontal: Space.base,
    maxHeight: '70%',
    ...Elevation.raised,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Line.divider,
    marginBottom: Space.md,
  },
  sheetTitle: {
    marginBottom: Space.sm,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.sm,
    paddingVertical: Space.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // Shared selected-row treatment (neutral, accent stays reserved).
  itemSelected: {
    backgroundColor: Ground.sunken,
  },
});

// Off-screen offset the sheet slides up from. Comfortably taller than the
// sheet's max height (70%) so it starts fully below the fold.
const SHEET_TRAVEL = 600;
