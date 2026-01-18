import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { voiceService } from "@/services/voiceService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VOICE_ENABLED_KEY = "@health_voice_enabled";

interface VoiceSettingsProps {
  onClose: () => void;
  visible: boolean;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  onClose,
  visible,
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(voiceService.getSelectedVoice());
  const [availableVoices, setAvailableVoices] = useState(voiceService.getAvailableVoices());
  const [isPlaying, setIsPlaying] = useState(false);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    loadVoicePreferences();
  }, []);

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
    if (testingVoiceId) return; // Already testing

    try {
      setTestingVoiceId(voiceId);
      voiceService.setVoice(voiceId);

      const testText =
        "Hello! I'm your health AI assistant. This is a sample of my voice. How can I help you today?";

      await voiceService.speak(testText);

      // Wait for playback to finish
      setTimeout(() => {
        setTestingVoiceId(null);
      }, 3000);
    } catch (error) {
      console.error("Error testing voice:", error);
      Alert.alert("Error", "Failed to play voice sample");
      setTestingVoiceId(null);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Voice Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-circle" size={28} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voice Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-mute" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Enable Voice Responses</Text>
          </View>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Play AI responses out loud</Text>
            <Switch
              value={isVoiceEnabled}
              onValueChange={handleVoiceToggle}
              trackColor={{ false: "#E5E5EA", true: "#81C784" }}
              thumbColor={isVoiceEnabled ? "#4CAF50" : "#C7C7CC"}
            />
          </View>
          <Text style={styles.sectionDescription}>
            The AI will speak responses after answering your questions
          </Text>
        </View>

        {/* Voice Selection */}
        {isVoiceEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mic" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Choose Voice</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select which voice you'd like the AI to use. Tap to preview:
            </Text>

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
                  <View style={styles.voiceInfo}>
                    <Ionicons
                      name={selectedVoice.voiceId === voice.voiceId ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color="#007AFF"
                    />
                    <Text
                      style={[
                        styles.voiceName,
                        selectedVoice.voiceId === voice.voiceId && styles.voiceNameActive,
                      ]}
                    >
                      {voice.name}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handleTestVoice(voice.voiceId)}
                    disabled={testingVoiceId !== null}
                  >
                    {testingVoiceId === voice.voiceId ? (
                      <ActivityIndicator color="#007AFF" size="small" />
                    ) : (
                      <Ionicons name="play-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              Voice responses are powered by ElevenLabs AI voice technology
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  voicesList: {
    marginTop: 12,
    gap: 10,
  },
  voiceOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  voiceOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#E8F0FE",
  },
  voiceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  voiceNameActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  playButton: {
    padding: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#1C1C1E",
    flex: 1,
    lineHeight: 18,
  },
});
