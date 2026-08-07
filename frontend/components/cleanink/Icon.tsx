import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Ink } from '@/constants/design';

/**
 * Clean Ink icon set.
 *
 * One consistent-stroke family (Ionicons outline) behind semantic names, so
 * screens never reach for an emoji (👥 📍 👤 📅) as a UI glyph and the whole
 * app draws its icons from one weight. Add names here as the rollout needs
 * them — the map is the single source of truth for which glyph means what.
 */
export type IconName =
  | 'people'
  | 'place'
  | 'coach'
  | 'calendar'
  | 'time'
  | 'chevronDown'
  | 'bell'
  | 'logout'
  | 'check'
  | 'close';

const GLYPH: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  people: 'people-outline',
  place: 'location-outline',
  coach: 'person-outline',
  calendar: 'calendar-outline',
  time: 'time-outline',
  chevronDown: 'chevron-down',
  bell: 'notifications-outline',
  logout: 'log-out-outline',
  check: 'checkmark',
  close: 'close',
};

export interface IconProps {
  name: IconName;
  size?: number;
  /** Ink role or explicit color. Defaults to muted. */
  tone?: keyof typeof Ink | string;
  style?: object;
}

export function Icon({ name, size = 16, tone = 'muted', style }: IconProps) {
  const color = (Ink as Record<string, string>)[tone as string] ?? (tone as string);
  return <Ionicons name={GLYPH[name]} size={size} color={color} style={style} />;
}
