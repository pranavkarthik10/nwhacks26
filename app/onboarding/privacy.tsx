import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { saveUserPreferences } from "@/utils/storage";
import { UserPreferences } from "@/types/user";

type AIChoice = "gemini" | "local" | null;

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selectedChoice, setSelectedChoice] = useState<AIChoice>(null);
  const [isLoading, setIsLoading] = useState(false);

  const firstName = params.firstName as string;
  const lastName = params.lastName as string;

  const handleComplete = async () => {
    if (!selectedChoice) return;

    setIsLoading(true);

    try {
      const preferences: UserPreferences = {
        firstName,
        lastName,
        hasCompletedOnboarding: true,
        aiPrivacyConsent: selectedChoice === "gemini",
        onboardingCompletedAt: new Date().toISOString(),
      };

      await saveUserPreferences(preferences);

      // Navigate to main app - replace entire stack
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert(
        "Error",
        "Failed to save your preferences. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.progressText}>Step 2 of 2</Text>

        {/* Title */}
        <Text style={styles.title}>Choose Your Privacy</Text>

        {/* Choice Cards */}
        <View style={styles.choicesContainer}>
          {/* Gemini Option */}
          <TouchableOpacity
            style={[
              styles.choiceCard,
              selectedChoice === "gemini" && styles.choiceCardSelected,
            ]}
            onPress={() => setSelectedChoice("gemini")}
            activeOpacity={0.8}
          >
            <View style={styles.choiceHeader}>
              <Ionicons name="cloud" size={28} color="#007AFF" />
              <Text style={styles.choiceTitle}>Cloud AI</Text>
              <View style={styles.radioButton}>
                {selectedChoice === "gemini" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.choiceSubtitle}>Google Gemini</Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureText}>• Best AI responses</Text>
              <Text style={styles.featureText}>• Advanced insights</Text>
              <Text style={[styles.featureText, styles.featureWarning]}>• Data sent to Google</Text>
            </View>
          </TouchableOpacity>

          {/* Local Option */}
          <TouchableOpacity
            style={[
              styles.choiceCard,
              selectedChoice === "local" && styles.choiceCardSelected,
            ]}
            onPress={() => setSelectedChoice("local")}
            activeOpacity={0.8}
          >
            <View style={styles.choiceHeader}>
              <Ionicons name="phone-portrait" size={28} color="#34C759" />
              <Text style={styles.choiceTitle}>On-Device</Text>
              <View style={styles.radioButton}>
                {selectedChoice === "local" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.choiceSubtitle}>Local Processing</Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureText}>• Complete privacy</Text>
              <Text style={styles.featureText}>• 100% offline</Text>
              <Text style={[styles.featureText, styles.featureWarning]}>• Limited capabilities</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Spacer to push button to bottom */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedChoice && styles.continueButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!selectedChoice || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Get Started</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </>
          )}
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
  progressDotComplete: {
    backgroundColor: "#34C759",
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
    marginBottom: 20,
  },
  choicesContainer: {
    gap: 12,
  },
  choiceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  choiceCardSelected: {
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOpacity: 0.15,
  },
  choiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C7C7CC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    flex: 1,
    marginLeft: 8,
  },
  choiceSubtitle: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 10,
  },
  featuresList: {
    gap: 6,
  },
  featureText: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 18,
  },
  featureWarning: {
    color: "#FF9500",
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
