/*
 * ─── Clean Ink · Gym setup wizard (responsive adapt) ─────────────────────────
 * The four-step wizard a new owner lands in from /no-gym. This pass adapts the
 * one fixed layout it shipped with to the app's two registers via
 * `useResponsiveLayout`: a centred measure-capped column with a right-aligned
 * action pair on desktop, and an edge-to-edge column with full-width stacked
 * actions on a phone, where the step rail drops its labels so four steps still
 * fit 320pt. Behaviour, copy, validation, and every testID are preserved.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { styles } from './gym-setup.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { ApiError, createApiClient } from '@/utils/api-client';
import { Text, Button, Icon } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';
import { components } from '@/types/api.gen';

// ─── Types ───────────────────────────────────────────────────────────────────

type CreateGymResponse = components['schemas']['CreateGymResponseDto'];
type CreateSpaceBody = components['schemas']['CreateSpaceDto'];
type ConfigureClassTypesBody = components['schemas']['ConfigureClassTypesDto'];

interface SpaceEntry {
  name: string;
  capacity: string;
}

interface ClassTypeEntry {
  name: string;
}

interface GymBasics {
  name: string;
  location: string;
  description: string;
}

interface WizardState {
  basics: GymBasics;
  spaces: SpaceEntry[];
  classTypes: ClassTypeEntry[];
}

type Step = 1 | 2 | 3 | 4;

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = ['Basics', 'Spaces', 'Class Types', 'Review'];

/**
 * Progress rail. Four labelled steps need ~420pt, so on a phone the labels drop
 * and the numbered circles carry the sequence — the step's own heading already
 * names it, and the label row is what used to force the rail off a 320pt screen.
 */
