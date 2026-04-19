import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";

// DEV-ONLY: This screen is for local development testing
if (!__DEV__) {
  throw new Error("dev-bootstrap is only available in development mode");
}

export default function DevBootstrapScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { setCurrentGymId } = useGym();

  const [userIdInput, setUserIdInput] = useState("");
  const [gymIdInput, setGymIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quick-fill with test data from seed script
  const quickFillAthlete = () => {
    // Query the database to get actual UUIDs, but provide placeholder for now
    Alert.alert(
      "Quick Fill: Athlete",
      "To use quick-fill, run this in your terminal:\n\ndocker-compose exec postgres psql -U postgres -d crossfit_box_dev -c \"SELECT id FROM users WHERE email = 'athlete@example.com'; SELECT id FROM gyms LIMIT 1;\"",
      [{ text: "Got it", onPress: () => {} }],
    );
  };

  const handleSetAuth = async () => {
    if (!userIdInput.trim()) {
      Alert.alert("Error", "Please enter a user ID");
      return;
    }

    if (!gymIdInput.trim()) {
      Alert.alert("Error", "Please enter a gym ID");
      return;
    }

    setIsLoading(true);
    try {
      // For header-based auth, we use a placeholder token (not used, but required by context)
      const placeholderToken = "dev-header-auth-placeholder";
      const userId = userIdInput.trim();
      const gymId = gymIdInput.trim();

      // Set auth and gym context
      await setAuth(placeholderToken, userId);
      setCurrentGymId(gymId);

      // Navigate immediately (context state is now set)
      router.replace("/(tabs)/schedule");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = async () => {
    setUserIdInput("");
    setGymIdInput("");
    Alert.alert("Cleared", "Auth inputs cleared");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerText}>🔧 DEV Bootstrap</Text>
          <Text style={styles.subtitle}>Local development auth setup</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
            placeholderTextColor="#999"
            value={userIdInput}
            onChangeText={setUserIdInput}
            editable={!isLoading}
          />
          <Text style={styles.hint}>UUID of the user (from database)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gym ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
            placeholderTextColor="#999"
            value={gymIdInput}
            onChangeText={setGymIdInput}
            editable={!isLoading}
          />
          <Text style={styles.hint}>UUID of the gym (from database)</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSetAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Set Auth & Go to Schedule</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleClearAuth}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Clear Inputs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.helpButton]}
            onPress={quickFillAthlete}
            disabled={isLoading}
          >
            <Text style={styles.helpButtonText}>? How to get IDs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ How to use:</Text>
          <Text style={styles.infoText}>
            1. Start the backend and database with: bash scripts/dev-up.sh
          </Text>
          <Text style={styles.infoText}>
            2. Query your user and gym IDs from the database (or tap "How to get
            IDs")
          </Text>
          <Text style={styles.infoText}>3. Enter both IDs above</Text>
          <Text style={styles.infoText}>
            4. Tap "Set Auth & Go to Schedule"
          </Text>
          <Text style={styles.infoText}>
            5. Your session persists until app restart or manual clear
          </Text>
        </View>

        <View style={styles.codeBox}>
          <Text style={styles.codeTitle}>Quick: Get test user IDs</Text>
          <Text style={styles.codeText}>
            docker-compose exec postgres psql -U postgres -d crossfit_box_dev -c
            "SELECT id FROM users WHERE email = 'athlete@example.com'; SELECT id
            FROM gyms LIMIT 1;"
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ This screen is DEV-ONLY and will not appear in production builds.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
    marginBottom: 6,
    minHeight: 44,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: "#0a7ea4",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  helpButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#999",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0a7ea4",
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976d2",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#1565c0",
    marginBottom: 4,
    lineHeight: 18,
  },
  codeBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 12,
    fontFamily: "Courier New",
  },
  codeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  codeText: {
    fontSize: 11,
    color: "#555",
    fontFamily: "Courier New",
    lineHeight: 16,
  },
  warningBox: {
    backgroundColor: "#fff3e0",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    color: "#e65100",
    fontWeight: "500",
    lineHeight: 18,
  },
});
