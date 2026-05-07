import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconPlaceholder}>🏢</Text>
          </View>
          <Text style={styles.title}>{"You're Not in a Gym Yet"}</Text>
          <Text style={styles.description}>
            {'Your account is active, but you haven\'t been added to a gym. Ask your gym owner to send you an invite.'}
          </Text>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

