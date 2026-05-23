import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';
import { STATE_NEXT_MAP, STATE_LABEL, ClassState } from './classStates';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];

const STATE_DOT_COLOR: Record<ClassState, string> = {
  published: AppColors.successVivid,
  booking_closed: AppColors.warningDefault,
  in_progress: AppColors.iconBlue,
  completed: AppColors.accentTeal,
  archived: AppColors.textDisabled,
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

// ─── State Badge ──────────────────────────────────────────────────────────────

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
        <ActivityIndicator size="small" color={AppColors.textMuted} />
      ) : (
        <>
          <View style={[styles.stateDot, { backgroundColor: STATE_DOT_COLOR[state] }]} />
          <Text style={styles.stateText}>{STATE_LABEL[state]}</Text>
          {!isTerminal && <Text style={styles.stateChevron}>v</Text>}
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
      {items.map((item, index) => (
        <View key={item.label} style={[styles.infoItem, index > 0 && styles.infoItemSeparator]}>
          <Text style={styles.infoLabel}>{item.label}</Text>
          <Text style={styles.infoValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Class Header ─────────────────────────────────────────────────────────────

interface ClassHeaderProps {
  classDetail: ClassDetail;
  isTransitioning: boolean;
  onTransition: () => void;
  onMarkAttendance: () => void;
  onAddProgramming: () => void;
  onEditClass: () => void;
}

export function ClassHeader({
  classDetail,
  isTransitioning,
  onTransition,
  onMarkAttendance,
  onAddProgramming,
  onEditClass,
}: ClassHeaderProps) {
  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{classDetail.classTypeName}</Text>
          <Text style={styles.headerSubtitle}>
            {formatDateSubtitle(classDetail.scheduledDate, classDetail.scheduledTime)}
          </Text>
        </View>
        <StateBadge
          state={classDetail.state}
          isTransitioning={isTransitioning}
          onPress={onTransition}
        />
      </View>

      <InfoCard classDetail={classDetail} />

      <View style={styles.actionRow}>
        <TouchableOpacity testID="mark-attendance-btn" style={styles.primaryBtn} onPress={onMarkAttendance}>
          <Text style={styles.primaryBtnText}>MARK ATTENDANCE</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="add-programming-btn" style={styles.outlinedBtn} onPress={onAddProgramming}>
          <Text style={styles.outlinedBtnText}>ADD PROGRAMMING</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="edit-class-btn" style={styles.outlinedBtn} onPress={onEditClass}>
          <Text style={styles.outlinedBtnText}>EDIT</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
