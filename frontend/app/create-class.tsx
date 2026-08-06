import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors, Spacing } from '@/constants/theme';
import { OwnerSidebar } from '@/components/OwnerSidebar';
import { formatShortDate, formatTime12h } from '@/utils/datetime';
import { styles, webDateTimeInputStyle } from './create-class.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateClassPayload = components['schemas']['CreateClassDto'];
type CreateClassResponse = components['schemas']['CreateClassResponseDto'];
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

// ─── Picker Field ──────────────────────────────────────────────────────────────

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
          <ActivityIndicator size="small" color={AppColors.textDisabled} />
          <Text style={[styles.inputBoxText, { color: AppColors.textDisabled, marginLeft: 8 }]}>
            Loading…
          </Text>
        </View>
      )}
      {fetchState.status === 'error' && (
        <View style={[styles.inputBox, styles.inputBoxError]}>
          <Text style={[styles.inputBoxText, { color: AppColors.errorDefault, flex: 1 }]} numberOfLines={1}>
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
                styles.inputBoxText,
                { flex: 1, color: selectedLabel ? AppColors.textHeading : AppColors.textDisabled },
              ]}
              numberOfLines={1}>
              {selectedLabel || `Select ${label}`}
            </Text>
            <Text style={[styles.inputBoxText, { color: AppColors.textDisabled }]}>v</Text>
          </TouchableOpacity>
          {open && (
            <View style={styles.dropdownList}>
              {items.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={[styles.inputBoxText, { color: AppColors.textDisabled }]}>
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
                    <Text style={[styles.inputBoxText, { color: AppColors.textHeading }]}>
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

// ─── Text Input Field ──────────────────────────────────────────────────────────

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  error?: string;
  testID?: string;
}

function TextField({ label, value, onChangeText, placeholder, keyboardType, error, testID }: TextFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.inputBox, styles.inputBoxText, error ? styles.inputBoxValidationError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppColors.textDisabled}
        keyboardType={keyboardType ?? 'default'}
      />
      {error ? <Text style={styles.validationErrorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Date / Time Picker Field ────────────────────────────────────────────────
//
// A bordered value+icon box (per design ApiDp). On web it renders the browser's
// native date/time picker via a raw HTML <input>, which yields "YYYY-MM-DD" /
// "HH:mm" strings directly — fed straight into the form state with no conversion.
// On native there is no bundled picker dependency, so it falls back to a
// pressable box that reveals an inline text entry, showing a human-friendly
// formatted value ("Apr 21, 2026" / "06:00 AM") when a value is set.

interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  testID?: string;
}

function DateTimeField({ label, mode, value, onChange, error, testID }: DateTimeFieldProps) {
  const [editing, setEditing] = useState(false);
  const icon = mode === 'date' ? '📅' : '🕐';
  const placeholder = mode === 'date' ? 'YYYY-MM-DD' : 'HH:mm';
  const formatted =
    value && mode === 'date' ? formatShortDate(value) : value ? formatTime12h(value) : '';
  const displayValue = formatted || value;

  const renderControl = () => {
    // Web: real browser date/time picker.
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.inputBox, error ? styles.inputBoxValidationError : null]}>
          {React.createElement('input', {
            'data-testid': testID,
            type: mode,
            value,
            onChange: (e: { target: { value: string } }) => onChange(e.target.value),
            style: webDateTimeInputStyle,
          })}
          <Text style={styles.trailingIcon}>{icon}</Text>
        </View>
      );
    }

    // Native fallback: pressable box that reveals an inline text entry.
    if (editing) {
      return (
        <View style={[styles.inputBox, error ? styles.inputBoxValidationError : null]}>
          <TextInput
            testID={testID}
            style={styles.pickerValueText}
            value={value}
            onChangeText={onChange}
            onBlur={() => setEditing(false)}
            placeholder={placeholder}
            placeholderTextColor={AppColors.textDisabled}
            keyboardType={mode === 'time' ? 'numbers-and-punctuation' : 'default'}
            autoFocus
          />
          <Text style={styles.trailingIcon}>{icon}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        testID={testID}
        style={[styles.inputBox, error ? styles.inputBoxValidationError : null]}
        onPress={() => setEditing(true)}
        activeOpacity={0.7}>
        <Text
          style={[styles.pickerValueText, !displayValue && styles.pickerPlaceholderText]}
          numberOfLines={1}>
          {displayValue || `Select ${label}`}
        </Text>
        <Text style={styles.trailingIcon}>{icon}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {renderControl()}
      {error ? <Text style={styles.validationErrorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

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
  classTypeId?: string;
  coachUserId?: string;
  spaceId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  capacity?: string;
  duration?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.classTypeId) errors.classTypeId = 'Class type is required';
  if (!form.coachUserId) errors.coachUserId = 'Coach is required';
  if (!form.spaceId) errors.spaceId = 'Space is required';
  if (!form.scheduledDate.trim()) {
    errors.scheduledDate = 'Date is required (YYYY-MM-DD)';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.scheduledDate.trim())) {
    errors.scheduledDate = 'Use format YYYY-MM-DD';
  }
  if (!form.scheduledTime.trim()) {
    errors.scheduledTime = 'Time is required (HH:mm)';
  } else if (!/^\d{2}:\d{2}$/.test(form.scheduledTime.trim())) {
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

export default function CreateClassScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const safeTop = useSafeAreaTop();

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchDropdownData = useCallback(async () => {
    if (!token || !currentGymId) return;
    const client = createApiClient({ token });

    // Fetch class types
    setClassTypesFetch({ status: 'loading' });
    client
      .get<GetClassTypesResponse>(`/api/gyms/${currentGymId}/configuration/class-types`)
      .then((data) => {
        const items: PickerItem[] = data.classTypes.map((ct) => ({ id: ct.id, label: ct.name }));
        setClassTypesFetch({ status: 'success', data: items });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load class types';
        setClassTypesFetch({ status: 'error', message });
      });

    // Fetch coaches
    setCoachesFetch({ status: 'loading' });
    client
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

    // Fetch spaces
    setSpacesFetch({ status: 'loading' });
    client
      .get<GetSpacesResponse>(`/api/gyms/${currentGymId}/configuration/spaces`)
      .then((data) => {
        const items: PickerItem[] = data.spaces.map((s) => ({ id: s.id, label: s.name }));
        setSpacesFetch({ status: 'success', data: items });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load spaces';
        setSpacesFetch({ status: 'error', message });
      });
  }, [token, currentGymId]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleSubmit = async () => {
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!token || !currentGymId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const client = createApiClient({ token });
      const payload: CreateClassPayload = {
        classTypeId: form.classTypeId,
        coachUserId: form.coachUserId,
        spaceId: form.spaceId,
        scheduledDate: form.scheduledDate.trim(),
        scheduledTime: form.scheduledTime.trim(),
        ...(form.capacity.trim() ? { capacity: Number(form.capacity) } : {}),
        ...(form.duration.trim() ? { duration: Number(form.duration) } : {}),
      };
      await client.post<CreateClassResponse>(
        `/api/gyms/${currentGymId}/classes`,
        payload as unknown as Record<string, unknown>
      );
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create class. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const classTypeItems =
    classTypesFetch.status === 'success' ? classTypesFetch.data : [];
  const coachItems =
    coachesFetch.status === 'success' ? coachesFetch.data : [];
  const spaceItems =
    spacesFetch.status === 'success' ? spacesFetch.data : [];

  const handleSidebarNav = (key: string) => {
    if (key === 'schedule') router.push('/schedule-dashboard' as never);
    if (key === 'members') router.push('/members' as never);
    if (key === 'coaches') router.push('/coaches' as never);
    if (key === 'settings') router.push('/gym-settings' as never);
  };

  const formContent = (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile, isMobile && { paddingTop: safeTop + Spacing.base }]} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Class</Text>
          <Text style={styles.headerSubtitle}>
            Schedule a new class session
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>

          {/* Row 1 — Date and Time */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <DateTimeField
                testID="create-class-date-input"
                label="Date"
                mode="date"
                value={form.scheduledDate}
                onChange={(v) => setForm((s) => ({ ...s, scheduledDate: v }))}
                error={formErrors.scheduledDate}
              />
            </View>
            <View style={styles.rowItem}>
              <DateTimeField
                testID="create-class-time-input"
                label="Time"
                mode="time"
                value={form.scheduledTime}
                onChange={(v) => setForm((s) => ({ ...s, scheduledTime: v }))}
                error={formErrors.scheduledTime}
              />
            </View>
          </View>

          {/* Row 2 — Class Type */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <PickerField
                testID="create-class-class-type-picker"
                label="Class Type"
                items={classTypeItems}
                selectedId={form.classTypeId}
                onSelect={(id) => setForm((s) => ({ ...s, classTypeId: id }))}
                fetchState={classTypesFetch}
              />
              {formErrors.classTypeId ? (
                <Text style={styles.validationErrorText}>{formErrors.classTypeId}</Text>
              ) : null}
            </View>
            <View style={styles.rowItem}>
              <PickerField
                testID="create-class-coach-picker"
                label="Coach"
                items={coachItems}
                selectedId={form.coachUserId}
                onSelect={(id) => setForm((s) => ({ ...s, coachUserId: id }))}
                fetchState={coachesFetch}
              />
              {formErrors.coachUserId ? (
                <Text style={styles.validationErrorText}>{formErrors.coachUserId}</Text>
              ) : null}
            </View>
          </View>

          {/* Row 3 — Space */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <PickerField
                testID="create-class-space-picker"
                label="Space"
                items={spaceItems}
                selectedId={form.spaceId}
                onSelect={(id) => setForm((s) => ({ ...s, spaceId: id }))}
                fetchState={spacesFetch}
              />
              {formErrors.spaceId ? (
                <Text style={styles.validationErrorText}>{formErrors.spaceId}</Text>
              ) : null}
            </View>
            <View style={styles.rowItem}>
              <TextField
                testID="create-class-capacity-input"
                label="Capacity"
                value={form.capacity}
                onChangeText={(v) => setForm((s) => ({ ...s, capacity: v }))}
                placeholder="e.g. 15"
                keyboardType="numeric"
                error={formErrors.capacity}
              />
            </View>
          </View>

          {/* Row 4 — Duration */}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={styles.rowItem}>
              <TextField
                testID="create-class-duration-input"
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

          {/* Buttons */}
          <View style={[styles.btnRow, isMobile && styles.btnRowMobile]}>
            <TouchableOpacity
              testID="create-class-cancel-btn"
              style={[styles.cancelBtn, isMobile && styles.btnMobile]}
              onPress={() => router.back()}
              disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="create-class-save-btn"
              style={[styles.saveBtn, isMobile && styles.btnMobile, isSubmitting && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
              ) : (
                <Text style={styles.saveBtnText}>Save Class</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (isMobile) {
    return formContent;
  }

  return (
    <View style={styles.root}>
      <OwnerSidebar activeItem="classes" onNavigate={handleSidebarNav} />
      {formContent}
    </View>
  );
}
