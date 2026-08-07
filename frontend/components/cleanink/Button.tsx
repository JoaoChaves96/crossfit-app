import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, GestureResponderEvent, View } from 'react-native';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { Accent, Ink, Ground, Status, Radius, Space, Line } from '@/constants/design';

/**
 * Clean Ink button.
 *
 * - primary: filled crimson — the one confident action per view.
 * - danger: outlined deeper red — cancel/leave, distinct from the accent so
 *   the primary action never competes with a destructive one.
 * - quiet: outlined ink — secondary neutral action (e.g. join waitlist).
 */
export type ButtonVariant = 'primary' | 'danger' | 'quiet';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  /** Optional leading glyph — use this instead of prefixing the label with "+". */
  icon?: IconName;
  onPress?: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  onPress,
  loading,
  disabled,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const contentColor =
    variant === 'primary' ? Accent.on : variant === 'danger' ? Status.danger : Ink.strong;
  const spinnerColor = contentColor;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'primary' && pressed && styles.primaryPressed,
        variant === 'danger' && styles.danger,
        variant === 'danger' && pressed && styles.dangerPressed,
        variant === 'quiet' && styles.quiet,
        variant === 'quiet' && pressed && styles.quietPressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon ? (
            <View style={styles.icon}>
              <Icon name={icon} size={18} tone={contentColor} />
            </View>
          ) : null}
          <Text size="body" weight="semibold" tone={contentColor}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 46,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.base,
    flexDirection: 'row',
  },
  icon: {
    marginRight: Space.xs,
  },
  primary: {
    backgroundColor: Accent.base,
  },
  primaryPressed: {
    backgroundColor: Accent.pressed,
  },
  danger: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Status.danger,
  },
  dangerPressed: {
    backgroundColor: Status.dangerWash,
  },
  quiet: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.divider,
  },
  quietPressed: {
    backgroundColor: Ground.sunken,
  },
  disabled: {
    opacity: 0.45,
  },
});

/** Placeholder wrapper for a full-width action inside a card footer. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: Space.xs }}>{children}</View>;
}
