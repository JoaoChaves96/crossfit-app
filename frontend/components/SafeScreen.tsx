import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * SafeScreen — single source of truth for top safe-area (notch) handling.
 *
 * Drop-in replacement for the top-level styled `View` of a screen (or any
 * container that must clear the notch). It renders exactly one `View` and
 * applies `paddingTop: insets.top` last, so it wins over any `paddingVertical`
 * in the passed `style` — matching the previous inline
 * `[styles.header, { paddingTop: insets.top + N }]` pattern byte-for-byte.
 *
 * - `extraTopPadding` — the constant `N` that a screen used to add on top of
 *   the inset (e.g. `insets.top + Spacing.md`). Applied as real padding inside.
 * - `backgroundColor` — fills the notch/inset area with the screen's header bg.
 *   Optional: if the passed `style` already sets a background, that wins.
 * - `applyTopInset` — set to `isMobile` for screens that only applied the inset
 *   on mobile; on desktop the base style's own padding is preserved untouched.
 *
 * For containers where a `View` wrapper can't go (a `ScrollView`
 * `contentContainerStyle`, or a `height: insets.top` spacer) use the
 * `useSafeAreaTop` hook instead so the notch value still comes from one place.
 */
export type SafeScreenProps = ViewProps & {
  /** Extra top padding added on top of the safe-area inset (the old `+ N`). */
  extraTopPadding?: number;
  /** Background color for the notch/inset area. */
  backgroundColor?: string;
  /** When false, no top inset padding is applied (e.g. desktop). Default true. */
  applyTopInset?: boolean;
};

export function SafeScreen({
  extraTopPadding = 0,
  backgroundColor,
  applyTopInset = true,
  style,
  children,
  ...rest
}: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = applyTopInset ? insets.top + extraTopPadding : undefined;

  return (
    <View
      {...rest}
      style={[
        backgroundColor != null ? { backgroundColor } : null,
        style,
        topPadding != null ? { paddingTop: topPadding } : null,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * useSafeAreaTop — the top safe-area inset (notch height), 0 on web/desktop.
 *
 * Use where a `SafeScreen` wrapper doesn't fit: inside a `ScrollView`
 * `contentContainerStyle` or a `height: insets.top` spacer. Keeps the notch
 * value sourced from one module instead of importing the library per screen.
 */
export function useSafeAreaTop(): number {
  return useSafeAreaInsets().top;
}
