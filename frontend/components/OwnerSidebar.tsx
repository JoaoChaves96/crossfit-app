import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, type IconName } from '@/components/cleanink';
import { Ink, Space, Status } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';
import { styles } from './OwnerSidebar.styles';

// ─── Nav model ──────────────────────────────────────────────────────────────
//
// Canonical owner navigation shell, shared across the owner screen suite.
// `route` is the expo-router path a nav item points at; `enabled: false` items
// are shown but not yet wired to a destination (Dashboard/Classes are deferred).
// `icon` keys the Clean Ink glyph drawn beside each label.

export interface OwnerNavItem {
  label: string;
  key: string;
  enabled: boolean;
  route?: string;
  icon: IconName;
}

export const OWNER_NAV_ITEMS: OwnerNavItem[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false, icon: 'dashboard' },
  { label: 'Schedule', key: 'schedule', enabled: true, route: '/schedule-dashboard', icon: 'schedule' },
  { label: 'Classes', key: 'classes', enabled: false, icon: 'classes' },
  { label: 'Members', key: 'members', enabled: true, route: '/members', icon: 'members' },
  { label: 'Coaches', key: 'coaches', enabled: true, route: '/coaches', icon: 'coach' },
  { label: 'Plans', key: 'plans', enabled: false, icon: 'plans' },
  { label: 'Invites', key: 'invites', enabled: true, route: '/invites', icon: 'invites' },
  { label: 'Settings', key: 'settings', enabled: true, route: '/gym-settings', icon: 'settings' },
];

interface OwnerSidebarProps {
  /** Key of the nav item to render as active (e.g. "schedule", "classes"). */
  activeItem: string;
  /**
   * Optional navigation handler. When provided it fully owns navigation for a
   * tapped item (useful for closing a mobile drawer first). When omitted, the
   * sidebar routes directly via expo-router using each item's `route`.
   */
  onNavigate?: (key: string) => void;
}

export function OwnerSidebar({ activeItem, onNavigate }: OwnerSidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handlePress = (item: OwnerNavItem) => {
    if (onNavigate) {
      onNavigate(item.key);
      return;
    }
    if (item.route) {
      router.push(item.route as never);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as never);
  };

  return (
    <SafeScreen style={styles.sidebar} extraTopPadding={Space.lg}>
      <View style={styles.sidebarLogo}>
        <Icon name="gym" size={20} tone="strong" />
        <Text weight="bold" size="title" tone="strong">BoxOps</Text>
      </View>
      <View style={styles.navGroup}>
        {OWNER_NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
          const isDisabled = !item.enabled;
          // One accent marks the active item; the rest is quiet ink, and
          // deferred items read as faint.
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

      {/* Log Out lives at the foot of the shared owner nav — the only sign-out
          path for owner/coach screens, which have no GymMenu. */}
      <View style={styles.footer}>
        <Pressable
          testID="nav-logout"
          style={styles.logoutItem}
          onPress={handleLogout}>
          <Icon name="logout" size={18} tone={Status.danger} />
          <Text weight="medium" tone={Status.danger}>Log Out</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}
