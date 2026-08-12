import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ink, Space, Status } from '@/constants/design';
import {
  Button,
  Icon,
  SelectField,
  StatusChip,
  Text,
  type SelectFetchState,
  type SelectItem,
} from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { membershipChipProps } from '@/app/members';
import type { components } from '@/types/api.gen';
import { styles } from './MemberDetailsPanel.styles';

type GymMember = components['schemas']['GymMemberItemDto'];
type MembershipPlanItem = components['schemas']['MembershipPlanItemDto'];
type GetMembershipPlansResponse = components['schemas']['GetMembershipPlansResponseDto'];

export interface MemberDetailsPanelProps {
  member: GymMember;
  onClose: () => void;
  onChanged: () => void;
}

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const SHEET_TRAVEL = 700;

/** ISO timestamp → the YYYY-MM-DD the expiry input edits. String-sliced, not
 * read through local-time Date getters, so the value shown always matches
 * the day that was actually stored — see the UTC note on `formatExpiry` in
 * app/members.tsx. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Try again.';
}

/**
 * The one-cycle renewal default. Extends from max(expiresAt, today) so renewing
 * a plan that lapsed weeks ago gives a full cycle from today rather than a date
 * already in the past — the spec's rule, computed client-side so the server
 * keeps a single "must be in the future" check.
 *
 * Deliberately uses the UTC Date accessors (getUTCMonth/setUTCMonth,
 * getUTCFullYear/setUTCFullYear), not their local-time counterparts. A
 * midnight-UTC expiresAt read with local getters on a host west of UTC
 * resolves to the previous local calendar day — the exact bug this project
 * has hit twice already (see the comment on formatExpiry in app/members.tsx).
 * Advancing in UTC keeps the produced date's calendar day independent of the
 * machine running the code.
 *
 * The target day is CLAMPED to the last day of the target month (Jan 31 + 1
 * cycle → Feb 28, or Feb 29 in a leap year). Bare setUTCMonth overflows on a
 * short month — Jan 31 lands on Mar 3, skipping February — which would offer
 * the owner a date a whole month off. This mirrors `addCycle` in
 * `backend/src/domain/athlete-membership-plan/billing-cycle.ts`, which is the
 * authority; the frontend cannot import from backend/, so the two must be kept
 * in step by hand.
 */
