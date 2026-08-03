import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { AppColors, FontSizes, FontWeights, Spacing } from '@/constants/theme';

const NAV_ITEMS = [
  { label: 'Schedule', path: '/(tabs)/schedule' },
  { label: 'My Bookings', path: '/(tabs)/my-bookings' },
  { label: 'Training History', path: '/(tabs)/training-history' },
  { label: 'Profile', path: '/(tabs)/profile' },
];

interface DesktopTopNavProps {
  gymName?: string;
}

export function DesktopTopNav({ gymName = 'My Gym' }: DesktopTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    const segment = path.split('/').pop() ?? '';
    return pathname.includes(segment);
  };

  return (
    <View style={navStyles.topBar}>
      {/* Gym selector */}
      <View style={navStyles.gymSelector}>
        <Text style={navStyles.gymName}>{gymName}</Text>
        <Text style={navStyles.gymCaret}>{'▼'}</Text>
      </View>

      {/* Nav tabs */}
      <View style={navStyles.navTabs}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as never)}
            >
              <Text
                style={[
                  navStyles.navLabel,
                  active ? navStyles.navLabelActive : navStyles.navLabelInactive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bell icon placeholder */}
      <Text style={navStyles.bellIcon}>{'🔔'}</Text>
    </View>
  );
}

const navStyles = StyleSheet.create({
  topBar: {
    height: 64,
    backgroundColor: AppColors.backgroundWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderDefault,
  },
  gymSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gymName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  gymCaret: {
    fontFamily: 'Inter',
    fontSize: FontSizes.xs,
    color: AppColors.textGray600,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
  },
  navLabelActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  navLabelInactive: {
    fontWeight: FontWeights.medium,
    color: AppColors.textGray600,
  },
  bellIcon: {
    fontSize: FontSizes.lg,
  },
});
