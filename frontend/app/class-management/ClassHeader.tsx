import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Text, Icon, Button, StatusChip, type ChipTone } from '@/components/cleanink';
import { Ink } from '@/constants/design';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';
import { STATE_NEXT_MAP, STATE_LABEL, ClassState } from './classStates';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];

// Lifecycle tone: Published reads as an available/active "open" state; every
// sunken lifecycle state (Booking Closed / In Progress / Completed / Archived)
// is a quiet neutral. The accent is never used for lifecycle.
const STATE_CHIP_TONE: Record<ClassState, ChipTone> = {
  published: 'open',
  booking_closed: 'neutral',
  in_progress: 'neutral',
  completed: 'neutral',
  archived: 'neutral',
};

function formatDateSubtitle(scheduledDate: string, scheduledTime: string): string {
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const [hourStr, minuteStr] = scheduledTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${dateStr} · ${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

// ─── State Badge (lifecycle chip + transition affordance) ───────────────────────

interface StateBadgeProps {
  state: ClassState;
  isTransitioning: boolean;
  onPress: () => void;
}

function StateBadge({ state, isTransitioning, onPress }: StateBadgeProps) {
  const nextState = STATE_NEXT_MAP[state];
  const isTerminal = nextState === null;

  return (
    <TouchableOpacity
      testID="class-transition-btn"
      style={[styles.stateBadge, isTerminal && styles.stateBadgeDisabled]}
      onPress={isTerminal ? undefined : onPress}
      disabled={isTerminal || isTransitioning}
      activeOpacity={isTerminal ? 1 : 0.7}>
      {isTransitioning ? (
        <ActivityIndicator size="small" color={Ink.muted} />
      ) : (
        <>
          <StatusChip tone={STATE_CHIP_TONE[state]} label={STATE_LABEL[state]} />
          {!isTerminal && <Icon name="chevronDown" size={16} tone="faint" />}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  classDetail: ClassDetail;
}

function InfoCard({ classDetail }: InfoCardProps) {
  const items: { label: string; value: string }[] = [
    { label: 'CLASS TYPE', value: classDetail.classTypeName },
    { label: 'COACH', value: classDetail.coachName || '—' },
    { label: 'DURATION', value: `${classDetail.duration} min` },
    {
      label: 'CAPACITY',
      value: `${classDetail.bookedCount} / ${classDetail.capacity}`,
    },
    { label: 'SPACE', value: classDetail.spaceName || '—' },
  ];

  return (
    <View style={styles.infoCard}>
      {items.map((item) => (
        <View key={item.label} style={styles.infoItem}>
          <Text size="label" weight="semibold" tone="faint" upper>{item.label}</Text>
          <Text size="body" weight="medium">{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Class Title Row (always shown) ─────────────────────────────────────────────

interface ClassTitleRowProps {
  classDetail: ClassDetail;
  isTransitioning: boolean;
  onTransition: () => void;
}

export function ClassTitleRow({ classDetail, isTransitioning, onTransition }: ClassTitleRowProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Text size="screen" weight="bold">{classDetail.classTypeName}</Text>
        <Text size="meta" tone="muted">
          {formatDateSubtitle(classDetail.scheduledDate, classDetail.scheduledTime)}
        </Text>
      </View>
      <StateBadge
        state={classDetail.state}
        isTransitioning={isTransitioning}
        onPress={onTransition}
      />
    </View>
  );
}

// ─── Mobile Info Card (compact 2-col) ───────────────────────────────────────────

export function MobileClassInfoCard({ classDetail }: { classDetail: ClassDetail }) {
  const items: { label: string; value: string }[] = [
    { label: 'CLASS TYPE', value: classDetail.classTypeName },
    { label: 'DURATION', value: `${classDetail.duration} min` },
    { label: 'COACH', value: classDetail.coachName || '—' },
    { label: 'CAPACITY', value: `${classDetail.bookedCount} / ${classDetail.capacity}` },
    { label: 'SPACE', value: classDetail.spaceName || '—' },
  ];
  return (
    <View style={styles.mobileInfoGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.mobileInfoGridCell}>
          <Text size="label" weight="semibold" tone="faint" upper>{item.label}</Text>
          <Text size="body" weight="medium">{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Action Row ─────────────────────────────────────────────────────────────────

interface ClassActionsProps {
  onMarkAttendance: () => void;
  onEditClass: () => void;
  /** Mobile stacks the actions full-width; desktop keeps them on one row. */
  isMobile?: boolean;
}

export function ClassActions({ onMarkAttendance, onEditClass, isMobile }: ClassActionsProps) {
  const btnWrap = [styles.actionBtnWrap, isMobile && styles.actionBtnWrapMobile];
  return (
    <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
      <View style={btnWrap}>
        <Button testID="mark-attendance-btn" label="Mark Attendance" variant="primary" onPress={onMarkAttendance} />
      </View>
      <View style={btnWrap}>
        <Button testID="edit-class-btn" label="Edit" variant="quiet" onPress={onEditClass} />
      </View>
    </View>
  );
}

// ─── Class Header ─────────────────────────────────────────────────────────────

interface ClassHeaderProps {
  classDetail: ClassDetail;
  isTransitioning: boolean;
  onTransition: () => void;
  onMarkAttendance: () => void;
  onEditClass: () => void;
}

export function ClassHeader({
  classDetail,
  isTransitioning,
  onTransition,
  onMarkAttendance,
  onEditClass,
}: ClassHeaderProps) {
  return (
    <>
      <ClassTitleRow classDetail={classDetail} isTransitioning={isTransitioning} onTransition={onTransition} />
      <InfoCard classDetail={classDetail} />
      <ClassActions onMarkAttendance={onMarkAttendance} onEditClass={onEditClass} />
    </>
  );
}
