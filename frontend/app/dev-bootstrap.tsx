import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { showAlert } from "@/utils/alert";

// DEV-ONLY: This screen is for local development testing
if (!__DEV__) {
  throw new Error("dev-bootstrap is only available in development mode");
}

export default function DevBootstrapScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { setCurrentGymId } = useGym();

  const [tokenInput, setTokenInput] = useState("");
  const [gymIdInput, setGymIdInput] = useState(
    "550e8400-e29b-41d4-a716-446655440010",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSetAuth = async () => {
    if (!tokenInput.trim()) {
      showAlert("Error", "Please enter a JWT token");
      return;
    }

    if (!gymIdInput.trim()) {
      showAlert("Error", "Please enter a gym ID");
      return;
    }

    setIsLoading(true);
    try {
      await login(tokenInput.trim());
      await setCurrentGymId(gymIdInput.trim());

      router.replace("/(tabs)/schedule");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      showAlert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = async () => {
    setTokenInput("");
    setGymIdInput("");
    showAlert("Cleared", "Auth inputs cleared");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerText}>DEV Bootstrap</Text>
          <Text style={styles.subtitle}>Local development auth setup</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>JWT Token</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste a JWT token from the backend login endpoint"
            placeholderTextColor="#999"
            value={tokenInput}
            onChangeText={setTokenInput}
            editable={!isLoading}
            multiline
          />
          <Text style={styles.hint}>
            Obtain via POST /api/auth/login with valid credentials
          </Text>
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
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How to use:</Text>
          <Text style={styles.infoText}>
            1. Start the backend and database with: bash scripts/dev-up.sh
          </Text>
          <Text style={styles.infoText}>
            2. POST /api/auth/login to get a JWT token
          </Text>
          <Text style={styles.infoText}>3. Paste the token above</Text>
          <Text style={styles.infoText}>
            4. Enter the gym ID and tap Set Auth
          </Text>
          <Text style={styles.infoText}>
            5. Your session persists until the token expires or app restart
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            This screen is DEV-ONLY and will not appear in production builds.
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
