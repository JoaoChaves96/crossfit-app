import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';

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
        return (
          <View key={stepNumber} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
              <Text
                style={[
                  styles.stepCircleText,
                  (isActive || isCompleted) && styles.stepCircleTextActive,
                ]}>
                {stepNumber}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
              ]}>
              {label}
            </Text>
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
      <Text style={styles.stepTitle}>Create Your Gym — Step 1: Basics</Text>
      <Text style={styles.stepSubtitle}>
        Fill in the basic information about your gym to get started.
      </Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Gym Name</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="e.g. CrossFit Downtown"
          placeholderTextColor="#999"
          value={basics.name}
          onChangeText={(val) => onChange({ ...basics, name: val })}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={[styles.input, errors.location ? styles.inputError : null]}
          placeholder="e.g. 123 Main St, City"
          placeholderTextColor="#999"
          value={basics.location}
          onChangeText={(val) => onChange({ ...basics, location: val })}
        />
        {errors.location ? (
          <Text style={styles.errorText}>{errors.location}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your gym, services, and what makes it unique..."
          placeholderTextColor="#999"
          value={basics.description}
          onChangeText={(val) => onChange({ ...basics, description: val })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
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
      <Text style={styles.stepTitle}>Step 2: Training Spaces</Text>
      <Text style={styles.stepSubtitle}>
        Add the training spaces available at your gym. You can add more later.
      </Text>

      {spaces.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No spaces configured yet</Text>
          <Text style={styles.emptyStateSubText}>
            Add your first training space to start organizing classes.
          </Text>
        </View>
      ) : (
        spaces.map((space, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text style={styles.entryCardTitle}>Space {index + 1}</Text>
              <TouchableOpacity onPress={() => removeSpace(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  spaceErrors[index]?.name ? styles.inputError : null,
                ]}
                placeholder="e.g. Main Floor"
                placeholderTextColor="#999"
                value={space.name}
                onChangeText={(val) => updateSpace(index, 'name', val)}
              />
              {spaceErrors[index]?.name ? (
                <Text style={styles.errorText}>{spaceErrors[index].name}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Capacity</Text>
              <TextInput
                style={[
                  styles.input,
                  spaceErrors[index]?.capacity ? styles.inputError : null,
                ]}
                placeholder="e.g. 20"
                placeholderTextColor="#999"
                value={space.capacity}
                onChangeText={(val) => updateSpace(index, 'capacity', val)}
                keyboardType="numeric"
              />
              {spaceErrors[index]?.capacity ? (
                <Text style={styles.errorText}>{spaceErrors[index].capacity}</Text>
              ) : null}
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={addSpace}>
        <Text style={styles.addButtonText}>+ Add Space</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
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
      <Text style={styles.stepTitle}>Step 3: Class Types</Text>
      <Text style={styles.stepSubtitle}>
        Define the types of fitness classes your gym offers. You can add more later.
      </Text>

      {classTypes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No class types defined yet</Text>
          <Text style={styles.emptyStateSubText}>
            Add the types of classes you offer (e.g. WOD, Open Gym, Barbell Club).
          </Text>
        </View>
      ) : (
        classTypes.map((ct, index) => (
          <View key={index} style={styles.entryCard}>
            <View style={styles.entryCardHeader}>
              <Text style={styles.entryCardTitle}>Class Type {index + 1}</Text>
              <TouchableOpacity onPress={() => removeClassType(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  classTypeErrors[index] ? styles.inputError : null,
                ]}
                placeholder="e.g. WOD, Open Gym, Barbell Club"
                placeholderTextColor="#999"
                value={ct.name}
                onChangeText={(val) => updateClassType(index, 'name', val)}
              />
              {classTypeErrors[index] ? (
                <Text style={styles.errorText}>{classTypeErrors[index]}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this class type..."
                placeholderTextColor="#999"
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

      <TouchableOpacity style={styles.addButton} onPress={addClassType}>
        <Text style={styles.addButtonText}>+ Add Class Type</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
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
      <Text style={styles.stepTitle}>Step 4: Review & Submit</Text>
      <Text style={styles.stepSubtitle}>
        Review your gym configuration before submitting.
      </Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Gym Basics</Text>
        <Text style={styles.reviewLabel}>Name</Text>
        <Text style={styles.reviewValue}>{state.basics.name}</Text>
        <Text style={styles.reviewLabel}>Location</Text>
        <Text style={styles.reviewValue}>{state.basics.location}</Text>
        {state.basics.description ? (
          <>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValue}>{state.basics.description}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>
          Spaces ({state.spaces.length})
        </Text>
        {state.spaces.length === 0 ? (
          <Text style={styles.reviewEmptyNote}>No spaces added</Text>
        ) : (
          state.spaces.map((space, index) => (
            <View key={index} style={styles.reviewItem}>
              <Text style={styles.reviewItemName}>{space.name}</Text>
              <Text style={styles.reviewItemDetail}>Capacity: {space.capacity}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>
          Class Types ({state.classTypes.length})
        </Text>
        {state.classTypes.length === 0 ? (
          <Text style={styles.reviewEmptyNote}>No class types added</Text>
        ) : (
          state.classTypes.map((ct, index) => (
            <View key={index} style={styles.reviewItem}>
              <Text style={styles.reviewItemName}>{ct.name}</Text>
              {ct.description ? (
                <Text style={styles.reviewItemDetail}>{ct.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{submitError}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onBack}
          disabled={isSubmitting}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Gym</Text>
          )}
        </TouchableOpacity>
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
      <Text style={styles.successTitle}>Gym Created!</Text>
      <Text style={styles.successSubtitle}>
        {`"${gymName}" has been successfully set up.`}
      </Text>
      <Text style={styles.successBody}>
        {'Your spaces and class types have been configured. You\'re ready to start scheduling classes.'}
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onCreateFirstClass}>
        <Text style={styles.primaryButtonText}>Create your first class</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function GymSetupScreen() {
  const router = useRouter();
  const { userId } = useAuth();

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
    if (!userId) {
      setSubmitError('Not authenticated. Please log in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the gym
      const client = createApiClient({ userId });
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0a7ea4',
  },
  stepCircleCompleted: {
    backgroundColor: '#4caf50',
  },
  stepCircleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  stepCircleTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
    marginRight: 4,
  },
  stepLabelActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 2,
  },
  stepConnectorCompleted: {
    backgroundColor: '#4caf50',
  },

  // Step content
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fafafa',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  textArea: {
    minHeight: 88,
    paddingTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
  },

  // Entry cards (spaces, class types)
  entryCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  removeText: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: '500',
  },

  // Add button
  addButton: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  emptyStateSubText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Button row
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Review step
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
  },
  reviewItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  reviewItemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reviewEmptyNote: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#c62828',
    lineHeight: 18,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 16,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
