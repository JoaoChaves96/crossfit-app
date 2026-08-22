import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, type IconName } from '@/components/cleanink';
import { Space } from '@/constants/design';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { GymMenu } from '@/components/GymMenu';
import { styles } from './OwnerSidebar.styles';

// ─── Nav model ──────────────────────────────────────────────────────────────
//
// Canonical coach navigation shell, shared across the coach screen suite. It
// replaces the three per-screen dark-surface `Sidebar` copies that each coach
// screen carried its own version of.
//
// The item set is deliberately just My Classes + Profile — the coach role's
// scope in `designs/coach-screens.pen` (frame eT7ZY). Profile has no coach
// destination yet, so it renders as a faint deferred item exactly like the
// owner shell's Dashboard/Classes.

export interface CoachNavItem {
  label: string;
  key: string;
  enabled: boolean;
  route?: string;
  icon: IconName;
}

export const COACH_NAV_ITEMS: CoachNavItem[] = [
  { label: 'My Classes', key: 'classes', enabled: true, route: '/coach-classes', icon: 'classes' },
  { label: 'Profile', key: 'profile', enabled: false, icon: 'coach' },
];

interface CoachSidebarProps {
  /** Key of the nav item to render as active (e.g. "classes"). */
  activeItem: string;
  /**
   * Optional navigation handler. When provided it fully owns navigation for a
   * tapped item (useful for closing a mobile drawer first). When omitted, the
   * sidebar routes directly via expo-router using each item's `route`.
   */
  onNavigate?: (key: string) => void;
}

export function CoachSidebar({ activeItem, onNavigate }: CoachSidebarProps) {
  const router = useRouter();
  const { isMobile } = useResponsiveLayout();

  const handlePress = (item: CoachNavItem) => {
    if (onNavigate) {
      onNavigate(item.key);
      return;
    }
    if (item.route) {
      router.push(item.route as never);
    }
  };

  return (
    <SafeScreen style={styles.sidebar} extraTopPadding={Space.lg}>
      {/* Top-left identity, the same slot the athlete's gym name occupies. On
          desktop that is the gym menu itself — it names the gym, offers the
          others, and owns sign-out. On mobile this sidebar lives inside a
          drawer, so the menu sits in the screen header instead and the drawer
          keeps the product name. */}
      <View style={styles.sidebarLogo}>
        {isMobile ? (
          <>
            <Icon name="gym" size={20} tone="strong" />
            <Text weight="bold" size="title" tone="strong">BoxOps</Text>
          </>
        ) : (
          <GymMenu />
        )}
      </View>
      <View style={styles.navGroup}>
        {COACH_NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
          const isDisabled = !item.enabled;
          // Selection reads through tone + weight, never the accent.
          const tone = isDisabled ? 'faint' : isActive ? 'strong' : 'muted';
          return (
            <Pressable
              key={item.key}
              testID={`nav-${item.key}`}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => handlePress(item)}
              disabled={isDisabled}>
              <Icon name={item.icon} size={18} tone={tone} />
              <Text weight={isActive ? 'semibold' : 'medium'} tone={tone}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* No Log Out here: the gym menu owns it, so the coach signs out from the
          same control the athlete does rather than from two places at once. */}
    </SafeScreen>
  );
}
