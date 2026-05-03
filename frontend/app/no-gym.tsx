import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingRight: 24,
    paddingBottom: 48,
    paddingLeft: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 21,
    width: '100%',
  },
  spacer: {
    height: 40,
  },
  logoutBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
