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
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { createApiClient } from '@/utils/api-client';
import { Text, Button } from '@/components/cleanink';
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

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = ['Basics', 'Spaces', 'Class Types', 'Review'];
  return (
    <View style={styles.stepIndicator}>
      {steps.map((label, index) => {
        const stepNumber = (index + 1) as Step;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const filled = isActive || isCompleted;
        return (
          <View key={stepNumber} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
              <Text size="meta" weight="semibold" tone={filled ? Ink.inverse : 'faint'}>
                {stepNumber}
              </Text>
            </View>
            <View style={styles.stepLabelWrap}>
              <Text size="meta" weight={isActive ? 'semibold' : 'regular'} tone={isActive ? 'strong' : 'faint'}>
                {label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
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

// ─── Step 1: Gym Basics ───────────────────────────────────────────────────────

interface Step1Props extends KeyboardHandlers {
  basics: GymBasics;
  onChange: (basics: GymBasics) => void;
  onNext: () => void;
  onCancel: () => void;
}

function Step1Basics({ basics, onChange, onNext, onCancel, onInputFocus, onInputBlur }: Step1Props) {
  const [errors, setErrors] = useState<Partial<GymBasics>>({});

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
      <Text size="screen" weight="bold" tone="strong" style={styles.stepTitle}>Create Your Gym — Step 1: Basics</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Fill in the basic information about your gym to get started.
      </Text>

      <View style={styles.field}>
        <Text size="label" weight="semibold" tone="faint" upper>Gym Name</Text>
        <TextInput
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          style={[styles.input, errors.name ? styles.inputError : null]}
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
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          style={[styles.input, errors.location ? styles.inputError : null]}
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
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          style={[styles.input, styles.textArea]}
          placeholder="Describe your gym, services, and what makes it unique..."
          placeholderTextColor={Ink.faint}
          value={basics.description}
          onChangeText={(val) => onChange({ ...basics, description: val })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <Button label="Cancel" variant="quiet" onPress={onCancel} />
        </View>
        <View style={styles.buttonWrap}>
          <Button label="Next" variant="primary" onPress={handleNext} />
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: Spaces ───────────────────────────────────────────────────────────

interface Step2Props extends KeyboardHandlers {
  spaces: SpaceEntry[];
  onChange: (spaces: SpaceEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2Spaces({ spaces, onChange, onNext, onBack, onInputFocus, onInputBlur }: Step2Props) {
  const [spaceErrors, setSpaceErrors] = useState<Record<number, Partial<SpaceEntry>>>({});

  const addSpace = () => {
    onChange([...spaces, { name: '', capacity: '' }]);
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
      <Text size="screen" weight="bold" tone="strong" style={styles.stepTitle}>Step 2: Training Spaces</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Add the training spaces available at your gym. You can add more later.
      </Text>

      {spaces.length === 0 ? (
        <View style={styles.emptyState}>
          <Text size="body" weight="semibold" tone="muted">No spaces configured yet</Text>
          <Text size="meta" tone="faint" style={styles.emptyStateSubText}>
            Add your first training space to start organizing classes.
          </Text>
        </View>
      ) : (
        spaces.map((space, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text size="body" weight="semibold" tone="strong">Space {index + 1}</Text>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeSpace(index)}>
                <Text size="meta" weight="medium" tone={Status.danger}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
              <TextInput
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                style={[
                  styles.input,
                  spaceErrors[index]?.name ? styles.inputError : null,
                ]}
                placeholder="e.g. Main Floor"
                placeholderTextColor={Ink.faint}
                value={space.name}
                onChangeText={(val) => updateSpace(index, 'name', val)}
              />
              {spaceErrors[index]?.name ? (
                <Text size="meta" tone={Status.danger} style={styles.errorText}>{spaceErrors[index].name}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text size="label" weight="semibold" tone="faint" upper>Capacity</Text>
              <TextInput
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                style={[
                  styles.input,
                  spaceErrors[index]?.capacity ? styles.inputError : null,
                ]}
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
        ))
      )}

      <View style={styles.addBtnWrap}>
        <Button label="Add Space" icon="add" variant="quiet" onPress={addSpace} />
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <Button label="Back" variant="quiet" onPress={onBack} />
        </View>
        <View style={styles.buttonWrap}>
          <Button label="Next" variant="primary" onPress={handleNext} />
        </View>
      </View>
    </View>
  );
}

// ─── Step 3: Class Types ──────────────────────────────────────────────────────

interface Step3Props extends KeyboardHandlers {
  classTypes: ClassTypeEntry[];
  onChange: (classTypes: ClassTypeEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step3ClassTypes({ classTypes, onChange, onNext, onBack, onInputFocus, onInputBlur }: Step3Props) {
  const [classTypeErrors, setClassTypeErrors] = useState<Record<number, string>>({});

  const addClassType = () => {
    onChange([...classTypes, { name: '' }]);
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
      <Text size="screen" weight="bold" tone="strong" style={styles.stepTitle}>Step 3: Class Types</Text>
      <Text size="body" tone="muted" style={styles.stepSubtitle}>
        Define the types of fitness classes your gym offers. You can add more later.
      </Text>

      {classTypes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text size="body" weight="semibold" tone="muted">No class types defined yet</Text>
          <Text size="meta" tone="faint" style={styles.emptyStateSubText}>
            Add the types of classes you offer (e.g. WOD, Open Gym, Barbell Club).
          </Text>
        </View>
      ) : (
        classTypes.map((ct, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text size="body" weight="semibold" tone="strong">Class Type {index + 1}</Text>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeClassType(index)}>
                <Text size="meta" weight="medium" tone={Status.danger}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
              <TextInput
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                style={[
                  styles.input,
                  classTypeErrors[index] ? styles.inputError : null,
                ]}
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

      <View style={styles.addBtnWrap}>
        <Button label="Add Class Type" icon="add" variant="quiet" onPress={addClassType} />
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <Button label="Back" variant="quiet" onPress={onBack} />
        </View>
        <View style={styles.buttonWrap}>
          <Button label="Next" variant="primary" onPress={handleNext} />
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

interface Step4Props {
  state: WizardState;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

function Step4Review({ state, onBack, onSubmit, isSubmitting, submitError }: Step4Props) {
  return (
    <View style={styles.stepContent}>
      <Text size="screen" weight="bold" tone="strong" style={styles.stepTitle}>Step 4: Review & Submit</Text>
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
        {state.spaces.length === 0 ? (
          <Text size="meta" tone="faint">No spaces added</Text>
        ) : (
          state.spaces.map((space, index) => (
            <View key={index} style={styles.reviewItem}>
              <Text size="body" weight="semibold" tone="strong">{space.name}</Text>
              <Text size="meta" tone="muted">Capacity: {space.capacity}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.reviewSection}>
        <Text size="title" weight="semibold" tone="strong" style={styles.reviewSectionTitle}>
          Class Types ({state.classTypes.length})
        </Text>
        {state.classTypes.length === 0 ? (
          <Text size="meta" tone="faint">No class types added</Text>
        ) : (
          state.classTypes.map((ct, index) => (
            <View key={index} style={styles.reviewItem}>
              <Text size="body" weight="semibold" tone="strong">{ct.name}</Text>
            </View>
          ))
        )}
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <Text size="meta" tone={Status.danger}>{submitError}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <Button label="Back" variant="quiet" onPress={onBack} disabled={isSubmitting} />
        </View>
        <View style={styles.buttonWrap}>
          <Button label="Create Gym" variant="primary" onPress={onSubmit} loading={isSubmitting} />
        </View>
      </View>
    </View>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

interface SuccessScreenProps {
  gymName: string;
  onCreateFirstClass: () => void;
}

function SuccessScreen({ gymName, onCreateFirstClass }: SuccessScreenProps) {
  return (
    <View style={styles.successContainer}>
      <Text size="display" weight="bold" tone="strong">Gym Created!</Text>
      <Text size="title" weight="semibold" tone="strong">
        {`"${gymName}" has been successfully set up.`}
      </Text>
      <Text size="body" tone="muted" style={styles.successBody}>
        {'Your spaces and class types have been configured. You\'re ready to start scheduling classes.'}
      </Text>
      <View style={styles.successBtnWrap}>
        <Button label="Create Your First Class" variant="primary" onPress={onCreateFirstClass} />
      </View>
    </View>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function GymSetupScreen() {
  const router = useRouter();
  const { token, login } = useAuth();

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
      const message =
        err instanceof Error ? err.message : 'Failed to create gym. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <SuccessScreen
          gymName={createdGymName}
          // The owner's home, matching login's routeForRole. `/(tabs)/schedule`
          // is the athlete surface and would strand them outside their new gym.
          onCreateFirstClass={() => router.replace('/schedule-dashboard' as never)}
        />
      </ScrollView>
    );
  }

  // Keyboard handling (inset, focus-follow) comes from useKeyboardAwareScroll —
  // a KeyboardAvoidingView only shrinks this container, it never scrolls the
  // focused field into view.
  return (
    <View style={styles.container}>
      <ScrollView
        ref={kb.scrollRef}
        contentContainerStyle={[styles.scrollContent, kb.contentInsetStyle]}
        {...kb.scrollViewProps}>
        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && (
          <Step1Basics
            basics={wizardState.basics}
            onChange={(basics) => setWizardState((s) => ({ ...s, basics }))}
            onNext={() => setCurrentStep(2)}
            onCancel={handleCancel}
            onInputFocus={kb.onInputFocus}
            onInputBlur={kb.onInputBlur}
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
          />
        )}

        {currentStep === 4 && (
          <Step4Review
            state={wizardState}
            onBack={() => setCurrentStep(3)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
      </ScrollView>
    </View>
  );
}
