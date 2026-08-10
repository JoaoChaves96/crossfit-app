import React, { useState } from 'react';
import { ActivityIndicator, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { Text, Button, StatusChip } from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Accent, Ground, Ink, Line } from '@/constants/design';
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
  /**
   * Keyboard-follow handlers from the host screen's `useKeyboardAwareScroll`.
   * The ScrollView lives on the host, so this panel can only report focus and
   * growth — it cannot scroll itself. Optional: the desktop layout has no
   * keyboard to avoid.
   */
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onInputGrow?: (animated: boolean) => void;
  /** Attach to the input+Save group so the host can measure it as one unit. */
  keepVisibleRef?: React.Ref<View>;
}

export function ProgrammingPanel({
  token,
  currentGymId,
  classId,
  classState,
  onInputFocus,
  onInputBlur,
  onInputGrow,
  keepVisibleRef,
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
          /* The input and its Save button are measured as one group so the
             keyboard-follow scroll clears the button too, not just the input. */
          <View ref={keepVisibleRef} collapsable={false} style={styles.progEditGroup}>
            <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
            <TextInput
              testID="programming-content-input"
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              style={[styles.progInput, { height: Math.max(INPUT_MIN_HEIGHT, inputHeight) }]}
              value={content}
              onChangeText={setContent}
              onContentSizeChange={(e) => {
                // Track the measured height verbatim. Padding it out feeds the
                // padded height straight back into contentSize and loops until
                // React aborts with "Maximum update depth exceeded" — the same
                // crash coach-class-details hit. The 1px deadband absorbs
                // sub-pixel jitter from web's fractional scrollHeight.
                const measured = Math.ceil(e.nativeEvent.contentSize.height);
                setInputHeight((prev) => (Math.abs(prev - measured) > 1 ? measured : prev));
                // Growing pushes the caret line back down under the keyboard —
                // follow it. Unanimated so the scroll keeps pace with typing.
                onInputGrow?.(false);
              }}
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
          </View>
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
