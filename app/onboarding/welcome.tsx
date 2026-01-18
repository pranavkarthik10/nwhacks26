import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingFormData } from "@/types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
  });

  const isValid = formData.firstName.trim().length >= 2 && formData.lastName.trim().length >= 2;

  const handleDebugReset = async () => {
    Alert.alert(
      "Debug: Reset Onboarding",
      "This will clear all saved data and restart onboarding",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("Success", "All data cleared! App will reload.", [
                {
                  text: "OK",
                  onPress: () => {
                    // Force reload by navigating to root
                    router.replace("/onboarding/welcome");
                  },
                },
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to clear data");
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (isValid) {
      // Store in temp state and navigate to privacy screen
      router.push({
        pathname: "/onboarding/privacy",
        params: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Debug Button */}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={handleDebugReset}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color="#8E8E93" />
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotInactive]} />
        </View>
        <Text style={styles.progressText}>Step 1 of 2</Text>

        {/* Title */}
        <Text style={styles.title}>Welcome to MyHealth</Text>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) =>
                setFormData({ ...formData, firstName: text })
              }
              placeholder="Enter your first name"
              placeholderTextColor="#8E8E93"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) =>
                setFormData({ ...formData, lastName: text })
              }
              placeholder="Enter your last name"
              placeholderTextColor="#8E8E93"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  debugButton: {
    position: "absolute",
    top: 20,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
  },
  progressDotInactive: {
    backgroundColor: "#C7C7CC",
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: "#C7C7CC",
    shadowOpacity: 0,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});
