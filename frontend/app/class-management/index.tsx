import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { createApiClient } from '@/utils/api-client';
import { AppColors, Spacing } from '@/constants/theme';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';
import { ClassManagementSidebar } from './ClassManagementSidebar';
import { ClassHeader, ClassTitleRow, MobileClassInfoCard, ClassActions } from './ClassHeader';
import { BookingsPanel } from './BookingsPanel';
import { ResultsPanel } from './ResultsPanel';
import { useClassTransition } from './useClassTransition';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type ClassBookingItem = components['schemas']['ClassBookingItemDto'];
type GetClassBookingsResponse = components['schemas']['GetClassBookingsResponseDto'];
type ClassResultItem = components['schemas']['ClassResultItemDto'];
type GetClassResultsResponse = components['schemas']['GetClassResultsResponseDto'];

type MobileTab = 'info' | 'bookings' | 'results';

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

  const handleAddProgramming = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(`/coach-class-details?classId=${classId}&gymId=${currentGymId}` as never);
  }, [router, classId, currentGymId]);

  const handleEditClass = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(`/edit-class?classId=${classId}&gymId=${currentGymId}` as never);
  }, [router, classId, currentGymId]);

  return (
    <View style={styles.root}>
      {!isMobile && <ClassManagementSidebar onNavigate={handleNavigate} />}

      {/* Mobile drawer */}
      {isMobile && (
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <ClassManagementSidebar onNavigate={handleNavigate} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[styles.mainContent, isMobile && styles.mainContentMobile, isMobile && { paddingTop: safeTop + Spacing.base }]}
        showsVerticalScrollIndicator={false}>

        {isMobile && (
          <TouchableOpacity
            testID="hamburger-btn"
            style={styles.hamburgerBtn}
            onPress={() => setDrawerOpen(true)}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        )}

        {isLoadingClass ? (
          <View style={styles.centeredFeedback}>
            <ActivityIndicator size="large" color={AppColors.textHeading} />
          </View>
        ) : classError ? (
          <View style={styles.centeredFeedback}>
            <Text style={styles.errorText}>{classError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClassDetail}>
              <Text style={styles.retryBtnText}>Retry</Text>
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
                onAddProgramming={handleAddProgramming}
                onEditClass={handleEditClass}
              />
            )}

            {isLoadingBookings || isLoadingResults ? (
              <View style={styles.centeredFeedback}>
                <ActivityIndicator size="small" color={AppColors.textMuted} />
              </View>
            ) : bookingsError || resultsError ? (
              <View style={styles.centeredFeedback}>
                {bookingsError ? (
                  <>
                    <Text style={styles.errorText}>{bookingsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {resultsError ? (
                  <>
                    <Text style={styles.errorText}>{resultsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchResults}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : isMobile ? (
              /* Mobile: 3-tab interface Info | Bookings | Results */
              <View style={styles.mobileTabsContainer}>
                <View style={styles.mobileTabBar}>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'info' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('info')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'info' && styles.mobileTabTextActive]}>
                      Info
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'bookings' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('bookings')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'bookings' && styles.mobileTabTextActive]}>
                      Bookings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'results' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('results')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'results' && styles.mobileTabTextActive]}>
                      Results
                    </Text>
                  </TouchableOpacity>
                </View>
                {mobileTab === 'info' ? (
                  <View>
                    <MobileClassInfoCard classDetail={classDetail} />
                    <ClassActions
                      onMarkAttendance={handleMarkAttendance}
                      onAddProgramming={handleAddProgramming}
                      onEditClass={handleEditClass}
                    />
                  </View>
                ) : mobileTab === 'bookings' ? (
                  <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                ) : (
                  <ResultsPanel results={results} />
                )}
              </View>
            ) : (
              <View style={styles.listsRow}>
                <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                <ResultsPanel results={results} />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
