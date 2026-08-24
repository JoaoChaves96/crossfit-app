import React from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Type } from '@/constants/design';
import { Text } from './Text';

/**
 * Clean Ink masked text field.
 *
 * One treatment for every password a user types — sign in, register, reset and
 * change. The four call sites had each hand-rolled the same `secureTextEntry` /
 * `autoCapitalize="none"` / `autoCorrect={false}` / bullet-placeholder set, and
 * their input styles had already drifted apart by 4px of height.
 *
 * The label is `meta` + semibold rather than the `SelectField`-style upper
 * `label`, which is what the auth screens shipped: these sit inside a card of
 * their own, not in a settings grid needing a section header's voice.
 *
 * `TextInput` cannot route through the `Text` primitive, so the face is named
 * explicitly here (Named-Face Rule) and nowhere else.
 */

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  testID?: string;
  editable?: boolean;
  /** Both from `useKeyboardAwareScroll`, on the screens that scroll. */
  onFocus?: () => void;
  onBlur?: () => void;
  returnKeyType?: 'done' | 'next';
  onSubmitEditing?: () => void;
  /** Applied to the field container, e.g. for a caller's own row spacing. */
  style?: StyleProp<ViewStyle>;
}

export function PasswordField({
  label,
  value,
  onChangeText,
  testID,
  editable = true,
  onFocus,
  onBlur,
  returnKeyType,
  onSubmitEditing,
  style,
}: PasswordFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text size="meta" weight="semibold">{label}</Text>
      <TextInput
        testID={testID}
        style={styles.input}
        placeholder="••••••••"
        placeholderTextColor={Ink.faint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Space.sm,
  },
  input: {
    height: 48,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
    paddingHorizontal: Space.base,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
});
