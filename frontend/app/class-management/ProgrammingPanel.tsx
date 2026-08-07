import React, { useState } from 'react';
import { ActivityIndicator, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { Text, Button, StatusChip } from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Accent, Ground, Ink, Line, Space } from '@/constants/design';
import { styles } from './class-management.styles';
import { ClassState, isProgrammingEditable } from './classStates';
import { useClassProgramming } from './useClassProgramming';

/** Minimum visible height of the auto-growing programming input, in px. */
const INPUT_MIN_HEIGHT = 140;

function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ProgrammingPanelProps {
  token: string | null;
  currentGymId: string | null;
  classId: string | undefined;
  classState: ClassState;
}

export function ProgrammingPanel({
  token,
  currentGymId,
  classId,
  classState,
}: ProgrammingPanelProps) {
  const {
    content,
    setContent,
    loggable,
    setLoggable,
    savedContent,
    lastUpdatedAt,
    isLoading,
    loadError,
    reload,
    isSaving,
    saveError,
    didSave,
    isDirty,
    save,
  } = useClassProgramming({ token, currentGymId, classId });

  const { isMobile } = useResponsiveLayout();
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const isEditable = isProgrammingEditable(classState);

  return (
    <View style={styles.progSection}>
      <View style={styles.listHeader}>
        <Text size="title" weight="semibold">Programming</Text>
        {isEditable ? (
          <View style={styles.progLoggableRow}>
            <Text size="meta" tone="muted">Loggable</Text>
            <Switch
              testID="programming-loggable-toggle"
              value={loggable}
              onValueChange={setLoggable}
              disabled={isLoading || isSaving}
              trackColor={{ false: Line.divider, true: Accent.base }}
              thumbColor={Ground.surface}
              ios_backgroundColor={Line.divider}
              // activeThumbColor is a react-native-web-only prop (absent from
              // core RN Switch types) — keeps the on-state thumb white instead
              // of the web default green.
              {...{ activeThumbColor: Ground.surface }}
            />
          </View>
        ) : (
          <StatusChip tone="neutral" label={loggable ? 'Loggable' : 'Not loggable'} />
        )}
      </View>

      <View style={styles.progCard}>
        {isLoading ? (
          <View style={styles.progFeedback}>
            <ActivityIndicator size="small" color={Ink.muted} />
          </View>
        ) : loadError ? (
          <View style={styles.progFeedback}>
            <Text size="meta" tone="muted" style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity
              testID="programming-retry-btn"
              style={styles.retryBtn}
              onPress={reload}>
              <Text size="body" weight="medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isEditable ? (
          <>
            <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
            <TextInput
              testID="programming-content-input"
              style={[styles.progInput, { height: Math.max(INPUT_MIN_HEIGHT, inputHeight) }]}
              value={content}
              onChangeText={setContent}
              onContentSizeChange={(e) =>
                setInputHeight(e.nativeEvent.contentSize.height + Space.base)
              }
              placeholder="Describe the workout, scaling and any notes…"
              placeholderTextColor={Ink.faint}
              multiline
              textAlignVertical="top"
              editable={!isSaving}
            />

            {saveError ? (
              <View style={styles.progErrorBanner}>
                <Text size="meta" tone="strong">{saveError}</Text>
              </View>
            ) : null}

            <View style={[styles.progFooter, isMobile && styles.progFooterMobile]}>
              {didSave && !isDirty ? (
                <Text size="meta" tone="muted">Saved</Text>
              ) : lastUpdatedAt ? (
                <Text size="meta" tone="faint">
                  Updated {formatLastUpdated(lastUpdatedAt)}
                </Text>
              ) : (
                <View />
              )}
              <View style={[styles.progSaveWrap, isMobile && styles.progSaveWrapMobile]}>
                <Button
                  testID="programming-save-btn"
                  label="Save Programming"
                  variant="primary"
                  loading={isSaving}
                  disabled={!isDirty}
                  onPress={save}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
            {savedContent ? (
              <Text testID="programming-readonly-content" size="body" style={styles.progReadonly}>
                {savedContent}
              </Text>
            ) : (
              <Text size="meta" tone="faint">No programming yet</Text>
            )}
            <Text size="meta" tone="faint">
              Programming can no longer be edited for this class.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
