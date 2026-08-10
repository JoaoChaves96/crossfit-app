/*
 * ─── Clean Ink · No-Gym zero-state (restyle) ─────────────────────────────────
 * The onboarding empty state shown to an athlete with no gym membership.
 * Mirrors the athlete pilot's empty-state treatment: a centered icon-circle on
 * a sunken tonal ground, an ink title + muted description, and a single primary
 * action. Only the visual world changes — behavior, navigation, and copy are
 * preserved exactly. No emoji as UI; drawn Ionicons via the Icon primitive.
 */
import React, { useContext } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { Ink } from '@/constants/design';
import { Text, Icon, Button } from '@/components/cleanink';
import { styles } from './no-gym.styles';

export default function NoGymScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);

  const handleLogout = async () => {
    if (auth) {
      await auth.logout();
    }
    router.replace('/login' as never);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Icon name="gym" size={30} tone={Ink.faint} />
        </View>
        <Text size="title" weight="bold" tracking="snug" style={styles.title}>
          {"You're Not in a Gym Yet"}
        </Text>
        <Text size="body" tone={Ink.muted} style={styles.emptyDesc}>
          {'Your account is active, but you haven\'t been added to a gym. Ask your gym owner to send you an invite — or set up a gym of your own.'}
        </Text>
        {/* This screen is the only landing place for a user with no gym, which
            covers two people: an athlete waiting on an invite, and an owner who
            has registered but not yet created their gym. The invite path needs
            nothing from us, so the gym-creation path leads. */}
        <View style={styles.emptyButton}>
          <Button
            testID="no-gym-create-gym-btn"
            variant="primary"
            label="Set Up My Gym"
            onPress={() => router.push('/gym-setup' as never)}
          />
        </View>
        <View style={styles.secondaryButton}>
          <Button variant="danger" label="Log Out" onPress={handleLogout} />
        </View>
      </View>
    </View>
  );
}
