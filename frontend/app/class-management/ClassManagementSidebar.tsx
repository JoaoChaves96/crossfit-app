import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, type IconName } from '@/components/cleanink';
import { Space } from '@/constants/design';
import { styles } from './class-management.styles';

const NAV_ITEMS: { label: string; key: string; enabled: boolean; icon: IconName }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false, icon: 'dashboard' },
  { label: 'Schedule', key: 'schedule', enabled: true, icon: 'schedule' },
  { label: 'Classes', key: 'classes', enabled: true, icon: 'classes' },
  { label: 'Members', key: 'members', enabled: true, icon: 'members' },
  { label: 'Coaches', key: 'coaches', enabled: true, icon: 'coach' },
  { label: 'Settings', key: 'settings', enabled: true, icon: 'settings' },
];

interface ClassManagementSidebarProps {
  onNavigate: (key: string) => void;
}

export function ClassManagementSidebar({ onNavigate }: ClassManagementSidebarProps) {
  return (
    <SafeScreen style={styles.sidebar} extraTopPadding={Space.lg}>
      <View style={styles.sidebarLogo}>
        <Icon name="gym" size={20} tone="strong" />
        <Text weight="bold" size="title" tone="strong">BoxOps</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === 'classes';
          const isDisabled = !item.enabled;
          const tone = isDisabled ? 'faint' : isActive ? 'strong' : 'muted';
          return (
            <TouchableOpacity
              key={item.key}
              testID={`nav-${item.key}`}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => onNavigate(item.key)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <Icon name={item.icon} size={18} tone={tone} />
              <Text weight={isActive ? 'semibold' : 'medium'} tone={tone}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeScreen>
  );
}
