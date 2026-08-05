import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isDesktop } = useResponsiveLayout();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        // Hide bottom tab bar on desktop — top nav is used instead
        tabBarStyle: isDesktop ? { display: 'none' } : undefined,
      }}>
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          tabBarButtonTestID: 'tab-schedule',
        }}
      />
      <Tabs.Screen
        name="my-bookings"
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checkmark.circle.fill" color={color} />,
          tabBarButtonTestID: 'tab-my-bookings',
        }}
      />
      <Tabs.Screen
        name="training-history"
        options={{
          title: 'Training',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
          tabBarButtonTestID: 'tab-training-history',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          tabBarButtonTestID: 'tab-profile',
        }}
      />
      <Tabs.Screen
        name="invites"
        options={{
          title: 'Invites',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="envelope.fill" color={color} />,
          tabBarButtonTestID: 'tab-invites',
        }}
      />
    </Tabs>
  );
}
