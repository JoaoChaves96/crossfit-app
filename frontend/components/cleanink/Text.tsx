import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { Type, Ink } from '@/constants/design';

/**
 * Clean Ink text.
 *
 * With a self-hosted font, React Native does NOT derive weight from
 * `fontWeight` — the face must be named explicitly. This primitive maps a
 * semantic weight to the correct Hanken Grotesk family so every restyled
 * screen gets the one type voice without repeating family strings.
 */
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextProps extends RNTextProps {
  /** Semantic size role from the Clean Ink ramp. Defaults to body. */
  size?: keyof typeof Type.size;
  weight?: Weight;
  /** Ink role. Defaults to strong. */
  tone?: keyof typeof Ink | string;
  tracking?: keyof typeof Type.tracking;
  /** Uppercase micro-label styling (tracking widened automatically). */
  upper?: boolean;
}

const familyFor: Record<Weight, string> = {
  regular: Type.family.regular,
  medium: Type.family.medium,
  semibold: Type.family.semibold,
  bold: Type.family.bold,
};

export function Text({
  size = 'body',
  weight = 'regular',
  tone = 'strong',
  tracking,
  upper,
  style,
  children,
  ...rest
}: TextProps) {
  const color = (Ink as Record<string, string>)[tone as string] ?? (tone as string);
  const track = tracking
    ? Type.tracking[tracking]
    : upper
      ? Type.tracking.wide
      : Type.tracking.normal;

  const composed: TextStyle = {
    fontFamily: familyFor[weight],
    fontSize: Type.size[size],
    color,
    letterSpacing: track,
    ...(upper ? styles.upper : null),
  };

  return (
    <RNText style={[composed, style]} {...rest}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  upper: {
    textTransform: 'uppercase',
  },
});
