import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './edit-class.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createApiClient } from '@/utils/api-client';
import { trimTime } from '@/utils/datetime';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type EditClassPayload = components['schemas']['EditClassDto'];
type EditClassResponse = components['schemas']['EditClassResponseDto'];
type DeleteClassResponse = components['schemas']['DeleteClassResponseDto'];
type Coach = components['schemas']['CoachListItemDto'];
type GetCoachesResponse = components['schemas']['GetCoachesResponseDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];

interface PickerItem {
  id: string;
  label: string;
}

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  bodyText: '#111827',
  labelText: '#374151',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  borderLight: '#E5E7EB',
  borderMid: '#D1D5DB',
  sidebarBg: '#F3F4F6',
  saveBtnBg: '#111827',
  saveBtnText: '#FFFFFF',
  cancelBtnText: '#374151',
  deleteBtnText: '#EF4444',
  deleteBtnBorder: '#EF4444',
  errorText: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
};

const FONT = {
  title: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700' as const },
  label: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500' as const },
  inputValue: { fontFamily: 'Inter', fontSize: 14, fontWeight: '400' as const },
  btnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500' as const },
  deleteNote: { fontFamily: 'Inter', fontSize: 11, fontWeight: '400' as const },
};

// ─── Picker Field ─────────────────────────────────────────────────────────────

interface PickerFieldProps {
  label: string;
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  fetchState: FetchState<unknown>;
  testID?: string;
}

function PickerField({ label, items, selectedId, onSelect, fetchState, testID }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = items.find((i) => i.id === selectedId)?.label ?? '';

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {fetchState.status === 'loading' && (
        <View style={[styles.inputBox, styles.inputBoxDisabled]}>
          <ActivityIndicator size="small" color={COLOR.mutedText} />
          <Text style={[FONT.inputValue, { color: COLOR.mutedText, marginLeft: 8 }]}>
            Loading…
          </Text>
        </View>
      )}
      {fetchState.status === 'error' && (
        <View style={[styles.inputBox, styles.inputBoxError]}>
          <Text style={[FONT.inputValue, { color: COLOR.errorText, flex: 1 }]} numberOfLines={1}>
            {fetchState.message}
          </Text>
        </View>
      )}
      {fetchState.status === 'success' && (
        <>
          <TouchableOpacity
            testID={testID}
            style={styles.inputBox}
            onPress={() => setOpen((prev) => !prev)}
            activeOpacity={0.7}>
            <Text
              style={[
                FONT.inputValue,
                { flex: 1, color: selectedLabel ? COLOR.bodyText : COLOR.mutedText },
              ]}
              numberOfLines={1}>
              {selectedLabel || `Select ${label}`}
            </Text>
            <Text style={[FONT.inputValue, { color: COLOR.mutedText }]}>v</Text>
          </TouchableOpacity>
          {open && (
            <View style={styles.dropdownList}>
              {items.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={[FONT.inputValue, { color: COLOR.mutedText }]}>
                    No options available
                  </Text>
                </View>
              ) : (
                items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.dropdownItem,
                      item.id === selectedId && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}>
                    <Text
                      style={[
                        FONT.inputValue,
                        { color: item.id === selectedId ? COLOR.saveBtnBg : COLOR.bodyText },
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

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
      <Text style={styles.fieldLabel}>{label}</Text>
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
        placeholderTextColor={COLOR.mutedText}
        keyboardType={keyboardType ?? 'default'}
      />
      {error ? <Text style={styles.validationErrorText}>{error}</Text> : null}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditClassScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
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

  const [form, setForm] = useState<FormState>({
    classTypeId: '',
    coachUserId: '',
    spaceId: '',
    scheduledDate: '',
    scheduledTime: '',
    capacity: '',
    duration: '',
  });

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
        setForm({
          classTypeId: data.classTypeId,
          coachUserId: data.coachUserId,
          spaceId: data.spaceId,
          scheduledDate: data.scheduledDate,
          scheduledTime: trimTime(data.scheduledTime),
          capacity: String(data.capacity),
          duration: String(data.duration),
        });
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

  if (isInitialLoading) {
    return (
      <View style={styles.centeredFeedback}>
        <ActivityIndicator size="large" color={COLOR.bodyText} />
      </View>
    );
  }

  if (hasInitialError) {
    return (
      <View style={styles.centeredFeedback}>
        <Text style={styles.errorText}>{classLoadState.message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAllData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile, isMobile && { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[FONT.title, { color: COLOR.bodyText }]}>Edit Class</Text>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>
          {/* Row 1 — Class Type + Coach */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <PickerField
                testID="edit-class-class-type-picker"
                label="Class Type"
                items={classTypeItems}
                selectedId={form.classTypeId}
                onSelect={(id) => setForm((s) => ({ ...s, classTypeId: id }))}
                fetchState={classTypesFetch}
              />
            </View>
            <View style={styles.rowItem}>
              <PickerField
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
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <PickerField
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
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Button row */}
          <View style={[styles.btnRow, isMobile && styles.btnRowMobile]}>
            {/* Left: Cancel + Save */}
            <View style={[styles.leftBtns, isMobile && styles.leftBtnsMobile]}>
              <TouchableOpacity
                testID="edit-class-cancel-btn"
                style={[styles.cancelBtn, isMobile && styles.btnMobile]}
                onPress={() => router.back()}
                disabled={isSubmitting || isDeleting}>
                <Text style={[FONT.btnText, { color: COLOR.cancelBtnText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="edit-class-save-btn"
                style={[styles.saveBtn, isMobile && styles.btnMobile, (isSubmitting || isDeleting) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLOR.saveBtnText} />
                ) : (
                  <Text style={[FONT.btnText, { color: COLOR.saveBtnText }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Right: Delete */}
            <View style={[styles.rightGroup, isMobile && styles.rightGroupMobile]}>
              <TouchableOpacity
                testID="edit-class-delete-btn"
                style={[styles.deleteBtn, isMobile && styles.btnMobile, isDeleting && styles.saveBtnDisabled]}
                onPress={handleDelete}
                disabled={isSubmitting || isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLOR.deleteBtnText} />
                ) : (
                  <Text style={[FONT.btnText, { color: COLOR.deleteBtnText }]}>Delete Class</Text>
                )}
              </TouchableOpacity>
              <Text style={[FONT.deleteNote, { color: COLOR.mutedText }]}>
                Only available for published classes
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