function StepIndicator({ currentStep, isMobile }: { currentStep: Step; isMobile: boolean }) {
  return (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, index) => {
        const stepNumber = (index + 1) as Step;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const filled = isActive || isCompleted;
        return (
          <View
            key={stepNumber}
            style={styles.stepItem}
            // `accessible` is what makes this label the node's name on web —
            // without it a screen reader reads the bare numeral, which on
            // mobile (labels dropped) is all there is.
            accessible
            accessibilityLabel={`Step ${stepNumber} of ${STEP_LABELS.length}: ${label}${
              isCompleted ? ', completed' : isActive ? ', current' : ''
            }`}>
            <View
              style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
              {/* A done step reads by mark, not by hue: the accent is reserved
                  for the primary action, and the green status hue belongs to
                  status-chip text on its wash. */}
              {isCompleted ? (
                <Icon name="check" size={14} tone={Ink.inverse} />
              ) : (
                // `faint` on the sunken circle is only ~3:1, and with the
                // labels dropped on mobile these numerals carry the sequence.
                <Text size="meta" weight="semibold" tone={filled ? Ink.inverse : 'muted'}>
                  {stepNumber}
                </Text>
              )}
            </View>
            {!isMobile && (
              <View style={styles.stepLabelWrap}>
                <Text size="meta" weight={isActive ? 'semibold' : 'regular'} tone={isActive ? 'strong' : 'faint'}>
                  {label}
                </Text>
              </View>
            )}
            {index < STEP_LABELS.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  isMobile && styles.stepConnectorMobile,
                  isCompleted && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Keyboard-follow handlers from the wizard's `useKeyboardAwareScroll`. The
 * ScrollView belongs to the wizard shell, so a step can only report focus —
 * it cannot scroll itself.
 */
interface KeyboardHandlers {
  onInputFocus: () => void;
  onInputBlur: () => void;
}

/** The layout register, resolved once by the wizard shell and passed down. */
interface LayoutProps {
  isMobile: boolean;
}

// ─── Step 1: Gym Basics ───────────────────────────────────────────────────────

interface Step1Props extends KeyboardHandlers, LayoutProps {
  basics: GymBasics;
  onChange: (basics: GymBasics) => void;
  onNext: () => void;
  onCancel: () => void;
}

function Step1Basics({ basics, onChange, onNext, onCancel, onInputFocus, onInputBlur, isMobile }: Step1Props) {
  const [errors, setErrors] = useState<Partial<GymBasics>>({});
  const [focusedField, setFocusedField] = useState<keyof GymBasics | null>(null);

  // Focus does two jobs: it scrolls the field clear of the keyboard, and it
  // shows the caret's field. Wrapped so a TextInput only wires one handler.
  const focus = (field: keyof GymBasics) => () => {
    setFocusedField(field);
    onInputFocus();
  };
  const blur = () => {
    setFocusedField(null);
    onInputBlur();
  };

  const validate = (): boolean => {
    const newErrors: Partial<GymBasics> = {};
    if (!basics.name.trim()) newErrors.name = 'Gym name is required';
    if (!basics.location.trim()) newErrors.location = 'Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <View style={styles.stepContent}>
      {/* "Create Your Gym" belongs to the screen header, so the step heading
          only names the step — matching steps 2–4 instead of repeating the
          wizard's own title a second and third time. */}
      <Text size="lead" weight="bold" tone="strong" style={styles.stepTitle}>Step 1: Basics</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Fill in the basic information about your gym to get started.
      </Text>

      <View style={styles.field}>
        <Text size="label" weight="semibold" tone="faint" upper>Gym Name</Text>
        <TextInput
          onFocus={focus('name')}
          onBlur={blur}
          testID="gym-name-input"
          style={[
            styles.input,
            focusedField === 'name' && styles.inputFocused,
            errors.name ? styles.inputError : null,
          ]}
          placeholder="e.g. CrossFit Downtown"
          placeholderTextColor={Ink.faint}
          value={basics.name}
          onChangeText={(val) => onChange({ ...basics, name: val })}
        />
        {errors.name ? <Text size="meta" tone={Status.danger} style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text size="label" weight="semibold" tone="faint" upper>Location</Text>
        <TextInput
          onFocus={focus('location')}
          onBlur={blur}
          testID="gym-location-input"
          style={[
            styles.input,
            focusedField === 'location' && styles.inputFocused,
            errors.location ? styles.inputError : null,
          ]}
          placeholder="e.g. 123 Main St, City"
          placeholderTextColor={Ink.faint}
          value={basics.location}
          onChangeText={(val) => onChange({ ...basics, location: val })}
        />
        {errors.location ? (
          <Text size="meta" tone={Status.danger} style={styles.errorText}>{errors.location}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text size="label" weight="semibold" tone="faint" upper>Description</Text>
        <TextInput
          onFocus={focus('description')}
          onBlur={blur}
          style={[
            styles.input,
            styles.textArea,
            focusedField === 'description' && styles.inputFocused,
          ]}
          placeholder="Describe your gym, services, and what makes it unique..."
          placeholderTextColor={Ink.faint}
          value={basics.description}
          onChangeText={(val) => onChange({ ...basics, description: val })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Cancel" variant="quiet" onPress={onCancel} testID="basics-cancel-btn" />
        </View>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Next" variant="primary" onPress={handleNext} testID="basics-next-btn" />
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: Spaces ───────────────────────────────────────────────────────────

interface Step2Props extends KeyboardHandlers, LayoutProps {
  spaces: SpaceEntry[];
  onChange: (spaces: SpaceEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2Spaces({ spaces, onChange, onNext, onBack, onInputFocus, onInputBlur, isMobile }: Step2Props) {
  const [spaceErrors, setSpaceErrors] = useState<Record<number, Partial<SpaceEntry>>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  // Keyed by row and field, since every space repeats the same two fields.
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const focus = (key: string) => () => {
    setFocusedField(key);
    onInputFocus();
  };
  const blur = () => {
    setFocusedField(null);
    onInputBlur();
  };

  const addSpace = () => {
    onChange([...spaces, { name: '', capacity: '' }]);
    setStepError(null);
  };

  const updateSpace = (index: number, field: keyof SpaceEntry, value: string) => {
    const updated = spaces.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(updated);
    if (spaceErrors[index]) {
      const newErrors = { ...spaceErrors };
      delete newErrors[index];
      setSpaceErrors(newErrors);
    }
  };

  const removeSpace = (index: number) => {
    onChange(spaces.filter((_, i) => i !== index));
    const newErrors = { ...spaceErrors };
    delete newErrors[index];
    setSpaceErrors(newErrors);
  };

  const validate = (): boolean => {
    // At least one space is required, not merely encouraged: create-class makes
    // spaceId mandatory, so a gym with no space cannot schedule anything and the
    // Success screen's "Create Your First Class" would lead to a form that can
    // never be submitted. Checked separately because iterating an empty array
    // passes vacuously.
    if (spaces.length === 0) {
      setSpaceErrors({});
      setStepError('Add at least one training space to continue.');
      return false;
    }
    setStepError(null);

    const newErrors: Record<number, Partial<SpaceEntry>> = {};
    spaces.forEach((space, index) => {
      const fieldErrors: Partial<SpaceEntry> = {};
      if (!space.name.trim()) fieldErrors.name = 'Name is required';
      if (!space.capacity.trim()) {
        fieldErrors.capacity = 'Capacity is required';
      } else if (isNaN(Number(space.capacity)) || Number(space.capacity) <= 0) {
        fieldErrors.capacity = 'Must be a positive number';
      }
      if (Object.keys(fieldErrors).length > 0) newErrors[index] = fieldErrors;
    });
    setSpaceErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <View style={styles.stepContent}>
      <Text size="lead" weight="bold" tone="strong" style={styles.stepTitle}>Step 2: Training Spaces</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Add the training spaces available at your gym. At least one is required —
        you can add more later.
      </Text>

      {spaces.length === 0 ? (
        <View style={styles.emptyState} testID="spaces-empty-state">
          <View style={styles.emptyIconCircle}>
            <Icon name="place" size={26} tone={Ink.faint} />
          </View>
          <Text size="body" weight="semibold" tone="muted">No spaces configured yet</Text>
          <Text size="meta" tone="faint" style={styles.emptyStateSubText}>
            Every class is scheduled into a space, so add at least one to continue.
          </Text>
        </View>
      ) : (
        spaces.map((space, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text size="body" weight="semibold" tone="strong">Space {index + 1}</Text>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeSpace(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove Space ${index + 1}`}>
                <Text size="meta" weight="medium" tone={Status.danger}>Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Name and capacity are one thought about one space, so they pair
                on a row where there is width and stack on a phone. */}
            <View style={[styles.entryRow, isMobile && styles.entryRowMobile]}>
              <View style={[styles.field, styles.entryRowItem]}>
                <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
                <TextInput
                  onFocus={focus(`name-${index}`)}
                  onBlur={blur}
                  style={[
                    styles.input,
                    focusedField === `name-${index}` && styles.inputFocused,
                    spaceErrors[index]?.name ? styles.inputError : null,
                  ]}
                  testID={`space-name-input-${index}`}
                  placeholder="e.g. Main Floor"
                  placeholderTextColor={Ink.faint}
                  value={space.name}
                  onChangeText={(val) => updateSpace(index, 'name', val)}
                />
                {spaceErrors[index]?.name ? (
                  <Text size="meta" tone={Status.danger} style={styles.errorText}>{spaceErrors[index].name}</Text>
                ) : null}
              </View>

              <View style={[styles.field, styles.entryRowItem]}>
                <Text size="label" weight="semibold" tone="faint" upper>Capacity</Text>
                <TextInput
                  onFocus={focus(`capacity-${index}`)}
                  onBlur={blur}
                  style={[
                    styles.input,
                    focusedField === `capacity-${index}` && styles.inputFocused,
                    spaceErrors[index]?.capacity ? styles.inputError : null,
                  ]}
                  testID={`space-capacity-input-${index}`}
                  placeholder="e.g. 20"
                  placeholderTextColor={Ink.faint}
                  value={space.capacity}
                  onChangeText={(val) => updateSpace(index, 'capacity', val)}
                  keyboardType="numeric"
                />
                {spaceErrors[index]?.capacity ? (
                  <Text size="meta" tone={Status.danger} style={styles.errorText}>{spaceErrors[index].capacity}</Text>
                ) : null}
              </View>
            </View>
          </View>
        ))
      )}

      <View style={[styles.addBtnWrap, isMobile && styles.addBtnWrapMobile]}>
        <Button label="Add Space" icon="add" variant="quiet" onPress={addSpace} testID="add-space-btn" />
      </View>

      {stepError ? (
        <View style={styles.errorBanner}>
          <Text size="meta" tone={Status.danger} testID="spaces-step-error">{stepError}</Text>
        </View>
      ) : null}

      <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Back" variant="quiet" onPress={onBack} testID="spaces-back-btn" />
        </View>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Next" variant="primary" onPress={handleNext} testID="spaces-next-btn" />
        </View>
      </View>
    </View>
  );
}

// ─── Step 3: Class Types ──────────────────────────────────────────────────────

interface Step3Props extends KeyboardHandlers, LayoutProps {
  classTypes: ClassTypeEntry[];
  onChange: (classTypes: ClassTypeEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step3ClassTypes({ classTypes, onChange, onNext, onBack, onInputFocus, onInputBlur, isMobile }: Step3Props) {
  const [classTypeErrors, setClassTypeErrors] = useState<Record<number, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const focus = (index: number) => () => {
    setFocusedIndex(index);
    onInputFocus();
  };
  const blur = () => {
    setFocusedIndex(null);
    onInputBlur();
  };

  const addClassType = () => {
    onChange([...classTypes, { name: '' }]);
    setStepError(null);
  };

  const updateClassType = (
    index: number,
    field: keyof ClassTypeEntry,
    value: string
  ) => {
    const updated = classTypes.map((ct, i) => (i === index ? { ...ct, [field]: value } : ct));
    onChange(updated);
    if (classTypeErrors[index]) {
      const newErrors = { ...classTypeErrors };
      delete newErrors[index];
      setClassTypeErrors(newErrors);
    }
  };

  const removeClassType = (index: number) => {
    onChange(classTypes.filter((_, i) => i !== index));
    const newErrors = { ...classTypeErrors };
    delete newErrors[index];
    setClassTypeErrors(newErrors);
  };

  const validate = (): boolean => {
    // Required for the same reason as spaces: create-class makes classTypeId
    // mandatory, and an empty array would otherwise pass this loop vacuously.
    if (classTypes.length === 0) {
      setClassTypeErrors({});
      setStepError('Add at least one class type to continue.');
      return false;
    }
    setStepError(null);

    const newErrors: Record<number, string> = {};
    classTypes.forEach((ct, index) => {
      if (!ct.name.trim()) newErrors[index] = 'Name is required';
    });
    setClassTypeErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <View style={styles.stepContent}>
      <Text size="lead" weight="bold" tone="strong" style={styles.stepTitle}>Step 3: Class Types</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Define the types of fitness classes your gym offers. At least one is
        required — you can add more later.
      </Text>

      {classTypes.length === 0 ? (
        <View style={styles.emptyState} testID="class-types-empty-state">
          <View style={styles.emptyIconCircle}>
            <Icon name="classes" size={26} tone={Ink.faint} />
          </View>
          <Text size="body" weight="semibold" tone="muted">No class types defined yet</Text>
          <Text size="meta" tone="faint" style={styles.emptyStateSubText}>
            Every class has a type, so add at least one to continue (e.g. WOD,
            Open Gym, Barbell Club).
          </Text>
        </View>
      ) : (
        classTypes.map((ct, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text size="body" weight="semibold" tone="strong">Class Type {index + 1}</Text>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeClassType(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove Class Type ${index + 1}`}>
                <Text size="meta" weight="medium" tone={Status.danger}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
              <TextInput
                onFocus={focus(index)}
                onBlur={blur}
                style={[
                  styles.input,
                  focusedIndex === index && styles.inputFocused,
                  classTypeErrors[index] ? styles.inputError : null,
                ]}
                testID={`class-type-name-input-${index}`}
                placeholder="e.g. WOD, Open Gym, Barbell Club"
                placeholderTextColor={Ink.faint}
                value={ct.name}
                onChangeText={(val) => updateClassType(index, 'name', val)}
              />
              {classTypeErrors[index] ? (
                <Text size="meta" tone={Status.danger} style={styles.errorText}>{classTypeErrors[index]}</Text>
              ) : null}
            </View>
            {/* No description field: ClassTypeEntity has no such column, so
                anything typed here would be silently discarded on submit. */}
          </View>
        ))
      )}

      <View style={[styles.addBtnWrap, isMobile && styles.addBtnWrapMobile]}>
        <Button label="Add Class Type" icon="add" variant="quiet" onPress={addClassType} testID="add-class-type-btn" />
      </View>

      {stepError ? (
        <View style={styles.errorBanner}>
          <Text size="meta" tone={Status.danger} testID="class-types-step-error">{stepError}</Text>
        </View>
      ) : null}

      <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Back" variant="quiet" onPress={onBack} testID="class-types-back-btn" />
        </View>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Next" variant="primary" onPress={handleNext} testID="class-types-next-btn" />
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

interface Step4Props extends LayoutProps {
  state: WizardState;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

function Step4Review({ state, onBack, onSubmit, isSubmitting, submitError, isMobile }: Step4Props) {
  return (
    <View style={styles.stepContent}>
      <Text size="lead" weight="bold" tone="strong" style={styles.stepTitle}>Step 4: Review & Submit</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Review your gym configuration before submitting.
      </Text>

      <View style={styles.reviewSection}>
        <Text size="title" weight="semibold" tone="strong" style={styles.reviewSectionTitle}>Gym Basics</Text>
        <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
        <Text size="body" tone="strong">{state.basics.name}</Text>
        <Text size="label" weight="semibold" tone="faint" upper>Location</Text>
        <Text size="body" tone="strong">{state.basics.location}</Text>
        {state.basics.description ? (
          <>
            <Text size="label" weight="semibold" tone="faint" upper>Description</Text>
            <Text size="body" tone="strong">{state.basics.description}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.reviewSection}>
        <Text size="title" weight="semibold" tone="strong" style={styles.reviewSectionTitle}>
          Spaces ({state.spaces.length})
        </Text>
        {/* No empty branch: step 2 blocks Next until there is at least one
            space, so this section can never be reached empty. */}
        {state.spaces.map((space, index) => (
          <View key={index} style={styles.reviewItem}>
            <Text size="body" weight="semibold" tone="strong">{space.name}</Text>
            <Text size="meta" tone="muted">Capacity: {space.capacity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.reviewSection}>
        <Text size="title" weight="semibold" tone="strong" style={styles.reviewSectionTitle}>
          Class Types ({state.classTypes.length})
        </Text>
        {/* Likewise gated by step 3. */}
        {state.classTypes.map((ct, index) => (
          <View key={index} style={styles.reviewItem}>
            <Text size="body" weight="semibold" tone="strong">{ct.name}</Text>
          </View>
        ))}
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <Text size="meta" tone={Status.danger} testID="submit-error">{submitError}</Text>
        </View>
      ) : null}

      <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Back" variant="quiet" onPress={onBack} disabled={isSubmitting} testID="review-back-btn" />
        </View>
        <View style={[styles.buttonWrap, isMobile && styles.buttonWrapMobile]}>
          <Button label="Create Gym" variant="primary" onPress={onSubmit} loading={isSubmitting} testID="create-gym-btn" />
        </View>
      </View>
    </View>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

interface SuccessScreenProps extends LayoutProps {
  gymName: string;
  onContinue: () => void;
  onCreateClass: () => void;
}

function SuccessScreen({ gymName, onContinue, onCreateClass, isMobile }: SuccessScreenProps) {
  return (
    <View style={styles.successContainer}>
      {/* Same icon-circle-on-sunken-ground treatment as the no-gym zero state
          this owner arrived from, so the two ends of onboarding agree. */}
      <View style={styles.successIconCircle}>
        <Icon name="check" size={32} tone={Ink.strong} />
      </View>
      <Text size="display" weight="bold" tone="strong" style={styles.successTitle}>Gym Created!</Text>
      <Text size="title" weight="semibold" tone="strong" style={styles.successTitle}>
        {`"${gymName}" has been successfully set up.`}
      </Text>
      {/* This CTA is submittable again: owners may be assigned as the coach of
          their own classes (DECISIONS.md, "Owners as Coaches"), so a gym with
          no coach on staff can still schedule. Inviting a coach is offered as
          the secondary path rather than a prerequisite. */}
      <Text size="body" tone="muted" style={styles.successBody}>
        Your spaces and class types are configured. You can schedule your first
        class now and coach it yourself, or invite a coach to take it.
      </Text>
      <View style={[styles.successBtnWrap, isMobile && styles.successBtnWrapMobile]}>
        <Button label="Create Your First Class" variant="primary" onPress={onCreateClass} testID="setup-create-class-btn" />
        <Button label="Go to My Gym" variant="quiet" onPress={onContinue} testID="setup-continue-btn" />
      </View>
    </View>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function GymSetupScreen() {
  const router = useRouter();
  const { token, login } = useAuth();
  const { setCurrentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();

  // Steps 1–3 run long enough that the lower fields sit under the keyboard on a
  // phone, so the focused field has to be scrolled clear of it (mobile only).
  const kb = useKeyboardAwareScroll();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdGymName, setCreatedGymName] = useState('');

  const [wizardState, setWizardState] = useState<WizardState>({
    basics: { name: '', location: '', description: '' },
    spaces: [],
    classTypes: [],
  });

  const handleCancel = () => {
    // Not router.back(): the wizard is reachable by deep link, where there is
    // no history to pop and Cancel would do nothing at all.
    router.replace('/no-gym' as never);
  };

  const handleSubmit = async () => {
    if (!token) {
      setSubmitError('Not authenticated. Please log in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the gym. The caller becomes its owner.
      const gymResponse = await createApiClient({ token }).post<CreateGymResponse>(
        '/api/gyms',
        {
          name: wizardState.basics.name.trim(),
          location: wizardState.basics.location.trim(),
          description: wizardState.basics.description.trim(),
        },
      );

      const gymId = gymResponse.id;

      // The token we just used predates the gym and still claims `gymId: null`,
      // so the configuration calls below would be rejected by the backend's
      // ownership guard. Adopt the re-signed one the create returned, and use
      // it directly here rather than waiting for the context state to settle.
      const ownerToken = gymResponse.accessToken;
      await login(ownerToken);

      // GymContext is loaded from storage and is otherwise only populated by
      // login, so without this the owner leaves the wizard with
      // currentGymId: null — and every gym-scoped owner screen quietly does
      // nothing (create-class's pickers hang on "Loading…", the dashboard shows
      // an empty week) until they log out and back in.
      await setCurrentGymId(gymId);

      const client = createApiClient({ token: ownerToken });

      // Step 2: Create spaces sequentially
      for (const space of wizardState.spaces) {
        await client.post(`/api/gyms/${gymId}/configuration/spaces`, {
          name: space.name.trim(),
          baseCapacity: Number(space.capacity),
        } satisfies CreateSpaceBody);
      }

      // Step 3: Create class types sequentially. The endpoint multiplexes
      // create/update/delete, hence the explicit operation.
      for (const classType of wizardState.classTypes) {
        await client.post(`/api/gyms/${gymId}/configuration/class-types`, {
          operation: 'create',
          name: classType.name.trim(),
        } satisfies ConfigureClassTypesBody);
      }

      setCreatedGymName(wizardState.basics.name.trim());
      setIsSuccess(true);
    } catch (err) {
      // A 409 means this account already owns a gym (see docs/DECISIONS.md →
      // One Gym Per Owner). Retrying cannot succeed, so say what happened
      // instead of surfacing the raw response body.
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError(
          'This account already owns a gym. Log out and back in to open it.',
        );
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Failed to create gym. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * The wizard's own title bar. The navigator registers this route with
   * `headerShown: true` and no back target, so its arrow falls back to the
   * parent group — which sends a deep-linked owner into `/my-bookings`, the
   * athlete surface. Drawing the header here lets Back land on `/no-gym`, the
   * same place in-screen Cancel goes.
   */
  const header = (
    <SafeScreen style={styles.header} applyTopInset={isMobile}>
      {/* Padding then measure cap, in that order — the same two steps the
          ScrollView's content applies below, so the title lands on exactly the
          step heading's left edge at every width instead of floating at the
          window edge. */}
      <View style={[styles.headerPad, isMobile && styles.headerPadMobile]}>
        <View style={[styles.contentWrap, styles.headerRow]}>
          <TouchableOpacity
            testID="gym-setup-back-btn"
            style={styles.headerBackBtn}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Back to gym options"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="back" size={24} tone={Ink.strong} />
          </TouchableOpacity>
          {/* The screen's own identity, so it outranks the step heading —
              matching every other owner surface header. */}
          <Text size="screen" weight="bold" tone="strong">Create Your Gym</Text>
        </View>
      </View>
    </SafeScreen>
  );

  if (isSuccess) {
    // Terminal state: the gym exists, so it carries no header — there is no
    // wizard left to go back to, and Back would offer to re-enter setup for a
    // gym that already exists. It still needs the notch inset the header was
    // providing, since the route is registered `headerShown: false`.
    return (
      <SafeScreen style={styles.container} applyTopInset={isMobile}>
        <ScrollView contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
          <View style={styles.contentWrap}>
            <SuccessScreen
              gymName={createdGymName}
              isMobile={isMobile}
              // The owner's home, matching login's routeForRole. `/(tabs)/schedule`
              // is the athlete surface and would strand them outside their new gym.
              onContinue={() => router.replace('/schedule-dashboard' as never)}
              onCreateClass={() => router.replace('/create-class' as never)}
            />
          </View>
        </ScrollView>
      </SafeScreen>
    );
  }

  // Keyboard handling (inset, focus-follow) comes from useKeyboardAwareScroll —
  // a KeyboardAvoidingView only shrinks this container, it never scrolls the
  // focused field into view.
  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
          kb.contentInsetStyle,
        ]}
        {...kb.scrollViewProps}>
        <View style={styles.contentWrap}>
          <StepIndicator currentStep={currentStep} isMobile={isMobile} />

          {currentStep === 1 && (
            <Step1Basics
              basics={wizardState.basics}
              onChange={(basics) => setWizardState((s) => ({ ...s, basics }))}
              onNext={() => setCurrentStep(2)}
              onCancel={handleCancel}
              onInputFocus={kb.onInputFocus}
              onInputBlur={kb.onInputBlur}
              isMobile={isMobile}
            />
          )}

          {currentStep === 2 && (
            <Step2Spaces
              spaces={wizardState.spaces}
              onChange={(spaces) => setWizardState((s) => ({ ...s, spaces }))}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              onInputFocus={kb.onInputFocus}
              onInputBlur={kb.onInputBlur}
              isMobile={isMobile}
            />
          )}

          {currentStep === 3 && (
            <Step3ClassTypes
              classTypes={wizardState.classTypes}
              onChange={(classTypes) => setWizardState((s) => ({ ...s, classTypes }))}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
              onInputFocus={kb.onInputFocus}
              onInputBlur={kb.onInputBlur}
              isMobile={isMobile}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              state={wizardState}
              onBack={() => setCurrentStep(3)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitError={submitError}
              isMobile={isMobile}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
