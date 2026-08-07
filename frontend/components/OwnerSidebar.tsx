import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/SafeScreen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { styles } from './OwnerSidebar.styles';

// ─── Nav model ──────────────────────────────────────────────────────────────
//
// Canonical owner navigation shell, shared across the owner screen suite.
// `route` is the expo-router path a nav item points at; `enabled: false` items
// are shown but not yet wired to a destination (Dashboard/Classes are deferred).

export interface OwnerNavItem {
  label: string;
  key: string;
  enabled: boolean;
  route?: string;
}

export const OWNER_NAV_ITEMS: OwnerNavItem[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true, route: '/schedule-dashboard' },
  { label: 'Classes', key: 'classes', enabled: false },
  { label: 'Members', key: 'members', enabled: true, route: '/members' },
  { label: 'Coaches', key: 'coaches', enabled: true, route: '/coaches' },
  { label: 'Plans', key: 'plans', enabled: false },
  { label: 'Invites', key: 'invites', enabled: true, route: '/invites' },
  { label: 'Settings', key: 'settings', enabled: true, route: '/gym-settings' },
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
    <SafeScreen style={styles.sidebar} extraTopPadding={Spacing.lg}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {OWNER_NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
          const isDisabled = !item.enabled;
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
              <View
                style={[
                  styles.navIcon,
                  isActive ? styles.navIconActive : styles.navIconInactive,
                  isDisabled && styles.navIconDisabled,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelDisabled,
                ]}>
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
          <View style={styles.logoutIcon} />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}
