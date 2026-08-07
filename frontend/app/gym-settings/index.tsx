import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { Text, Icon } from '@/components/cleanink';
import { Ink, Space } from '@/constants/design';
import { styles } from './gym-settings.styles';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsTabBar, ActiveTab } from './SettingsTabBar';
import { SpacesTab } from './SpacesTab';
import { ClassTypesTab } from './ClassTypesTab';
import { ProfileTab } from './ProfileTab';

function PlaceholderTab({ label }: { label: string }) {
  return (
    <View style={styles.feedbackContainer}>
      <Text size="body" tone="faint">{label} — Coming soon</Text>
    </View>
  );
}

export default function GymSettings() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState<ActiveTab>('spaces');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = useCallback(
    (key: string) => {
      setDrawerOpen(false);
      if (key === 'schedule') router.push('/schedule-dashboard' as never);
      if (key === 'coaches') router.push('/coaches' as never);
      if (key === 'classes') router.push('/schedule-dashboard' as never);
    },
    [router]
  );

  return (
    <View style={styles.root}>
      {!isMobile && <SettingsSidebar onNavigate={handleNavigate} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <SettingsSidebar onNavigate={handleNavigate} />
        </OwnerNavDrawer>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        <SafeScreen style={styles.pageTitleRow} applyTopInset={isMobile} extraTopPadding={Space.base}>
          {isMobile && (
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Icon name="menu" size={24} tone="strong" />
            </TouchableOpacity>
          )}
          <Text size="screen" weight="bold" tone="strong">Gym Settings</Text>
        </SafeScreen>

        <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'spaces' && token && currentGymId ? (
            <SpacesTab gymId={currentGymId} token={token} isMobile={isMobile} />
          ) : activeTab === 'spaces' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={Ink.strong} />
            </View>
          ) : activeTab === 'class-types' && token && currentGymId ? (
            <ClassTypesTab gymId={currentGymId} token={token} isMobile={isMobile} />
          ) : activeTab === 'class-types' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={Ink.strong} />
            </View>
          ) : activeTab === 'profile' && token && currentGymId ? (
            <ProfileTab gymId={currentGymId} token={token} />
          ) : activeTab === 'profile' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={Ink.strong} />
            </View>
          ) : (
            <PlaceholderTab label="Booking Rules" />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
