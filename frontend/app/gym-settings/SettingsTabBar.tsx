import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './gym-settings.styles';

export type ActiveTab = 'spaces' | 'class-types' | 'booking-rules' | 'profile';

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'spaces', label: 'Spaces' },
  { key: 'class-types', label: 'Class Types' },
  { key: 'booking-rules', label: 'Booking Rules' },
  { key: 'profile', label: 'Profile' },
];

interface SettingsTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.tabFill} />
    </View>
  );
}
