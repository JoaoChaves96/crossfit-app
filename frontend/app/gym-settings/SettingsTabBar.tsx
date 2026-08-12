import React from 'react';
import { View } from 'react-native';
import { SegmentedToggle } from '@/components/cleanink';
import { styles } from './gym-settings.styles';

export type ActiveTab = 'spaces' | 'class-types' | 'plans' | 'booking-rules' | 'profile';

const TABS: { value: ActiveTab; label: string }[] = [
  { value: 'spaces', label: 'Spaces' },
  { value: 'class-types', label: 'Class Types' },
  { value: 'plans', label: 'Plans' },
  { value: 'booking-rules', label: 'Booking Rules' },
  { value: 'profile', label: 'Profile' },
];

interface SettingsTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <View style={styles.segmentedWrap}>
      <SegmentedToggle<ActiveTab>
        options={TABS}
        value={activeTab}
        onChange={onTabChange}
        testIDPrefix="settings-tab"
      />
    </View>
  );
}
