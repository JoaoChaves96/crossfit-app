import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './edit-class.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { Text, Icon, Button, SelectField } from '@/components/cleanink';
import { Ink, Space, Status } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { trimTime } from '@/utils/datetime';
import { components } from '@/types/api.gen';
import { ClassState, STATE_LABEL } from './class-management/classStates';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type EditClassPayload = components['schemas']['EditClassDto'];
type EditClassResponse = components['schemas']['EditClassResponseDto'];
type DeleteClassResponse = components['schemas']['DeleteClassResponseDto'];
type Coach = components['schemas']['CoachListItemDto'];
type GetCoachesResponse = components['schemas']['GetCoachesResponseDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];

/**
 * The backend permits editing and deleting a class only while it is `published`
 * (see edit-class.handler / delete-class.handler, both of which reject anything
 * else with an invalid-state error). Once booking closes the class is history, so
 * the form renders read-only rather than offering actions that would 400.
 *
 * Keyed by every non-published state, so this map doubles as the lock predicate.
 */
const READ_ONLY_NOTICE: Record<Exclude<ClassState, 'published'>, string> = {
  booking_closed: 'Booking has closed, so this class can no longer be edited.',
  in_progress: 'This class is in progress and can no longer be edited.',
  completed: 'This class has finished and can no longer be edited.',
  archived: 'This class is archived and can no longer be edited.',
};

interface PickerItem {
  id: string;
  label: string;
}

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

// ─── Text Input Field ─────────────────────────────────────────────────────────

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  error?: string;
  testID?: string;
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  testID,
}: TextFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>
      <TextInput
        testID={testID}
        style={[
          styles.inputBox,
          styles.inputBoxText,
          error ? styles.inputBoxValidationError : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Ink.faint}
        keyboardType={keyboardType ?? 'default'}
      />
      {error ? <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  classTypeId: string;
  coachUserId: string;
  spaceId: string;
  scheduledDate: string;
  scheduledTime: string;
  capacity: string;
  duration: string;
}

interface FormErrors {
  scheduledDate?: string;
  scheduledTime?: string;
  capacity?: string;
  duration?: string;
}

/** The form as loaded, before the user touched anything. */
const EMPTY_FORM: FormState = {
  classTypeId: '',
  coachUserId: '',
  spaceId: '',
  scheduledDate: '',
  scheduledTime: '',
  capacity: '',
  duration: '',
};

function formFromClass(data: ClassDetail): FormState {
  return {
    classTypeId: data.classTypeId,
    coachUserId: data.coachUserId,
    spaceId: data.spaceId,
    scheduledDate: data.scheduledDate,
    scheduledTime: trimTime(data.scheduledTime),
    capacity: String(data.capacity),
    duration: String(data.duration),
  };
}

/** True when any field differs from what was loaded. */
function isFormDirty(form: FormState, baseline: FormState): boolean {
  return (Object.keys(baseline) as (keyof FormState)[]).some(
    (key) => form[key] !== baseline[key],
  );
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.scheduledDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.scheduledDate.trim())) {
    errors.scheduledDate = 'Use format YYYY-MM-DD';
  }
  if (form.scheduledTime.trim() && !/^\d{2}:\d{2}$/.test(form.scheduledTime.trim())) {
    errors.scheduledTime = 'Use format HH:mm';
  }
  if (form.capacity.trim()) {
    const cap = Number(form.capacity);
    if (isNaN(cap) || cap <= 0) {
      errors.capacity = 'Capacity must be a positive number';
    }
  }
  if (form.duration.trim()) {
    const dur = Number(form.duration);
    if (isNaN(dur) || dur <= 0) {
      errors.duration = 'Duration must be a positive number';
    }
  }
  return errors;
}

// ─── Read-only summary (class past `published`) ────────────────────────────────

interface ReadOnlyClassSummaryProps {
  classDetail: ClassDetail;
  classState: Exclude<ClassState, 'published'>;
  classTypeItems: PickerItem[];
  coachItems: PickerItem[];
  spaceItems: PickerItem[];
  onBack: () => void;
}

