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
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FirstNameScreen() {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");

  const isValid = firstName.trim().length >= 2;

  const handleDebugReset = async () => {
    Alert.alert(
      "Debug: Reset Onboarding",
      "This will clear all saved data and restart onboarding",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("Success", "All data cleared!", [
                {
                  text: "OK",
                  onPress: () => router.replace("/onboarding/intro"),
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
      router.push({
        pathname: "/onboarding/privacy",
        params: { firstName: firstName.trim() },
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
        <Text style={styles.title}>What's your first name?</Text>
        <Text style={styles.subtitle}>Lora would love to know who you are</Text>

        {/* Form Section */}
        <View style={styles.formSection}>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor="#8E8E93"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={handleContinue}
            autoFocus
          />
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
    marginBottom: 32,
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 32,
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: "#1C1C1E",
    fontWeight: "500",
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
