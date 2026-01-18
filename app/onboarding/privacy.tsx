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
  Modal,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState as useStateImported } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { saveUserPreferences } from "@/utils/storage";
import { UserPreferences } from "@/types/user";
import { llmService, LocalModelStatus } from "@/services/llmService";

type AIChoice = "gemini" | "local" | null;

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selectedChoice, setSelectedChoice] = useState<AIChoice>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalModelStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const firstName = params.firstName as string;

  const startModelDownload = async () => {
    setShowDownloadModal(true);
    try {
      // Check device compatibility first
      const status = await llmService.getLocalModelStatus();
      setModelStatus(status);

      if (!status.available) {
        Alert.alert(
          "Setup Required",
          status.reason || "To enable on-device AI, add MLX Swift packages via Xcode. See LOCAL_MODEL_SETUP.md",
          [{ text: "OK", onPress: () => setShowDownloadModal(false) }]
        );
        setSelectedChoice(null);
        return;
      }

      if (!status.isLoaded) {
        console.log("📥 Starting model download...");
        
        // Simulate progress for fake mode
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 0.3;
          if (progress > 0.95) progress = 0.95;
          setDownloadProgress(progress);
        }, 200);

        // Start the actual download (fake, takes 1.5s)
        await llmService.loadLocalModel();
        
        // Clear interval and mark as loaded
        clearInterval(interval);
        setDownloadProgress(1);
        setModelStatus(prev => prev ? { ...prev, isLoaded: true, progress: 1 } : null);
        console.log("✅ Model downloaded successfully!");
      } else {
        console.log("✅ Model already downloaded!");
        setDownloadProgress(1);
        setModelStatus(prev => prev ? { ...prev, isLoaded: true } : null);
      }
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert(
        "Download Failed",
        error.message || "Failed to download model. Please try again.",
        [
          { text: "Try Again", onPress: startModelDownload },
          { text: "Use Cloud AI", onPress: () => setSelectedChoice("gemini") },
        ]
      );
      setSelectedChoice(null);
      setShowDownloadModal(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedChoice) return;

    // If local AI is selected, start download
    if (selectedChoice === "local") {
      await startModelDownload();
      return;
    }

    setIsLoading(true);

    try {
      // Set provider
      await llmService.setProvider(selectedChoice);

      const preferences: UserPreferences = {
        firstName,
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

  const handleDownloadComplete = async () => {
    setShowDownloadModal(false);
    
    // Now save preferences
    setIsLoading(true);
    try {
      // Set provider
      await llmService.setProvider("local");

      const preferences: UserPreferences = {
        firstName,
        hasCompletedOnboarding: true,
        aiPrivacyConsent: false,
        onboardingCompletedAt: new Date().toISOString(),
      };

      await saveUserPreferences(preferences);

      // Navigate to main app
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
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.progressText}>Step 2 of 2</Text>

        {/* Title */}
        <Text style={styles.title}>Choose Your Privacy</Text>
        <Text style={styles.subtitle}>How would you like to use AI?</Text>

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

      {/* Model Download Modal */}
      <Modal
        visible={showDownloadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Downloading AI Model</Text>
              
              {modelStatus && (
                <View style={styles.statusSection}>
                  <View style={styles.statusHeader}>
                    <Text style={styles.modelNameText}>Qwen2.5-3B-Instruct (4-bit)</Text>
                    <View style={[
                      styles.statusBadge,
                      modelStatus.isLoading ? styles.statusBadgeLoading :
                      modelStatus.isLoaded ? styles.statusBadgeSuccess : 
                      styles.statusBadgeIdle
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {modelStatus.isLoading ? "Downloading..." :
                         modelStatus.isLoaded ? "Complete" : "Waiting"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.modelDetails}>
                    ~1.9GB • Fully offline • Metal GPU accelerated
                  </Text>

                  {modelStatus.isLoading && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} 
                        />
                      </View>
                      <Text style={styles.progressPercentage}>
                        {Math.round(downloadProgress * 100)}%
                      </Text>
                    </View>
                  )}

                  {modelStatus.isLoaded && (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                      <Text style={styles.successText}>Model Ready!</Text>
                      <Text style={styles.successSubtext}>Your AI model is downloaded and ready to use.</Text>
                    </View>
                  )}

                  {modelStatus.error && (
                    <View style={styles.errorBox}>
                      <Ionicons name="close-circle" size={48} color="#FF3B30" />
                      <Text style={styles.errorTitle}>Download Failed</Text>
                      <Text style={styles.errorText}>{modelStatus.error}</Text>
                    </View>
                  )}

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#007AFF" />
                    <Text style={styles.infoText}>
                      First download may take 5-10 minutes depending on your connection. Please keep the app open.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {modelStatus?.isLoaded && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleDownloadComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Continue to App</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {modelStatus?.error && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.retryButton]}
                  onPress={startModelDownload}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.fallbackButton]}
                  onPress={() => {
                    setShowDownloadModal(false);
                    setSelectedChoice("gemini");
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud" size={20} color="#007AFF" />
                  <Text style={[styles.modalButtonText, { color: "#007AFF" }]}>Use Cloud AI</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
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
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 24,
    textAlign: "center",
  },
  statusSection: {
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modelNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeSuccess: {
    backgroundColor: "#34C759",
  },
  statusBadgeLoading: {
    backgroundColor: "#FF9500",
  },
  statusBadgeIdle: {
    backgroundColor: "#8E8E93",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modelDetails: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 16,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34C759",
    width: 45,
    textAlign: "right",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#E8FFE8",
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#34C759",
    marginTop: 12,
  },
  successSubtext: {
    fontSize: 13,
    color: "#34C759",
    marginTop: 4,
    textAlign: "center",
  },
  errorBox: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    marginTop: 4,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E8F4FF",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#007AFF",
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  modalButton: {
    backgroundColor: "#34C759",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryButton: {
    backgroundColor: "#FF9500",
  },
  fallbackButton: {
    backgroundColor: "#E8F4FF",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
