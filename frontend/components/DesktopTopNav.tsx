import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Text } from '@/components/cleanink';
import { Accent, Ground, Line, Space } from '@/constants/design';
import { NotificationBell } from '@/components/NotificationBell';
import { GymMenu } from '@/components/GymMenu';

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
      {/* Gym selector menu (gym name + Log Out) */}
      <GymMenu gymName={gymName} />

      {/* Nav tabs */}
      <View style={navStyles.navTabs}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as never)}
            >
              {/* Clean Ink: the one accent marks the active nav item; the rest is quiet ink. */}
              <Text
                weight={active ? 'semibold' : 'medium'}
                tone={active ? Accent.base : 'muted'}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Notification bell */}
      <NotificationBell />
    </View>
  );
}

const navStyles = StyleSheet.create({
  topBar: {
    height: 64,
    backgroundColor: Ground.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Line.hairline,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xxl,
  },
});
