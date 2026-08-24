import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { createApiClient, ApiError } from '@/utils/api-client';
import { Ink, Status } from '@/constants/design';
import { Text, Button } from '@/components/cleanink';
import type { components } from '@/types/api.gen';
import { styles } from './ChangePasswordSection.styles';

type ChangePasswordDto = components['schemas']['ChangePasswordDto'];

/**
 * The SECURITY section of the profile screen.
 *
 * Collapsed until asked for: three password fields permanently open on a screen
 * whose main job is a name and some toggles would read as something that needs
 * doing. Both actions are `quiet` — profile's single accent belongs to Save
 * Changes, and changing a password is not a more confident act than that.
 *
 * Confirmation is one line of muted meta text. There is no success role in this
 * system, so nothing here turns green.
 */
export function ChangePasswordSection({ token }: { token: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didChange, setDidChange] = useState(false);

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError(null);
  }

  function handleOpen() {
    reset();
    setDidChange(false);
    setIsOpen(true);
  }

  function handleCancel() {
    reset();
    setIsOpen(false);
  }

  /** Clearing on edit, so a stale rejection doesn't sit under a corrected field. */
  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      if (error) setError(null);
    };
  }

  async function handleSubmit() {
    if (isSaving) return;

    if (currentPassword === '' || newPassword === '' || confirm === '') {
      setError('Fill in all three fields.');
      return;
    }
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    // Checked here as well as on the server: this is the one 400 the backend
    // returns that is not about the current password, and keeping it client-side
    // means the server's 400 has exactly one meaning to report below.
    if (newPassword === currentPassword) {
      setError('Your new password is the same as your current one.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const client = createApiClient({ token });
      const body: ChangePasswordDto = { currentPassword, newPassword };
      await client.post('/api/auth/change-password', body as unknown as Record<string, unknown>);

      // Nothing is signed out and no token is reissued — the session in hand
      // stays valid, so there is nothing to do here but confirm and close.
      reset();
      setIsOpen(false);
      setDidChange(true);
    } catch (err) {
      // A 400 here means the current password was wrong: the session itself is
      // valid (that would be a 401), and every other 400 case is caught above.
      if (err instanceof ApiError && err.status === 400) {
        setError('That current password is not right.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text size="label" weight="semibold" tone={Ink.faint} upper>SECURITY</Text>
      <Text size="body" tone={Ink.muted} style={styles.description}>
        Change the password you use to sign in.
      </Text>

      <View style={styles.card}>
        {isOpen ? (
          <>
            <PasswordField
              testID="change-password-current-input"
              label="Current password"
              value={currentPassword}
              onChangeText={edit(setCurrentPassword)}
              editable={!isSaving}
            />
            <PasswordField
              testID="change-password-new-input"
              label="New password"
              value={newPassword}
              onChangeText={edit(setNewPassword)}
              editable={!isSaving}
            />
            <PasswordField
              testID="change-password-confirm-input"
              label="Confirm new password"
              value={confirm}
              onChangeText={edit(setConfirm)}
              editable={!isSaving}
            />

            {/* Inline, in the deeper danger red — never the accent. */}
            {error !== null ? (
              <Text
                testID="change-password-error"
                size="meta"
                tone={Status.danger}
                style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <Button
                  testID="change-password-cancel-btn"
                  label="Cancel"
                  variant="quiet"
                  onPress={handleCancel}
                />
              </View>
              <View style={styles.actionItem}>
                <Button
                  testID="change-password-submit-btn"
                  label="Update password"
                  variant="quiet"
                  loading={isSaving}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <Button
              testID="change-password-open-btn"
              label="Change password"
              variant="quiet"
              onPress={handleOpen}
            />
            {didChange ? (
              <Text
                testID="change-password-confirmation"
                size="meta"
                tone={Ink.muted}
                style={styles.confirmation}>
                Password changed. We emailed you to confirm.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function PasswordField({
  testID,
  label,
  value,
  onChangeText,
  editable,
}: {
  testID: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text size="meta" weight="semibold">{label}</Text>
      <TextInput
        testID={testID}
        style={styles.input}
        placeholder="••••••••"
        placeholderTextColor={Ink.faint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
      />
    </View>
  );
}
