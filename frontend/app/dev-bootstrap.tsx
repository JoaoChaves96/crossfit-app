import React, { useContext, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/AuthContext";
import { GymContext } from "@/context/GymContext";
import { createApiClient } from "@/utils/api-client";
import { AppColors } from "@/constants/theme";
import { styles } from "./dev-bootstrap.styles";

// DEV-ONLY: This screen is for local development testing
if (!__DEV__) {
  throw new Error("dev-bootstrap is only available in development mode");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEV_PASSWORD = "password123";

const TEST_USERS: { role: string; email: string }[] = [
  { role: "Owner", email: "owner@example.com" },
  { role: "Coach", email: "coach@example.com" },
  { role: "Athlete", email: "athlete@example.com" },
];

const ROLE_ROUTES: Record<string, string> = {
  owner: "/(tabs)/schedule",
  coach: "/coach-classes",
  athlete: "/(tabs)/schedule",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface LoginResponse {
  accessToken: string;
}

function getRoleFromToken(token: string): string | null {
  try {
    const base64 = token.split(".")[1];
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function getGymIdFromToken(token: string): string | null {
  try {
    const base64 = token.split(".")[1];
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.gymId === "string" ? payload.gymId : null;
  } catch {
    return null;
  }
}

// ─── UserCard ─────────────────────────────────────────────────────────────────

interface UserCardProps {
  role: string;
  email: string;
  isLoading: boolean;
  error: string | null;
  onPress: () => void;
}

function UserCard({ role, email, isLoading, error, onPress }: UserCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isLoading && styles.cardDisabled]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.cardRole}>{role}</Text>
          <Text style={styles.cardEmail}>{email}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={AppColors.brandPrimary} />
        ) : null}
      </View>
      {error !== null ? <Text style={styles.cardError}>{error}</Text> : null}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DevBootstrapScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const gym = useContext(GymContext);

  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUserTap(email: string) {
    if (!auth || !gym) return;

    setLoadingEmail(email);
    setErrorEmail(null);
    setErrorMessage(null);

    try {
      const client = createApiClient({});
      const response = await client.post<LoginResponse>("/api/auth/login", {
        email,
        password: DEV_PASSWORD,
      });

      await auth.login(response.accessToken);

      // Extract role and gymId from token
      const role = getRoleFromToken(response.accessToken);
      const gymId = getGymIdFromToken(response.accessToken);

      // Set gym context if user has a gym
      if (gymId) {
        await gym.setCurrentGymId(gymId);
      }

      const route = (role && ROLE_ROUTES[role]) ?? "/no-gym";
      router.replace(route as never);
    } catch (err) {
      // ApiError.message is already user-facing copy, and it distinguishes a
      // dead backend (status 0) from a rejected login — the status code alone
      // did not.
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setErrorEmail(email);
      setErrorMessage(message);
    } finally {
      setLoadingEmail(null);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerText}>DEV Bootstrap</Text>
          <Text style={styles.subtitle}>Tap a user to log in instantly</Text>
        </View>

        <View style={styles.list}>
          {TEST_USERS.map(({ role, email }) => (
            <UserCard
              key={email}
              role={role}
              email={email}
              isLoading={loadingEmail === email}
              error={errorEmail === email ? errorMessage : null}
              onPress={() => handleUserTap(email)}
            />
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            DEV-ONLY — not available in production builds.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
