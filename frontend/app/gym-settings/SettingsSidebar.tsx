import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeScreen } from '@/components/SafeScreen';
import { Spacing } from '@/constants/theme';
import { styles } from './gym-settings.styles';

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: true },
  { label: 'Athletes', key: 'athletes', enabled: false },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: true },
];

interface SettingsSidebarProps {
  onNavigate: (key: string) => void;
}

export function SettingsSidebar({ onNavigate }: SettingsSidebarProps) {
  return (
    <SafeScreen style={styles.sidebar} extraTopPadding={Spacing.lg}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === 'settings';
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`sidebar-nav-${item.key}`}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => onNavigate(item.key)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <View
                style={[
                  styles.navIcon,
                  isActive ? styles.navIconActive : styles.navIconInactive,
                  isDisabled && styles.navIconMuted,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelMuted,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeScreen>
  );
}
