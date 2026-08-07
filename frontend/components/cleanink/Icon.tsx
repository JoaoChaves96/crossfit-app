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
  | 'chevronForward'
  | 'back'
  | 'menu'
  | 'add'
  | 'bell'
  | 'logout'
  | 'check'
  | 'close'
  | 'info'
  | 'edit'
  | 'gym'
  | 'mail'
  // Owner/coach nav glyphs
  | 'dashboard'
  | 'schedule'
  | 'classes'
  | 'members'
  | 'plans'
  | 'invites'
  | 'settings';

const GLYPH: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  people: 'people-outline',
  place: 'location-outline',
  coach: 'person-outline',
  calendar: 'calendar-outline',
  time: 'time-outline',
  chevronDown: 'chevron-down',
  chevronForward: 'chevron-forward',
  back: 'chevron-back',
  menu: 'menu',
  add: 'add',
  bell: 'notifications-outline',
  logout: 'log-out-outline',
  check: 'checkmark',
  close: 'close',
  info: 'information-circle-outline',
  edit: 'pencil-outline',
  gym: 'business-outline',
  mail: 'mail-outline',
  // Owner/coach nav glyphs
  dashboard: 'grid-outline',
  schedule: 'calendar-outline',
  classes: 'barbell-outline',
  members: 'people-outline',
  plans: 'card-outline',
  invites: 'paper-plane-outline',
  settings: 'settings-outline',
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
