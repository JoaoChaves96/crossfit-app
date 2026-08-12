import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';
import { styles } from './gym-settings.styles';

type MembershipPlan = components['schemas']['MembershipPlanItemDto'];
type GetMembershipPlansResponse = components['schemas']['GetMembershipPlansResponseDto'];
type ClassTypeItem = components['schemas']['ClassTypeItemDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type CreateMembershipPlanDto = components['schemas']['CreateMembershipPlanDto'];
type CreateMembershipPlanResponse = components['schemas']['CreateMembershipPlanResponseDto'];
type UpdateMembershipPlanDto = components['schemas']['UpdateMembershipPlanDto'];
type UpdateMembershipPlanResponse = components['schemas']['UpdateMembershipPlanResponseDto'];
type ArchiveMembershipPlanResponse = components['schemas']['ArchiveMembershipPlanResponseDto'];

type FormMode = 'add' | 'edit' | null;

const BILLING_CYCLES: { value: 'monthly' | 'annual'; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parsePrice(value: string): number {
  return Math.round(parseFloat(value) * 100);
}

function cycleLabel(cycle: 'monthly' | 'annual'): string {
  return cycle === 'annual' ? 'Annual' : 'Monthly';
}

function classTypeNames(ids: string[], classTypes: ClassTypeItem[]): string[] {
  return ids.map(
    (id) => classTypes.find((classType) => classType.id === id)?.name ?? 'Unknown',
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyPlansProps {
  onAddPress: () => void;
}

function EmptyPlans({ onAddPress }: EmptyPlansProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="members" size={28} tone="faint" />
      </View>
      <Text size="title" weight="semibold" tone="strong">No membership plans yet</Text>
      <Text size="meta" tone="muted" style={styles.emptyDesc}>
        Add your first plan so athletes can be put on one.
      </Text>
      <View style={styles.emptyBtnWrap}>
        <Button testID="add-plan-btn" label="Add Plan" variant="primary" onPress={onAddPress} />
      </View>
    </View>
  );
}

// ─── Plans Table ──────────────────────────────────────────────────────────────

interface PlansTableProps {
  plans: MembershipPlan[];
  classTypes: ClassTypeItem[];
  onEdit: (plan: MembershipPlan) => void;
  onArchive: (plan: MembershipPlan) => void;
  onAddPress: () => void;
}

function PlansTable({ plans, classTypes, onEdit, onArchive, onAddPress }: PlansTableProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Plans</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-plan-btn" label="Add Plan" variant="primary" onPress={onAddPress} />
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
          </View>
          <View style={styles.colPrice}>
            <Text size="label" weight="semibold" tone="faint" upper>Price</Text>
          </View>
          <View style={styles.colCycle}>
            <Text size="label" weight="semibold" tone="faint" upper>Cycle</Text>
          </View>
          <View style={styles.colClassTypes}>
            <Text size="label" weight="semibold" tone="faint" upper>Class Types</Text>
          </View>
          <View style={styles.colSubscribers}>
            <Text size="label" weight="semibold" tone="faint" upper>Members</Text>
          </View>
          <View style={styles.colActions}>
            <Text size="label" weight="semibold" tone="faint" upper>Actions</Text>
          </View>
        </View>

        {plans.map((plan) => (
          <View key={plan.id} style={styles.tableRow}>
            <View style={styles.colName}>
              <Text size="body" tone="strong">{plan.name}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text size="body" tone="strong">{formatPrice(plan.pricing)}</Text>
            </View>
            <View style={styles.colCycle}>
              <Text size="body" tone="strong">{cycleLabel(plan.billingCycle)}</Text>
            </View>
            <View style={styles.colClassTypes}>
              {classTypeNames(plan.classTypes, classTypes).map((name, idx) => (
                <View key={`${plan.id}-${idx}`} style={styles.planClassTypeTag}>
                  <Text size="meta" tone="muted">{name}</Text>
                </View>
              ))}
            </View>
            <View style={styles.colSubscribers}>
              <Text size="body" tone="strong">{plan.subscriberCount} members</Text>
            </View>
            <View style={styles.colActionsRow}>
              {plan.status === 'archived' ? (
                <StatusChip tone="neutral" label="Archived" />
              ) : (
                <>
                  <View style={styles.entityCardActionBtn}>
                    <Button
                      testID={`plan-edit-btn-${plan.id}`}
                      label="Edit"
                      variant="quiet"
                      onPress={() => onEdit(plan)}
                    />
                  </View>
                  <View style={styles.entityCardActionBtn}>
                    <Button
                      testID={`plan-archive-btn-${plan.id}`}
                      label="Archive"
                      variant="danger"
                      onPress={() => onArchive(plan)}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Plan Card (Mobile) ─────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: MembershipPlan;
  classTypes: ClassTypeItem[];
  onEdit: (plan: MembershipPlan) => void;
  onArchive: (plan: MembershipPlan) => void;
}

function PlanCard({ plan, classTypes, onEdit, onArchive }: PlanCardProps) {
  return (
    <View style={styles.entityCard}>
      <View style={styles.entityCardTop}>
        <View style={styles.entityCardTitleWrap}>
          <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>{plan.name}</Text>
        </View>
        <View style={styles.entityCardActions}>
          {plan.status === 'archived' ? (
            <StatusChip tone="neutral" label="Archived" />
          ) : (
            <>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`plan-edit-btn-${plan.id}`}
                  label="Edit"
                  variant="quiet"
                  onPress={() => onEdit(plan)}
                />
              </View>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`plan-archive-btn-${plan.id}`}
                  label="Archive"
                  variant="danger"
                  onPress={() => onArchive(plan)}
                />
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.planCardMetaRow}>
        <Text size="meta" tone="muted">{formatPrice(plan.pricing)} · {cycleLabel(plan.billingCycle)}</Text>
        <Text size="meta" tone="muted">{plan.subscriberCount} members</Text>
      </View>
      <View style={styles.colClassTypes}>
        {classTypeNames(plan.classTypes, classTypes).map((name, idx) => (
          <View key={`${plan.id}-${idx}`} style={styles.planClassTypeTag}>
            <Text size="meta" tone="muted">{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Plans Card List (Mobile) ───────────────────────────────────────────────────

interface PlansCardListProps {
  plans: MembershipPlan[];
  classTypes: ClassTypeItem[];
  onEdit: (plan: MembershipPlan) => void;
  onArchive: (plan: MembershipPlan) => void;
  onAddPress: () => void;
}

function PlansCardList({ plans, classTypes, onEdit, onArchive, onAddPress }: PlansCardListProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Plans</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-plan-btn" label="Add Plan" variant="primary" onPress={onAddPress} />
        </View>
      </View>
      <View style={styles.planCardList}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} classTypes={classTypes} onEdit={onEdit} onArchive={onArchive} />
        ))}
      </View>
    </View>
  );
}

// ─── Plan Form ────────────────────────────────────────────────────────────────

interface PlanFormProps {
  mode: 'add' | 'edit';
  initialPlan: MembershipPlan | null;
  classTypes: ClassTypeItem[];
  isSaving: boolean;
  onSave: (values: {
    name: string;
    pricing: number;
    billingCycle: 'monthly' | 'annual';
    classTypes: string[];
  }) => void;
  onCancel: () => void;
}

function PlanForm({ mode, initialPlan, classTypes, isSaving, onSave, onCancel }: PlanFormProps) {
  const [name, setName] = useState(initialPlan?.name ?? '');
  const [price, setPrice] = useState(initialPlan ? (initialPlan.pricing / 100).toString() : '');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    initialPlan?.billingCycle ?? 'monthly',
  );
  const [selectedClassTypeIds, setSelectedClassTypeIds] = useState<string[]>(
    initialPlan?.classTypes ?? [],
  );

  function toggleClassType(id: string) {
    if (isSaving) return;
    setSelectedClassTypeIds((current) =>
      current.includes(id) ? current.filter((existingId) => existingId !== id) : [...current, id],
    );
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Plan name is required.');
      return;
    }
    const parsedPrice = parsePrice(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation', 'Price must be a number.');
      return;
    }
    if (selectedClassTypeIds.length === 0) {
      Alert.alert('Validation', 'Select at least one class type.');
      return;
    }
    onSave({
      name: trimmedName,
      pricing: parsedPrice,
      billingCycle,
      classTypes: selectedClassTypeIds,
    });
  }

  return (
    <View style={styles.content}>
      <Text size="title" weight="semibold" tone="strong">{mode === 'add' ? 'Add Plan' : 'Edit Plan'}</Text>
      <View style={styles.formCard}>
        <Text size="body" weight="semibold" tone="strong">Plan Details</Text>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Plan Name</Text>
          <TextInput
            testID="plan-name-input"
            style={styles.input}
            placeholder="e.g. Unlimited"
            placeholderTextColor={Ink.faint}
            value={name}
            onChangeText={setName}
            editable={!isSaving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Price</Text>
          <TextInput
            testID="plan-price-input"
            style={styles.input}
            placeholder="e.g. 75.50"
            placeholderTextColor={Ink.faint}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!isSaving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Billing Cycle</Text>
          <View style={styles.metricRow}>
            {BILLING_CYCLES.map(({ value, label }) => {
              const isSelected = billingCycle === value;
              return (
                <TouchableOpacity
                  key={value}
                  testID={`plan-cycle-pill-${value}`}
                  style={[styles.metricPill, isSelected && styles.metricPillSelected]}
                  onPress={() => !isSaving && setBillingCycle(value)}
                  activeOpacity={0.7}>
                  <Text
                    size="meta"
                    weight={isSelected ? 'semibold' : 'medium'}
                    tone={isSelected ? Ink.inverse : Ink.muted}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Class Types</Text>
          <View style={styles.metricRow}>
            {classTypes.map((classType) => {
              const isSelected = selectedClassTypeIds.includes(classType.id);
              return (
                <TouchableOpacity
                  key={classType.id}
                  testID={`plan-class-type-pill-${classType.id}`}
                  style={[styles.metricPill, isSelected && styles.metricPillSelected]}
                  onPress={() => toggleClassType(classType.id)}
                  activeOpacity={0.7}>
                  <Text
                    size="meta"
                    weight={isSelected ? 'semibold' : 'medium'}
                    tone={isSelected ? Ink.inverse : Ink.muted}>
                    {classType.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formBtnRow}>
          <View style={styles.formBtnWrap}>
            <Button
              testID="plan-form-save-btn"
              label="Save"
              variant="primary"
              onPress={handleSave}
              loading={isSaving}
            />
          </View>
          <View style={styles.formBtnWrap}>
            <Button
              testID="plan-form-cancel-btn"
              label="Cancel"
              variant="quiet"
              onPress={onCancel}
              disabled={isSaving}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

interface PlansTabProps {
  gymId: string;
  token: string;
  isMobile: boolean;
}

export function PlansTab({ gymId, token, isMobile }: PlansTabProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [classTypes, setClassTypes] = useState<ClassTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createApiClient({ token });
      const [plansData, classTypesData] = await Promise.all([
        client.get<GetMembershipPlansResponse>(
          `/api/gyms/${gymId}/configuration/membership-plans`
        ),
        client.get<GetClassTypesResponse>(
          `/api/gyms/${gymId}/configuration/class-types`
        ),
      ]);
      setPlans(plansData.plans ?? []);
      setClassTypes(classTypesData.classTypes ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load membership plans';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, gymId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPress = useCallback(() => {
    setEditingPlan(null);
    setFormMode('add');
  }, []);

  const handleEditPress = useCallback((plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormMode('edit');
  }, []);

  const handleArchivePress = useCallback((plan: MembershipPlan) => {
    Alert.alert(
      'Archive Plan',
      plan.subscriberCount > 0
        ? `You have ${plan.subscriberCount} members on this plan. They keep it until it expires, but nobody new can be assigned to it.`
        : `Archive "${plan.name}"? Nobody new can be assigned to it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = createApiClient({ token });
              await client.post<ArchiveMembershipPlanResponse>(
                `/api/gyms/${gymId}/configuration/membership-plans/${plan.id}/archive`,
                {},
              );
              await fetchData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to archive plan';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, [token, gymId, fetchData]);

  const handleSave = useCallback(
    async (values: { name: string; pricing: number; billingCycle: 'monthly' | 'annual'; classTypes: string[] }) => {
      setIsSaving(true);
      try {
        const client = createApiClient({ token });
        if (formMode === 'add') {
          const body: CreateMembershipPlanDto = values;
          await client.post<CreateMembershipPlanResponse>(
            `/api/gyms/${gymId}/configuration/membership-plans`,
            body as unknown as Record<string, unknown>
          );
        } else if (formMode === 'edit' && editingPlan) {
          const body: UpdateMembershipPlanDto = values;
          await client.patch<UpdateMembershipPlanResponse>(
            `/api/gyms/${gymId}/configuration/membership-plans/${editingPlan.id}`,
            body as unknown as Record<string, unknown>
          );
        }
        setFormMode(null);
        setEditingPlan(null);
        await fetchData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save plan';
        Alert.alert('Error', msg);
      } finally {
        setIsSaving(false);
      }
    },
    [token, gymId, formMode, editingPlan, fetchData]
  );

  const handleCancel = useCallback(() => {
    setFormMode(null);
    setEditingPlan(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color={Ink.strong} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.feedbackContainer}>
        <Text size="body" tone={Status.danger} style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text size="body" tone="strong">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (formMode === 'add' || formMode === 'edit') {
    return (
      <PlanForm
        mode={formMode}
        initialPlan={editingPlan}
        classTypes={classTypes}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (plans.length === 0) {
    return <EmptyPlans onAddPress={handleAddPress} />;
  }

  if (isMobile) {
    return (
      <PlansCardList
        plans={plans}
        classTypes={classTypes}
        onEdit={handleEditPress}
        onArchive={handleArchivePress}
        onAddPress={handleAddPress}
      />
    );
  }

  return (
    <PlansTable
      plans={plans}
      classTypes={classTypes}
      onEdit={handleEditPress}
      onArchive={handleArchivePress}
      onAddPress={handleAddPress}
    />
  );
}