function labelFor(items: PickerItem[], id: string, fallback: string): string {
  return items.find((i) => i.id === id)?.label || fallback || '—';
}

/**
 * What the form would have shown, as plain text. Offering disabled inputs and a
 * dead Save button would imply the class is merely temporarily locked; it isn't —
 * the backend will refuse the edit outright.
 */
function ReadOnlyClassSummary({
  classDetail,
  classState,
  classTypeItems,
  coachItems,
  spaceItems,
  onBack,
}: ReadOnlyClassSummaryProps) {
  const fields: { label: string; value: string }[] = [
    { label: 'Class Type', value: labelFor(classTypeItems, classDetail.classTypeId, classDetail.classTypeName) },
    { label: 'Coach', value: labelFor(coachItems, classDetail.coachUserId, classDetail.coachName) },
    { label: 'Space', value: labelFor(spaceItems, classDetail.spaceId, classDetail.spaceName) },
    { label: 'Date', value: classDetail.scheduledDate },
    { label: 'Time', value: trimTime(classDetail.scheduledTime) },
    { label: 'Capacity', value: `${classDetail.bookedCount} / ${classDetail.capacity}` },
    { label: 'Duration', value: `${classDetail.duration} min` },
  ];

  return (
    <>
      <View testID="edit-class-readonly-notice" style={styles.readOnlyNotice}>
        <Text size="label" weight="semibold" tone="faint" upper>
          {STATE_LABEL[classState]}
        </Text>
        <Text size="meta" tone="muted">{READ_ONLY_NOTICE[classState]}</Text>
      </View>

      <View style={styles.readOnlyGrid}>
        {fields.map((field) => (
          <View key={field.label} style={styles.readOnlyCell}>
            <Text size="label" weight="semibold" tone="faint" upper>{field.label}</Text>
            <Text size="body" weight="medium">{field.value || '—'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.btnWrap}>
        <Button
          testID="edit-class-back-to-class-btn"
          label="Back"
          variant="quiet"
          onPress={onBack}
        />
      </View>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditClassScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const safeTop = useSafeAreaTop();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [classLoadState, setClassLoadState] = useState<FetchState<ClassDetail>>({
    status: 'loading',
  });
  const [classTypesFetch, setClassTypesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });
  const [coachesFetch, setCoachesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });
  const [spacesFetch, setSpacesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Snapshot of the loaded class, so Save can stay disabled until something
  // actually changes and re-enable if the user reverts their edit by hand.
  const [baselineForm, setBaselineForm] = useState<FormState>(EMPTY_FORM);

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    const client = createApiClient({ token });

    // Fetch class data and pickers in parallel
    const classPromise = client
      .get<ClassDetail>(`/api/gyms/${currentGymId}/classes/${classId}`)
      .then((data) => {
        setClassLoadState({ status: 'success', data });
        const loaded = formFromClass(data);
        setForm(loaded);
        setBaselineForm(loaded);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load class';
        setClassLoadState({ status: 'error', message });
      });

    const classTypesPromise = client
      .get<GetClassTypesResponse>(`/api/gyms/${currentGymId}/configuration/class-types`)
      .then((data) => {
        const items: PickerItem[] = data.classTypes.map((ct) => ({ id: ct.id, label: ct.name }));
        setClassTypesFetch({ status: 'success', data: items });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load class types';
        setClassTypesFetch({ status: 'error', message });
      });

    const coachesPromise = client
      .get<GetCoachesResponse>(`/api/gyms/${currentGymId}/configuration/coaches`)
      .then((data) => {
        const items: PickerItem[] = data.coaches.map((c: Coach) => ({
          id: c.userId,
          label: c.name || c.email,
        }));
        setCoachesFetch({ status: 'success', data: items });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load coaches';
        setCoachesFetch({ status: 'error', message });
      });

    const spacesPromise = client
      .get<GetSpacesResponse>(`/api/gyms/${currentGymId}/configuration/spaces`)
      .then((data) => {
        const items: PickerItem[] = data.spaces.map((s) => ({ id: s.id, label: s.name }));
        setSpacesFetch({ status: 'success', data: items });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load spaces';
        setSpacesFetch({ status: 'error', message });
      });

    await Promise.all([classPromise, classTypesPromise, coachesPromise, spacesPromise]);
  }, [token, currentGymId, classId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSave = async () => {
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!token || !currentGymId || !classId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const client = createApiClient({ token });
      const payload: EditClassPayload = {
        ...(form.classTypeId ? { classTypeId: form.classTypeId } : {}),
        ...(form.coachUserId ? { coachUserId: form.coachUserId } : {}),
        ...(form.spaceId ? { spaceId: form.spaceId } : {}),
        ...(form.scheduledDate.trim() ? { scheduledDate: form.scheduledDate.trim() } : {}),
        ...(form.scheduledTime.trim() ? { scheduledTime: form.scheduledTime.trim() } : {}),
        ...(form.capacity.trim() ? { capacity: Number(form.capacity) } : {}),
        ...(form.duration.trim() ? { duration: Number(form.duration) } : {}),
      };
      await client.patch<EditClassResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}`,
        payload as unknown as Record<string, unknown>
      );
      router.push(`/class-management?classId=${classId}` as never);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(() => {
    if (!token || !currentGymId || !classId) return;

    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const client = createApiClient({ token });
              await client.delete<DeleteClassResponse>(
                `/api/gyms/${currentGymId}/classes/${classId}`
              );
              router.push('/schedule-dashboard' as never);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete class';
              Alert.alert('Error', message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [token, currentGymId, classId, router]);

  const classTypeItems = classTypesFetch.status === 'success' ? classTypesFetch.data : [];
  const coachItems = coachesFetch.status === 'success' ? coachesFetch.data : [];
  const spaceItems = spacesFetch.status === 'success' ? spacesFetch.data : [];

  const isInitialLoading = classLoadState.status === 'loading';
  const hasInitialError = classLoadState.status === 'error';

  // Lock only on a state we recognise as past `published`. An absent or unknown
  // state falls through to the editable form and lets the backend be the
  // authority, rather than stranding the owner on a read-only screen.
  const classState = classLoadState.status === 'success' ? classLoadState.data.state : null;
  const lockedState = classState !== null && classState in READ_ONLY_NOTICE
    ? (classState as Exclude<ClassState, 'published'>)
    : null;
  const isMutable = lockedState === null;
  const isDirty = isFormDirty(form, baselineForm);
  const isBusy = isSubmitting || isDeleting;

  if (isInitialLoading) {
    return (
      <View style={styles.centeredFeedback}>
        <ActivityIndicator size="large" color={Ink.strong} />
      </View>
    );
  }

  if (hasInitialError) {
    return (
      <View style={styles.centeredFeedback}>
        <Text size="body" tone={Status.danger} style={styles.errorText}>{classLoadState.message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAllData}>
          <Text size="body" weight="medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile, isMobile && { paddingTop: safeTop + Space.base }]} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="edit-class-back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="back" size={24} tone={Ink.strong} />
          </TouchableOpacity>
          <Text size="screen" weight="bold">{isMutable ? 'Edit Class' : 'Class Details'}</Text>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>
          {lockedState !== null && classLoadState.status === 'success' ? (
            <ReadOnlyClassSummary
              classDetail={classLoadState.data}
              classState={lockedState}
              classTypeItems={classTypeItems}
              coachItems={coachItems}
              spaceItems={spaceItems}
              onBack={() => router.back()}
            />
          ) : (
          <>
          {/* Row 1 — Class Type + Coach */}
          <View style={[styles.row, isMobile && styles.rowMobile, styles.rowPickerTop]}>
            <View style={styles.rowItem}>
              <SelectField
                testID="edit-class-class-type-picker"
                label="Class Type"
                items={classTypeItems}
                selectedId={form.classTypeId}
                onSelect={(id) => setForm((s) => ({ ...s, classTypeId: id }))}
                fetchState={classTypesFetch}
              />
            </View>
            <View style={styles.rowItem}>
              <SelectField
                testID="edit-class-coach-picker"
                label="Coach"
                items={coachItems}
                selectedId={form.coachUserId}
                onSelect={(id) => setForm((s) => ({ ...s, coachUserId: id }))}
                fetchState={coachesFetch}
              />
            </View>
          </View>

          {/* Row 2 — Space + Date */}
          <View style={[styles.row, isMobile && styles.rowMobile, styles.rowPickerBottom]}>
            <View style={styles.rowItem}>
              <SelectField
                testID="edit-class-space-picker"
                label="Space"
                items={spaceItems}
                selectedId={form.spaceId}
                onSelect={(id) => setForm((s) => ({ ...s, spaceId: id }))}
                fetchState={spacesFetch}
              />
            </View>
            <View style={styles.rowItem}>
              <TextField
                testID="edit-class-date-input"
                label="Date"
                value={form.scheduledDate}
                onChangeText={(v) => setForm((s) => ({ ...s, scheduledDate: v }))}
                placeholder="YYYY-MM-DD"
                error={formErrors.scheduledDate}
              />
            </View>
          </View>

          {/* Row 3 — Time + Capacity */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <TextField
                testID="edit-class-time-input"
                label="Time"
                value={form.scheduledTime}
                onChangeText={(v) => setForm((s) => ({ ...s, scheduledTime: v }))}
                placeholder="HH:mm"
                error={formErrors.scheduledTime}
              />
            </View>
            <View style={styles.rowItem}>
              <TextField
                testID="edit-class-capacity-input"
                label="Capacity"
                value={form.capacity}
                onChangeText={(v) => setForm((s) => ({ ...s, capacity: v }))}
                placeholder="e.g. 20"
                keyboardType="numeric"
                error={formErrors.capacity}
              />
            </View>
          </View>

          {/* Row 4 — Duration */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <TextField
                testID="edit-class-duration-input"
                label="Duration (minutes)"
                value={form.duration}
                onChangeText={(v) => setForm((s) => ({ ...s, duration: v }))}
                placeholder="e.g. 60"
                keyboardType="numeric"
                error={formErrors.duration}
              />
            </View>
            {!isMobile && <View style={styles.rowItem} />}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Submit error */}
          {submitError ? (
            <View style={styles.submitErrorBanner}>
              <Text size="meta" tone={Status.danger} style={styles.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Footer actions */}
          {isMobile ? (
            <View style={styles.footerMobile}>
              {/* Primary action leads, full width. Stays disabled until the form
                  actually differs from the loaded class. */}
              <Button
                testID="edit-class-save-btn"
                label="Save Changes"
                variant="primary"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={isBusy || !isDirty}
              />
              {/* Cancel + Delete share the row 50/50 */}
              <View style={styles.pairedRowMobile}>
                <View style={styles.pairedItemMobile}>
                  <Button
                    testID="edit-class-cancel-btn"
                    label="Cancel"
                    variant="quiet"
                    onPress={() => router.back()}
                    disabled={isBusy}
                  />
                </View>
                <View style={styles.pairedItemMobile}>
                  <Button
                    testID="edit-class-delete-btn"
                    label="Delete Class"
                    variant="danger"
                    onPress={handleDelete}
                    loading={isDeleting}
                    disabled={isBusy}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.btnRow}>
              {/* Left: Cancel + Save */}
              <View style={styles.leftBtns}>
                <View style={styles.btnWrap}>
                  <Button
                    testID="edit-class-cancel-btn"
                    label="Cancel"
                    variant="quiet"
                    onPress={() => router.back()}
                    disabled={isBusy}
                  />
                </View>
                <View style={styles.btnWrap}>
                  <Button
                    testID="edit-class-save-btn"
                    label="Save Changes"
                    variant="primary"
                    onPress={handleSave}
                    loading={isSubmitting}
                    disabled={isBusy || !isDirty}
                  />
                </View>
              </View>

              {/* Right: Delete */}
              <View style={styles.rightGroup}>
                <View style={styles.btnWrap}>
                  <Button
                    testID="edit-class-delete-btn"
                    label="Delete Class"
                    variant="danger"
                    onPress={handleDelete}
                    loading={isDeleting}
                    disabled={isBusy}
                  />
                </View>
              </View>
            </View>
          )}
          </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

