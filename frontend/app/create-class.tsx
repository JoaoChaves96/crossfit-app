import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { Text, Icon, Button, SelectField } from '@/components/cleanink';
import { Ink, Accent, Space, Status } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar } from '@/components/OwnerSidebar';
import { formatShortDate, formatTime12h } from '@/utils/datetime';
import { styles, webDateTimeInputStyle } from './create-class.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateClassPayload = components['schemas']['CreateClassDto'];
type CreateClassResponse = components['schemas']['CreateClassResponseDto'];
type CreateRecurringPayload = components['schemas']['CreateRecurringClassesDto'];
type CreateRecurringResponse = components['schemas']['CreateRecurringClassesResponseDto'];
type Coach = components['schemas']['CoachListItemDto'];
type GetCoachesResponse = components['schemas']['GetCoachesResponseDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];

type ScheduleMode = 'single' | 'recurring';

// Weekday chips map to the backend's day-of-week encoding (0=Sunday … 6=Saturday).
const WEEKDAYS: { label: string; value: number }[] = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// Human-readable summary of a recurring-create result. Used both for the
// success toast-style line and the zero-created informational banner.
function summarizeRecurring(result: CreateRecurringResponse): string {
  const noun = result.created === 1 ? 'class' : 'classes';
  if (result.created === 0) {
    return `No classes were created. ${result.skippedPast} skipped (in the past) · ${result.skippedDuplicate} skipped (already scheduled). Adjust the date range or weekdays and try again.`;
  }
  return `Created ${result.created} ${noun} · ${result.skippedPast} skipped (past) · ${result.skippedDuplicate} skipped (already scheduled).`;
}

interface PickerItem {
  id: string;
  label: string;
}

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

// ─── Text Input Field ──────────────────────────────────────────────────────────

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  error?: string;
  testID?: string;
  /** Keyboard-follow handlers from the screen's useKeyboardAwareScroll. */
  onFocus?: () => void;
  onBlur?: () => void;
}

function TextField({ label, value, onChangeText, placeholder, keyboardType, error, testID, onFocus, onBlur }: TextFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>
      <TextInput
        testID={testID}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.inputBox, styles.inputBoxText, error ? styles.inputBoxValidationError : null]}
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
  /** Keyboard-follow handlers from the screen's useKeyboardAwareScroll. */
  onFocus?: () => void;
  onBlur?: () => void;
}

