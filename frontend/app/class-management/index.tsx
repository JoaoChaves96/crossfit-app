import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { Text, Icon } from '@/components/cleanink';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { Ink, Space } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';
import { ClassManagementSidebar } from './ClassManagementSidebar';
import { ClassHeader, ClassTitleRow, MobileClassInfoCard, ClassActions } from './ClassHeader';
import { BookingsPanel } from './BookingsPanel';
import { ResultsPanel } from './ResultsPanel';
import { ProgrammingPanel } from './ProgrammingPanel';
import { useClassTransition } from './useClassTransition';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type ClassBookingItem = components['schemas']['ClassBookingItemDto'];
type GetClassBookingsResponse = components['schemas']['GetClassBookingsResponseDto'];
type ClassResultItem = components['schemas']['ClassResultItemDto'];
type GetClassResultsResponse = components['schemas']['GetClassResultsResponseDto'];

type MobileTab = 'info' | 'bookings' | 'results' | 'programming';

const MOBILE_TABS: { key: MobileTab; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'results', label: 'Results' },
  { key: 'programming', label: 'Programming' },
];

export default function ClassManagement() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const safeTop = useSafeAreaTop();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('info');

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [allBookings, setAllBookings] = useState<ClassBookingItem[]>([]);
  const [results, setResults] = useState<ClassResultItem[]>([]);
  const [isLoadingClass, setIsLoadingClass] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const fetchClassDetail = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoadingClass(true);
    setClassError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<ClassDetail>(
        `/api/gyms/${currentGymId}/classes/${classId}`
      );
      setClassDetail(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load class';
      setClassError(msg);
    } finally {
      setIsLoadingClass(false);
    }
  }, [token, currentGymId, classId]);

  const fetchBookings = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetClassBookingsResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/bookings`
      );
      setAllBookings(data.bookings ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings';
      setBookingsError(msg);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [token, currentGymId, classId]);

  const fetchResults = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoadingResults(true);
    setResultsError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetClassResultsResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/results`
      );
      setResults(data.results ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load results';
      setResultsError(msg);
    } finally {
      setIsLoadingResults(false);
    }
  }, [token, currentGymId, classId]);

  useEffect(() => {
    fetchClassDetail();
    fetchBookings();
    fetchResults();
  }, [fetchClassDetail, fetchBookings, fetchResults]);

  const { isTransitioning, handleTransition } = useClassTransition({
    classDetail,
    token,
    currentGymId,
    classId,
    onTransitionSuccess: fetchClassDetail,
  });

  const bookedList = allBookings.filter((b) => b.status === 'booked');
  const waitlistedList = allBookings.filter((b) => b.status === 'waitlisted');

  const handleNavigate = useCallback(
    (key: string) => {
      setDrawerOpen(false);
      if (key === 'schedule') router.push('/schedule-dashboard' as never);
      if (key === 'coaches') router.push('/coaches' as never);
      if (key === 'classes') router.push('/schedule-dashboard' as never);
      if (key === 'members') router.push('/members' as never);
      if (key === 'settings') router.push('/gym-settings' as never);
    },
    [router]
  );

  const handleMarkAttendance = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(`/coach-mark-attendance?classId=${classId}&gymId=${currentGymId}` as never);
  }, [router, classId, currentGymId]);

  const handleEditClass = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(`/edit-class?classId=${classId}&gymId=${currentGymId}` as never);
  }, [router, classId, currentGymId]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!isMobile && <ClassManagementSidebar onNavigate={handleNavigate} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <ClassManagementSidebar onNavigate={handleNavigate} />
        </OwnerNavDrawer>
      )}

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[styles.mainContent, isMobile && styles.mainContentMobile, isMobile && { paddingTop: safeTop + Space.base }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {isMobile ? (
          <View style={styles.topBar}>
            <TouchableOpacity
              testID="class-management-back-btn"
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="back" size={24} tone={Ink.strong} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Icon name="menu" size={24} tone="strong" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            testID="class-management-back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="back" size={24} tone={Ink.strong} />
          </TouchableOpacity>
        )}

        {isLoadingClass ? (
          <View style={styles.centeredFeedback}>
            <ActivityIndicator size="large" color={Ink.strong} />
          </View>
        ) : classError ? (
          <View style={styles.centeredFeedback}>
            <Text size="body" tone={Ink.strong} style={styles.errorText}>{classError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClassDetail}>
              <Text size="body" weight="medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : classDetail ? (
          <>
            {isMobile ? (
              <ClassTitleRow
                classDetail={classDetail}
                isTransitioning={isTransitioning}
                onTransition={handleTransition}
              />
            ) : (
              <ClassHeader
                classDetail={classDetail}
                isTransitioning={isTransitioning}
                onTransition={handleTransition}
                onMarkAttendance={handleMarkAttendance}
                onEditClass={handleEditClass}
              />
            )}

            {isLoadingBookings || isLoadingResults ? (
              <View style={styles.centeredFeedback}>
                <ActivityIndicator size="small" color={Ink.muted} />
              </View>
            ) : bookingsError || resultsError ? (
              <View style={styles.centeredFeedback}>
                {bookingsError ? (
                  <>
                    <Text size="body" tone={Ink.strong} style={styles.errorText}>{bookingsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
                      <Text size="body" weight="medium">Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {resultsError ? (
                  <>
                    <Text size="body" tone={Ink.strong} style={styles.errorText}>{resultsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchResults}>
                      <Text size="body" weight="medium">Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : isMobile ? (
              /* Mobile: Info | Bookings | Results | Programming */
              <View style={styles.mobileTabsContainer}>
                <View style={styles.mobileTabBar}>
                  {MOBILE_TABS.map((tab) => {
                    const isActive = mobileTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        testID={`class-management-tab-${tab.key}`}
                        style={[styles.mobileTab, isActive && styles.mobileTabActive]}
                        onPress={() => setMobileTab(tab.key)}>
                        <Text
                          size="meta"
                          weight={isActive ? 'semibold' : 'regular'}
                          tone={isActive ? 'strong' : 'muted'}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {mobileTab === 'info' ? (
                  <View>
                    <MobileClassInfoCard classDetail={classDetail} />
                    <ClassActions
                      onMarkAttendance={handleMarkAttendance}
                      onEditClass={handleEditClass}
                      isMobile
                    />
                  </View>
                ) : mobileTab === 'bookings' ? (
                  <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                ) : mobileTab === 'results' ? (
                  <ResultsPanel results={results} />
                ) : (
                  <ProgrammingPanel
                    token={token}
                    currentGymId={currentGymId}
                    classId={classId}
                    classState={classDetail.state}
                  />
                )}
              </View>
            ) : (
              <>
                <View style={styles.listsRow}>
                  <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                  <ResultsPanel results={results} />
                </View>
                <ProgrammingPanel
                  token={token}
                  currentGymId={currentGymId}
                  classId={classId}
                  classState={classDetail.state}
                />
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
