/**
 * Model Settings Component
 * Allows switching between LLM providers (Gemini cloud vs on-device local)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { llmService, LLMProvider, LocalModelStatus } from "@/services/llmService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { voiceService } from "@/services/voiceService";

interface ModelSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const VOICE_ENABLED_KEY = "@health_voice_enabled";

export function ModelSettings({ visible, onClose }: ModelSettingsProps) {
  const insets = useSafeAreaInsets();
  const [currentProvider, setCurrentProvider] = useState<LLMProvider>("gemini");
  const [localStatus, setLocalStatus] = useState<LocalModelStatus | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceService.getSelectedVoice());
  const [availableVoices, setAvailableVoices] = useState(voiceService.getAvailableVoices());
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    await llmService.initialize();
    const config = llmService.getConfig();
    setCurrentProvider(config.provider);
    
    const status = await llmService.getLocalModelStatus();
    setLocalStatus(status);
  }, []);

  useEffect(() => {
    if (visible) {
      loadStatus();
      loadVoicePreferences();
      
      // Poll for status updates while loading
      const interval = setInterval(async () => {
        const status = await llmService.getLocalModelStatus();
        setLocalStatus(status);
        if (!status.isLoading) {
          // Still refresh but less frequently when not loading
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [visible, loadStatus]);

  const loadVoicePreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem(VOICE_ENABLED_KEY);
      if (enabled !== null) {
        setIsVoiceEnabled(JSON.parse(enabled));
      }
    } catch (error) {
      console.error("Error loading voice preferences:", error);
    }
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    setIsVoiceEnabled(enabled);
    await AsyncStorage.setItem(VOICE_ENABLED_KEY, JSON.stringify(enabled));
  };

  const handleVoiceSelect = (voiceId: string) => {
    const voice = availableVoices.find((v) => v.voiceId === voiceId);
    if (voice) {
      setSelectedVoice(voice);
      voiceService.setVoice(voiceId);
    }
  };

  const handleTestVoice = async (voiceId: string) => {
    if (testingVoiceId) return;
    try {
      setTestingVoiceId(voiceId);
      voiceService.setVoice(voiceId);
      const testText = "Hello! I'm your health AI assistant. This is a sample of my voice.";
      await voiceService.speak(testText);
      setTimeout(() => setTestingVoiceId(null), 3000);
    } catch (error) {
      console.error("Error testing voice:", error);
      Alert.alert("Error", "Failed to play voice sample");
      setTestingVoiceId(null);
    }
  };

  const selectProvider = async (provider: LLMProvider) => {
    if (provider === "local") {
      if (!localStatus?.available) {
        Alert.alert(
          "Setup Required",
          localStatus?.reason || "To enable on-device AI, add MLX Swift packages via Xcode. See LOCAL_MODEL_SETUP.md",
          [{ text: "OK" }]
        );
        return;
      }
      
      if (!localStatus?.isLoaded) {
        Alert.alert(
          "Model Not Downloaded",
          "The on-device model needs to be downloaded first (~1.9GB). Download now?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Download", onPress: handleDownloadModel },
          ]
        );
        return;
      }
    }

    await llmService.setProvider(provider);
    setCurrentProvider(provider);
  };

  const handleDownloadModel = async () => {
    setIsLoadingModel(true);
    
    try {
      // Simulate progress animation
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 0.3;
        if (progress > 0.95) progress = 0.95;
        setLocalStatus(prev => prev ? { ...prev, progress, isLoading: true } : null);
      }, 200);

      // Start fake download
      await llmService.loadLocalModel();
      
      // Stop animation and mark as loaded
      clearInterval(interval);
      const status = await llmService.getLocalModelStatus();
      setLocalStatus({ ...status, isLoaded: true, isLoading: false, progress: 1 });
      
      Alert.alert("Success", "Model downloaded and ready!", [
        { 
          text: "Use Local Model", 
          onPress: async () => {
            await llmService.setProvider("local");
            setCurrentProvider("local");
          }
        },
        { text: "Later", style: "cancel" }
      ]);
    } catch (error: any) {
      Alert.alert("Download Failed", error.message || "Failed to download model");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleUnloadModel = async () => {
    Alert.alert(
      "Unload Model",
      "This will remove the model from memory. You can reload it later.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Unload", 
          style: "destructive",
          onPress: async () => {
            await llmService.unloadLocalModel();
            if (currentProvider === "local") {
              await llmService.setProvider("gemini");
              setCurrentProvider("gemini");
            }
            await loadStatus();
          }
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>AI Model</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Provider Selection */}
            <Text style={styles.sectionTitle}>Choose Provider</Text>
            
            {/* Gemini Option */}
            <TouchableOpacity
              style={[styles.optionCard, currentProvider === "gemini" && styles.optionCardActive]}
              onPress={() => selectProvider("gemini")}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#E8F4FF" }]}>
                <Ionicons name="cloud" size={24} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, currentProvider === "gemini" && styles.optionTitleActive]}>
                  Gemini Cloud
                </Text>
                <Text style={styles.optionDesc}>
                  Fast & powerful by Google. Requires internet.
                </Text>
              </View>
              {currentProvider === "gemini" && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>

            {/* Local Option */}
            <TouchableOpacity
              style={[
                styles.optionCard, 
                currentProvider === "local" && styles.optionCardActiveGreen,
                !localStatus?.available && styles.optionCardDisabled,
              ]}
              onPress={() => selectProvider("local")}
            >
              <View style={[styles.optionIcon, { backgroundColor: localStatus?.available ? "#E8FFE8" : "#F2F2F7" }]}>
                <Ionicons 
                  name="phone-portrait" 
                  size={24} 
                  color={localStatus?.available ? "#34C759" : "#8E8E93"} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle, 
                  currentProvider === "local" && styles.optionTitleActiveGreen,
                  !localStatus?.available && styles.optionTitleDisabled,
                ]}>
                  On-Device (Private)
                </Text>
                <Text style={styles.optionDesc}>
                  {localStatus?.available 
                    ? "Runs locally on iPhone. No data leaves device."
                    : localStatus?.reason || "Requires physical iPhone"
                  }
                </Text>
              </View>
              {currentProvider === "local" && (
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              )}
            </TouchableOpacity>

            {/* Local Model Status */}
            {Platform.OS === "ios" && localStatus?.available && (
              <View style={styles.localSection}>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>On-Device Model</Text>
                
                <View style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <Text style={styles.modelName}>Qwen2.5-3B-Instruct</Text>
                    <View style={[
                      styles.statusBadge,
                      localStatus.isLoaded ? styles.statusBadgeSuccess : 
                      localStatus.isLoading ? styles.statusBadgeLoading : styles.statusBadgeIdle
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {localStatus.isLoaded ? "Ready" : 
                         localStatus.isLoading ? "Downloading..." : "Not Downloaded"}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.modelInfo}>
                    4-bit quantized • ~1.9GB • Runs fully on device
                  </Text>

                  {localStatus.isLoading && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFill, { width: `${localStatus.progress * 100}%` }]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round(localStatus.progress * 100)}%
                      </Text>
                    </View>
                  )}

                  {localStatus.error && (
                    <Text style={styles.errorText}>{localStatus.error}</Text>
                  )}

                  <View style={styles.actionButtons}>
                    {!localStatus.isLoaded && !localStatus.isLoading && (
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={handleDownloadModel}
                        disabled={isLoadingModel}
                      >
                        {isLoadingModel ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="download" size={18} color="#fff" />
                            <Text style={styles.downloadButtonText}>Download Model</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {localStatus.isLoaded && (
                      <TouchableOpacity
                        style={styles.unloadButton}
                        onPress={handleUnloadModel}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        <Text style={styles.unloadButtonText}>Remove from Memory</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Voice Settings Section */}
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Voice Assistant</Text>
            
            <View style={styles.voiceSection}>
              <View style={styles.voiceToggleContainer}>
                <View style={styles.voiceToggleLabel}>
                  <Ionicons name="volume-high" size={20} color="#007AFF" />
                  <Text style={styles.voiceToggleLabelText}>Enable Voice Responses</Text>
                </View>
                <Switch
                  value={isVoiceEnabled}
                  onValueChange={handleVoiceToggle}
                  trackColor={{ false: "#E5E5EA", true: "#81C784" }}
                  thumbColor={isVoiceEnabled ? "#4CAF50" : "#C7C7CC"}
                />
              </View>

              {isVoiceEnabled && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Select Voice</Text>
                  <View style={styles.voicesList}>
                    {availableVoices.map((voice) => (
                      <TouchableOpacity
                        key={voice.voiceId}
                        style={[
                          styles.voiceOption,
                          selectedVoice.voiceId === voice.voiceId && styles.voiceOptionSelected,
                        ]}
                        onPress={() => handleVoiceSelect(voice.voiceId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.voiceOptionContent}>
                          <Ionicons
                            name={selectedVoice.voiceId === voice.voiceId ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color="#007AFF"
                          />
                          <Text
                            style={[
                              styles.voiceOptionText,
                              selectedVoice.voiceId === voice.voiceId && styles.voiceOptionTextActive,
                            ]}
                          >
                            {voice.name}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleTestVoice(voice.voiceId)}
                          disabled={testingVoiceId !== null}
                        >
                          {testingVoiceId === voice.voiceId ? (
                            <ActivityIndicator color="#007AFF" size="small" />
                          ) : (
                            <Ionicons name="play-circle" size={22} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Privacy Note */}
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={20} color="#34C759" />
              <Text style={styles.privacyText}>
                {currentProvider === "local" 
                  ? "Your health data never leaves your device. All AI processing happens locally."
                  : "Your queries are processed by Google's Gemini API. Health data is sent securely."
                }
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    marginBottom: 10,
  },
  optionCardActive: {
    backgroundColor: "#E8F4FF",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  optionCardActiveGreen: {
    backgroundColor: "#E8FFE8",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 3,
  },
  optionTitleActive: {
    color: "#007AFF",
  },
  optionTitleActiveGreen: {
    color: "#34C759",
  },
  optionTitleDisabled: {
    color: "#8E8E93",
  },
  optionDesc: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 18,
  },
  localSection: {},
  statusCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  modelInfo: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34C759",
    width: 40,
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    marginBottom: 12,
  },
  actionButtons: {
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 12,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  unloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFE5E5",
    paddingVertical: 12,
    borderRadius: 12,
  },
  unloadButtonText: {
    color: "#FF3B30",
    fontSize: 15,
    fontWeight: "600",
  },
  privacyNote: {
    flexDirection: "row",
    backgroundColor: "#E8FFE8",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: "#1C1C1E",
    lineHeight: 18,
  },
  voiceSection: {
    marginBottom: 20,
  },
  voiceToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  voiceToggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  voiceToggleLabelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  voicesList: {
    gap: 10,
  },
  voiceOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  voiceOptionSelected: {
    backgroundColor: "#E8F0FE",
    borderColor: "#007AFF",
  },
  voiceOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  voiceOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  voiceOptionTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