function DateTimeField({ label, mode, value, onChange, error, testID, onFocus, onBlur }: DateTimeFieldProps) {
  const [editing, setEditing] = useState(false);
  const iconName = mode === 'date' ? 'calendar' : 'time';
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
          <Icon name={iconName} size={18} tone="faint" style={styles.trailingIcon} />
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
            onFocus={onFocus}
            // Composed: the box also has to close itself on blur.
            onBlur={() => {
              setEditing(false);
              onBlur?.();
            }}
            placeholder={placeholder}
            placeholderTextColor={Ink.faint}
            keyboardType={mode === 'time' ? 'numbers-and-punctuation' : 'default'}
            autoFocus
          />
          <Icon name={iconName} size={18} tone="faint" style={styles.trailingIcon} />
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
          size="body"
          tone={displayValue ? 'strong' : 'faint'}
          style={{ flex: 1 }}
          numberOfLines={1}>
          {displayValue || `Select ${label}`}
        </Text>
        <Icon name={iconName} size={18} tone="faint" style={styles.trailingIcon} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.fieldContainer}>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>
      {renderControl()}
      {error ? <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Weekday Selector ────────────────────────────────────────────────────────
//
// Seven toggle chips (Mon–Sun) styled from the same token set as the input
// fields. Selected chips fill with the heading color to echo the primary
// Save button; unselected chips read as bordered value boxes.

interface WeekdaySelectorProps {
  label: string;
  selected: number[];
  onToggle: (value: number) => void;
  error?: string;
  testID?: string;
}

function WeekdaySelector({ label, selected, onToggle, error, testID }: WeekdaySelectorProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>
      <View style={styles.weekdayRow} testID={testID}>
        {WEEKDAYS.map((day) => {
          const isSelected = selected.includes(day.value);
          return (
            <TouchableOpacity
              key={day.value}
              testID={`create-class-weekday-${day.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[styles.weekdayChip, isSelected && styles.weekdayChipSelected]}
              onPress={() => onToggle(day.value)}
              activeOpacity={0.7}>
              <Text
                size="meta"
                weight={isSelected ? 'semibold' : 'medium'}
                tone={isSelected ? Accent.on : 'muted'}>
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{error}</Text> : null}
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
  startDate: string;
  endDate: string;
  weekdays: number[];
  capacity: string;
  duration: string;
}

interface FormErrors {
  classTypeId?: string;
  coachUserId?: string;
  spaceId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  startDate?: string;
  endDate?: string;
  weekdays?: string;
  capacity?: string;
  duration?: string;
}

function validate(form: FormState, mode: ScheduleMode): FormErrors {
  const errors: FormErrors = {};
  if (!form.classTypeId) errors.classTypeId = 'Class type is required';
  if (!form.coachUserId) errors.coachUserId = 'Coach is required';
  if (!form.spaceId) errors.spaceId = 'Space is required';

  if (!form.scheduledTime.trim()) {
    errors.scheduledTime = 'Time is required (HH:mm)';
  } else if (!TIME_PATTERN.test(form.scheduledTime.trim())) {
    errors.scheduledTime = 'Use format HH:mm';
  }

  if (mode === 'single') {
    if (!form.scheduledDate.trim()) {
      errors.scheduledDate = 'Date is required (YYYY-MM-DD)';
    } else if (!DATE_PATTERN.test(form.scheduledDate.trim())) {
      errors.scheduledDate = 'Use format YYYY-MM-DD';
    }
  } else {
    const start = form.startDate.trim();
    const end = form.endDate.trim();
    if (!start) {
      errors.startDate = 'Start date is required (YYYY-MM-DD)';
    } else if (!DATE_PATTERN.test(start)) {
      errors.startDate = 'Use format YYYY-MM-DD';
    }
    if (!end) {
      errors.endDate = 'End date is required (YYYY-MM-DD)';
    } else if (!DATE_PATTERN.test(end)) {
      errors.endDate = 'Use format YYYY-MM-DD';
    }
    if (!errors.startDate && !errors.endDate && end < start) {
      errors.endDate = 'End date must be on or after the start date';
    }
    if (form.weekdays.length === 0) {
      errors.weekdays = 'Select at least one day';
    }
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

  // The form runs long and the lower fields sit under the keyboard on a phone,
  // so the focused field has to be scrolled clear of it (mobile only).
  const kb = useKeyboardAwareScroll();

  const [classTypesFetch, setClassTypesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });
  const [coachesFetch, setCoachesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });
  const [spacesFetch, setSpacesFetch] = useState<FetchState<PickerItem[]>>({
    status: 'loading',
  });

  const [mode, setMode] = useState<ScheduleMode>('single');

  const [form, setForm] = useState<FormState>({
    classTypeId: '',
    coachUserId: '',
    spaceId: '',
    scheduledDate: '',
    scheduledTime: '',
    startDate: '',
    endDate: '',
    weekdays: [],
    capacity: '',
    duration: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recurringNotice, setRecurringNotice] = useState<string | null>(null);

  const toggleWeekday = (value: number) => {
    setForm((s) => ({
      ...s,
      weekdays: s.weekdays.includes(value)
        ? s.weekdays.filter((d) => d !== value)
        : [...s.weekdays, value],
    }));
  };

  const switchMode = (next: ScheduleMode) => {
    if (next === mode) return;
    setMode(next);
    setFormErrors({});
    setSubmitError(null);
    setRecurringNotice(null);
  };

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
      // assignable=true so the owner is offered too — they coach their own
      // classes, and a new gym has no coach on staff yet.
      .get<GetCoachesResponse>(
        `/api/gyms/${currentGymId}/configuration/coaches?assignable=true`,
      )
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
    const errors = validate(form, mode);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!token || !currentGymId) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setRecurringNotice(null);

    try {
      const client = createApiClient({ token });

      if (mode === 'recurring') {
        const payload: CreateRecurringPayload = {
          classTypeId: form.classTypeId,
          coachUserId: form.coachUserId,
          spaceId: form.spaceId,
          weekdays: form.weekdays,
          scheduledTime: form.scheduledTime.trim(),
          startDate: form.startDate.trim(),
          endDate: form.endDate.trim(),
          ...(form.capacity.trim() ? { capacity: Number(form.capacity) } : {}),
          ...(form.duration.trim() ? { duration: Number(form.duration) } : {}),
        };
        const result = await client.post<CreateRecurringResponse>(
          `/api/gyms/${currentGymId}/classes/recurring`,
          payload as unknown as Record<string, unknown>
        );

        if (result.created === 0) {
          // Nothing was created — keep the owner on the screen to adjust the
          // range or weekdays. Surface why via the informational banner.
          setRecurringNotice(summarizeRecurring(result));
          return;
        }
        router.back();
        return;
      }

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

  // Keyboard handling (inset, focus-follow) comes from useKeyboardAwareScroll —
  // a KeyboardAvoidingView only shrinks this container, it never scrolls the
  // focused field into view.
  const formContent = (
    <View style={styles.screen}>
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile, isMobile && { paddingTop: safeTop + Space.base }, kb.contentInsetStyle]}
        {...kb.scrollViewProps}>

        {/* Header */}
        <View style={styles.header}>
          {isMobile && (
            <TouchableOpacity
              testID="create-class-back-btn"
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="back" size={24} tone={Ink.strong} />
            </TouchableOpacity>
          )}
          <Text size="screen" weight="bold">Create New Class</Text>
          <Text size="meta" tone="muted" style={styles.headerSubtitle}>
            Schedule a new class session
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, isMobile && styles.formCardMobile]}>

          {/* Schedule mode — segmented toggle */}
          <View style={styles.segmented}>
            <TouchableOpacity
              testID="create-class-mode-single"
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'single' }}
              style={[styles.segmentedItem, mode === 'single' && styles.segmentedItemActive]}
              onPress={() => switchMode('single')}
              activeOpacity={0.7}>
              <Text
                size="meta"
                weight={mode === 'single' ? 'semibold' : 'medium'}
                tone={mode === 'single' ? Ink.strong : Ink.faint}>
                Single
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="create-class-mode-recurring"
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'recurring' }}
              style={[styles.segmentedItem, mode === 'recurring' && styles.segmentedItemActive]}
              onPress={() => switchMode('recurring')}
              activeOpacity={0.7}>
              <Text
                size="meta"
                weight={mode === 'recurring' ? 'semibold' : 'medium'}
                tone={mode === 'recurring' ? Ink.strong : Ink.faint}>
                Recurring
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'single' ? (
            /* Row 1 — Date and Time */
            <View style={[styles.row, isMobile && styles.rowMobile]}>
              <View style={styles.rowItem}>
                <DateTimeField
                  testID="create-class-date-input"
                  label="Date"
                  mode="date"
                  value={form.scheduledDate}
                  onChange={(v) => setForm((s) => ({ ...s, scheduledDate: v }))}
                  error={formErrors.scheduledDate}
                  onFocus={kb.onInputFocus}
                  onBlur={kb.onInputBlur}
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
                  onFocus={kb.onInputFocus}
                  onBlur={kb.onInputBlur}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Row 1 — Start and End Date */}
              <View style={[styles.row, isMobile && styles.rowMobile]}>
                <View style={styles.rowItem}>
                  <DateTimeField
                    testID="create-class-start-date-input"
                    label="Start Date"
                    mode="date"
                    value={form.startDate}
                    onChange={(v) => setForm((s) => ({ ...s, startDate: v }))}
                    error={formErrors.startDate}
                    onFocus={kb.onInputFocus}
                    onBlur={kb.onInputBlur}
                  />
                </View>
                <View style={styles.rowItem}>
                  <DateTimeField
                    testID="create-class-end-date-input"
                    label="End Date"
                    mode="date"
                    value={form.endDate}
                    onChange={(v) => setForm((s) => ({ ...s, endDate: v }))}
                    error={formErrors.endDate}
                    onFocus={kb.onInputFocus}
                    onBlur={kb.onInputBlur}
                  />
                </View>
              </View>

              {/* Row — Repeat on (weekdays) and Time */}
              <View style={[styles.row, isMobile && styles.rowMobile]}>
                <View style={styles.rowItem}>
                  <WeekdaySelector
                    testID="create-class-weekdays"
                    label="Repeat on"
                    selected={form.weekdays}
                    onToggle={toggleWeekday}
                    error={formErrors.weekdays}
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
                    onFocus={kb.onInputFocus}
                    onBlur={kb.onInputBlur}
                  />
                </View>
              </View>
            </>
          )}

          {/* Row 2 — Class Type */}
          <View style={[styles.row, isMobile && styles.rowMobile, styles.rowPickerTop]}>
            <View style={styles.rowItem}>
              <SelectField
                testID="create-class-class-type-picker"
                label="Class Type"
                items={classTypeItems}
                selectedId={form.classTypeId}
                onSelect={(id) => setForm((s) => ({ ...s, classTypeId: id }))}
                fetchState={classTypesFetch}
              />
              {formErrors.classTypeId ? (
                <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{formErrors.classTypeId}</Text>
              ) : null}
            </View>
            <View style={styles.rowItem}>
              <SelectField
                testID="create-class-coach-picker"
                label="Coach"
                items={coachItems}
                selectedId={form.coachUserId}
                onSelect={(id) => setForm((s) => ({ ...s, coachUserId: id }))}
                fetchState={coachesFetch}
              />
              {formErrors.coachUserId ? (
                <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{formErrors.coachUserId}</Text>
              ) : null}
            </View>
          </View>

          {/* Row 3 — Space */}
          <View style={[styles.row, isMobile && styles.rowMobile, styles.rowPickerBottom]}>
            <View style={styles.rowItem}>
              <SelectField
                testID="create-class-space-picker"
                label="Space"
                items={spaceItems}
                selectedId={form.spaceId}
                onSelect={(id) => setForm((s) => ({ ...s, spaceId: id }))}
                fetchState={spacesFetch}
              />
              {formErrors.spaceId ? (
                <Text size="meta" tone={Status.danger} style={styles.validationErrorText}>{formErrors.spaceId}</Text>
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
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
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
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
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

          {/* Recurring result — informational (no classes created) */}
          {recurringNotice ? (
            <View style={styles.noticeBanner} testID="create-class-recurring-notice">
              <Text size="meta" tone="muted" style={styles.noticeText}>{recurringNotice}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={[styles.btnRow, isMobile && styles.btnRowMobile]}>
            <View style={[styles.btnWrap, isMobile && styles.btnWrapMobile]}>
              <Button
                testID="create-class-cancel-btn"
                label="Cancel"
                variant="quiet"
                onPress={() => router.back()}
                disabled={isSubmitting}
              />
            </View>
            <View style={[styles.btnWrap, isMobile && styles.btnWrapMobile]}>
              <Button
                testID="create-class-save-btn"
                label={mode === 'recurring' ? 'Create Series' : 'Save Class'}
                variant="primary"
                onPress={handleSubmit}
                loading={isSubmitting}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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
