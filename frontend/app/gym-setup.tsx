import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from './gym-setup.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';
import { Text, Button } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpaceEntry {
  name: string;
  capacity: string;
}

interface ClassTypeEntry {
  name: string;
  description: string;
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

// ─── Step 1: Gym Basics ───────────────────────────────────────────────────────

interface Step1Props {
  basics: GymBasics;
  onChange: (basics: GymBasics) => void;
  onNext: () => void;
  onCancel: () => void;
}

function Step1Basics({ basics, onChange, onNext, onCancel }: Step1Props) {
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

interface Step2Props {
  spaces: SpaceEntry[];
  onChange: (spaces: SpaceEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2Spaces({ spaces, onChange, onNext, onBack }: Step2Props) {
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
        <Button label="+ Add Space" variant="quiet" onPress={addSpace} />
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

interface Step3Props {
  classTypes: ClassTypeEntry[];
  onChange: (classTypes: ClassTypeEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step3ClassTypes({ classTypes, onChange, onNext, onBack }: Step3Props) {
  const [classTypeErrors, setClassTypeErrors] = useState<Record<number, string>>({});

  const addClassType = () => {
    onChange([...classTypes, { name: '', description: '' }]);
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

            <View style={styles.field}>
              <Text size="label" weight="semibold" tone="faint" upper>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this class type..."
                placeholderTextColor={Ink.faint}
                value={ct.description}
                onChangeText={(val) => updateClassType(index, 'description', val)}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>
        ))
      )}

      <View style={styles.addBtnWrap}>
        <Button label="+ Add Class Type" variant="quiet" onPress={addClassType} />
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
              {ct.description ? (
                <Text size="meta" tone="muted">{ct.description}</Text>
              ) : null}
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
        <Button label="Create your first class" variant="primary" onPress={onCreateFirstClass} />
      </View>
    </View>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function GymSetupScreen() {
  const router = useRouter();
  const { token } = useAuth();

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
    router.back();
  };

  const handleSubmit = async () => {
    if (!token) {
      setSubmitError('Not authenticated. Please log in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the gym
      const client = createApiClient({ token });
      const gymResponse = await client.post<{ gymId: string }>('/api/gyms', {
        name: wizardState.basics.name.trim(),
        location: wizardState.basics.location.trim(),
        description: wizardState.basics.description.trim(),
      });

      const gymId = gymResponse.gymId;

      // Step 2: Create spaces sequentially
      for (const space of wizardState.spaces) {
        await client.post('/gym-configuration/spaces', {
          gymId,
          name: space.name.trim(),
          capacity: Number(space.capacity),
        });
      }

      // Step 3: Create class types sequentially
      for (const classType of wizardState.classTypes) {
        await client.post('/gym-configuration/class-types', {
          gymId,
          name: classType.name.trim(),
          description: classType.description.trim(),
        });
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
          onCreateFirstClass={() => router.replace('/(tabs)/schedule')}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && (
          <Step1Basics
            basics={wizardState.basics}
            onChange={(basics) => setWizardState((s) => ({ ...s, basics }))}
            onNext={() => setCurrentStep(2)}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 2 && (
          <Step2Spaces
            spaces={wizardState.spaces}
            onChange={(spaces) => setWizardState((s) => ({ ...s, spaces }))}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3ClassTypes
            classTypes={wizardState.classTypes}
            onChange={(classTypes) => setWizardState((s) => ({ ...s, classTypes }))}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
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
    </KeyboardAvoidingView>
  );
}