export function nextCycleDate(expiresAt: string | null, billingCycle: 'monthly' | 'annual'): string {
  const today = new Date();
  const from = expiresAt && new Date(expiresAt) > today ? new Date(expiresAt) : today;

  let targetYear = from.getUTCFullYear();
  let targetMonth = from.getUTCMonth();

  if (billingCycle === 'annual') {
    targetYear += 1;
  } else {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(from.getUTCDate(), lastDayOfTargetMonth);

  // Time of day is carried over rather than zeroed, matching backend addCycle.
  // Zeroing it would make a local-getter rewrite of this function produce the
  // same string on a positive-offset host, so the UTC-vs-local test below would
  // stop discriminating.
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function MemberDetailsPanel({ member, onClose, onChanged }: MemberDetailsPanelProps) {
  const { isMobile } = useResponsiveLayout();
  const { token } = useAuth();
  const { currentGymId } = useGym();

  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [plansState, setPlansState] = useState<SelectFetchState>({ status: 'loading' });

  const [expiryInput, setExpiryInput] = useState(toDateInput(member.expiresAt));
  const [planId, setPlanId] = useState(member.planId ?? '');
  const [autoRoll, setAutoRoll] = useState(member.autoRoll);

  const [isSaving, setIsSaving] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);

  // Re-seed the draft whenever a different member is selected.
  useEffect(() => {
    setExpiryInput(toDateInput(member.expiresAt));
    setPlanId(member.planId ?? '');
    setAutoRoll(member.autoRoll);
    setError(null);
    setSavedAt(false);
  }, [member.id, member.expiresAt, member.planId, member.autoRoll]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      if (!token || !currentGymId) return;
      setPlansState({ status: 'loading' });
      try {
        const client = createApiClient({ token });
        const res = await client.get<GetMembershipPlansResponse>(
          `/api/gyms/${currentGymId}/configuration/membership-plans`,
        );
        if (cancelled) return;
        setPlans(res.plans);
        setPlansState({ status: 'success', data: res.plans });
      } catch (err) {
        if (cancelled) return;
        setPlansState({ status: 'error', message: errorMessage(err) });
      }
    }
    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [token, currentGymId]);

  // The member's currently-held plan, needed for its billingCycle when the
  // owner presses "+1 cycle".
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === member.planId) ?? null,
    [plans, member.planId],
  );

  // Only active plans can be newly assigned; an archived plan a member
  // already holds stays visible in the list so the current selection still
  // resolves to a label.
  const planItems: SelectItem[] = useMemo(
    () =>
      plans
        .filter((plan) => plan.status === 'active' || plan.id === member.planId)
        .map((plan) => ({ id: plan.id, label: plan.name })),
    [plans, member.planId],
  );

  const handleSave = useCallback(async () => {
    if (!token || !currentGymId) return;

    const expiryChanged = Boolean(member.planId) && expiryInput !== toDateInput(member.expiresAt);
    const planChanged = planId !== '' && planId !== (member.planId ?? '');
    const autoRollChanged = autoRoll !== member.autoRoll;

    if (expiryChanged && !DATE_SHAPE.test(expiryInput)) {
      setError('Use the format YYYY-MM-DD.');
      return;
    }

    setError(null);
    setSavedAt(false);

    if (!expiryChanged && !planChanged && !autoRollChanged) {
      setSavedAt(true);
      return;
    }

    setIsSaving(true);
    const client = createApiClient({ token });
    const base = `/api/gyms/${currentGymId}/members/${member.id}`;

    try {
      // Plan first: assigning a plan resets the expiry from the billing cycle,
      // so an explicit expiry edit in the same save must win.
      if (planChanged) {
        await client.put(`${base}/membership/plan`, { membershipPlanId: planId });
      }
      if (expiryChanged) {
        await client.patch(`${base}/membership/expiry`, { expiresAt: expiryInput });
      }
      if (autoRollChanged) {
        await client.patch(`${base}/membership/auto-roll`, { autoRoll });
      }
      setSavedAt(true);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [token, currentGymId, member, expiryInput, planId, autoRoll, onChanged]);

  const handleStatus = useCallback(
    async (next: 'active' | 'inactive') => {
      if (!token || !currentGymId) return;
      setError(null);
      setSavedAt(false);
      setIsStatusSaving(true);
      try {
        const client = createApiClient({ token });
        await client.patch(`/api/gyms/${currentGymId}/members/${member.id}/status`, {
          status: next,
        });
        onChanged();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setIsStatusSaving(false);
      }
    },
    [token, currentGymId, member.id, onChanged],
  );

  const chip = membershipChipProps(member.membershipStatus);
  const isSuspended = member.status === 'inactive';

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text size="title" weight="semibold">{member.name}</Text>
          <Text size="meta" tone="muted">{member.email}</Text>
        </View>
        <StatusChip tone={chip.tone} label={chip.label} />
        <TouchableOpacity
          testID="member-panel-close"
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}>
          <Icon name="close" size={20} tone="muted" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <SelectField
        label="Plan"
        testID="member-plan-select"
        items={planItems}
        selectedId={planId}
        onSelect={setPlanId}
        fetchState={plansState}
        style={styles.planField}
      />

      {member.planId ? (
        <>
          <View style={styles.field}>
            <Text size="label" weight="semibold" tone="faint" upper>Expires</Text>
            <View style={styles.expiryRow}>
              <TextInput
                testID="member-expiry-input"
                style={[styles.input, styles.expiryInput, error ? styles.inputError : null]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Ink.faint}
                value={expiryInput}
                onChangeText={setExpiryInput}
                editable={!isSaving}
                autoCorrect={false}
              />
              <Button
                testID="member-add-cycle-btn"
                label="+1 cycle"
                variant="quiet"
                disabled={isSaving || !currentPlan}
                onPress={() =>
                  currentPlan &&
                  setExpiryInput(nextCycleDate(member.expiresAt, currentPlan.billingCycle))
                }
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text size="label" weight="semibold" tone="faint" upper>Auto-renew</Text>
              <Text size="meta" tone="muted">
                {member.autoRollCount > 0
                  ? `Renewed ${member.autoRollCount}× since you last confirmed`
                  : 'No unconfirmed renewals'}
              </Text>
            </View>
            <TouchableOpacity
              testID="member-auto-roll-toggle"
              style={[styles.toggleTrack, autoRoll && styles.toggleTrackActive]}
              onPress={() => !isSaving && setAutoRoll((prev) => !prev)}
              activeOpacity={0.8}>
              <View style={[styles.toggleThumb, autoRoll && styles.toggleThumbRight]} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text size="meta" tone="muted">No plan assigned</Text>
      )}

      {error ? (
        <Text size="meta" tone={Status.danger} style={styles.errorText}>{error}</Text>
      ) : savedAt ? (
        <Text size="meta" tone="muted" style={styles.errorText}>Saved</Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Button
          testID="member-save-btn"
          label="Save changes"
          variant="primary"
          onPress={handleSave}
          loading={isSaving}
        />
        {isSuspended ? (
          <Button
            testID="member-resume-btn"
            label="Resume membership"
            variant="quiet"
            onPress={() => handleStatus('active')}
            loading={isStatusSaving}
          />
        ) : (
          <Button
            testID="member-suspend-btn"
            label="Suspend membership"
            variant="danger"
            onPress={() => handleStatus('inactive')}
            loading={isStatusSaving}
          />
        )}
      </View>
    </>
  );

  if (!isMobile) {
    return <View style={styles.panel}>{body}</View>;
  }

  return <MemberDetailsSheet onClose={onClose}>{body}</MemberDetailsSheet>;
}

/**
 * Mobile register: a bottom sheet over a dimmed backdrop. The backdrop fades
 * while the sheet slides, matching SelectField's sheet so the two read as one
 * system when a picker opens on top of the panel.
 */
function MemberDetailsSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable testID="member-sheet-backdrop" style={styles.backdropRoot} onPress={onClose}>
        <Animated.View style={[styles.backdropFill, { opacity: anim }]} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_TRAVEL, 0],
                  }),
                },
              ],
            },
          ]}>
          <Pressable testID="member-sheet-body" onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <ScrollView
              contentContainerStyle={{ gap: Space.base, paddingBottom: Space.md }}
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
