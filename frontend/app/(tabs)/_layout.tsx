import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Ground, Ink, Line, Type } from '@/constants/design';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function TabLayout() {
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  // Base bar content height; the home-indicator inset (0 in Chrome, non-zero on
  // device) is added on top so the Hanken label never gets clipped on web.
  const barContentHeight = 56;

  return (
    <Tabs
      screenOptions={{
        // Clean Ink: the one accent marks the active tab; everything else is quiet ink.
        tabBarActiveTintColor: Accent.base,
        tabBarInactiveTintColor: Ink.faint,
        tabBarLabelStyle: {
          fontFamily: Type.family.medium,
          fontSize: Type.size.label,
          letterSpacing: Type.tracking.normal,
        },
        tabBarIconStyle: { marginTop: 2 },
        headerShown: false,
        tabBarButton: HapticTab,
        // Hide bottom tab bar on desktop — top nav is used instead
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              // White surface lifted from the recessed screen ground by a single hairline.
              backgroundColor: Ground.surface,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Line.hairline,
              // Reserve room for icon + label + the home-indicator inset so the
              // label isn't clipped on web (where the inset is 0 and the default
              // height is too tight for the Hanken face).
              height: barContentHeight + insets.bottom,
              paddingBottom: insets.bottom + 6,
              paddingTop: 6,
            },
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
    </Tabs>
  );
}
