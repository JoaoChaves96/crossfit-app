import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { styles } from './gym-settings.styles';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsTabBar, ActiveTab } from './SettingsTabBar';
import { SpacesTab } from './SpacesTab';
import { ClassTypesTab } from './ClassTypesTab';
import { ProfileTab } from './ProfileTab';

const BODY_TEXT_COLOR = '#111827';

function PlaceholderTab({ label }: { label: string }) {
  return (
    <View style={styles.feedbackContainer}>
      <Text style={styles.placeholderText}>{label} — Coming soon</Text>
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
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <SettingsSidebar onNavigate={handleNavigate} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        <View style={styles.pageTitleRow}>
          {isMobile && (
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Text style={styles.hamburgerText}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle}>Gym Settings</Text>
        </View>

        <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'spaces' && token && currentGymId ? (
            <SpacesTab gymId={currentGymId} token={token} />
          ) : activeTab === 'spaces' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
            </View>
          ) : activeTab === 'class-types' && token && currentGymId ? (
            <ClassTypesTab gymId={currentGymId} token={token} />
          ) : activeTab === 'class-types' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
            </View>
          ) : activeTab === 'profile' && token && currentGymId ? (
            <ProfileTab gymId={currentGymId} token={token} />
          ) : activeTab === 'profile' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
            </View>
          ) : (
            <PlaceholderTab label="Booking Rules" />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
