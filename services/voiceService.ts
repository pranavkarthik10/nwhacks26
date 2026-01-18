import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  voiceId: string;
  name: string;
}

// Popular ElevenLabs voices
const AVAILABLE_VOICES: VoiceSettings[] = [
  { voiceId: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female)" },
  { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female)" },
  { voiceId: "TxGEqnHWrfWFTfGW9XjX", name: "Antoni (Male)" },
  { voiceId: "XrExE9yKIg1WjnnlVkGv", name: "Arnold (Male)" },
  { voiceId: "MF3mGyEYCl7XYWbV7PZt", name: "Domi (Male)" },
];

const VOICE_SETTINGS_KEY = "@health_voice_settings";
const DEFAULT_VOICE = AVAILABLE_VOICES[0]; // Rachel

class VoiceService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private selectedVoice: VoiceSettings = DEFAULT_VOICE;

  async initialize() {
    try {
      const savedVoiceId = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
      if (savedVoiceId) {
        const voice = AVAILABLE_VOICES.find((v) => v.voiceId === savedVoiceId);
        if (voice) {
          this.selectedVoice = voice;
        }
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  setVoice(voiceId: string) {
    const voice = AVAILABLE_VOICES.find((v) => v.voiceId === voiceId);
    if (voice) {
      this.selectedVoice = voice;
      AsyncStorage.setItem(VOICE_SETTINGS_KEY, voiceId).catch((error) =>
        console.error("Error saving voice preference:", error)
      );
    }
  }

  getSelectedVoice(): VoiceSettings {
    return this.selectedVoice;
  }

  getAvailableVoices(): VoiceSettings[] {
    return AVAILABLE_VOICES;
  }

  /**
   * Convert text to speech and play it
   */
  async speak(text: string): Promise<void> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured");
    }

    if (this.isPlaying) {
      await this.stop();
    }

    try {
      // Call ElevenLabs API
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${this.selectedVoice.voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();

      // Convert blob to base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(",")[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Create temporary file and play it
      await this.playAudioBase64(audioBase64);
    } catch (error) {
      console.error("Error speaking:", error);
      throw error;
    }
  }

  private async playAudioBase64(base64: string): Promise<void> {
    try {
      // Stop existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Create new sound with base64 data
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${base64}` },
        { shouldPlay: true }
      );

      this.sound = sound;
      this.isPlaying = true;

      // Listen for playback finish
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
        }
      });

      await sound.playAsync();
    } catch (error) {
      this.isPlaying = false;
      console.error("Error playing audio:", error);
      throw error;
    }
  }

  /**
   * Stop current audio playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      } catch (error) {
        console.error("Error stopping audio:", error);
      }
    }
    this.isPlaying = false;
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
