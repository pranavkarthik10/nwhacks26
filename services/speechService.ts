/**
 * Speech Service - Voice input/output using ElevenLabs
 * 
 * Handles:
 * - Audio recording with expo-av
 * - Speech-to-text (ElevenLabs STT)
 * - Text-to-speech (ElevenLabs TTS)
 * - Audio playback
 * - Silence detection for auto-stop
 */

import { Audio, AVPlaybackStatus } from "expo-av";
import { Paths, File } from "expo-file-system";

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

// Silence detection configuration
const SILENCE_THRESHOLD_DB = -40;
const SILENCE_DURATION_MS = 1500;
const METERING_POLL_INTERVAL_MS = 150;
const MAX_RECORDING_DURATION_MS = 60000;

class SpeechService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private meteringInterval: ReturnType<typeof setInterval> | null = null;
  private silenceStartTime: number | null = null;
  private recordingStartTime: number | null = null;
  private _isRecording = false;
  private _isPlaying = false;
  private recordingResolver: ((uri: string) => void) | null = null; // For manual stop

  get isRecording(): boolean {
    return this._isRecording;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("🎤 Microphone permission denied");
        return false;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      console.log("🎤 Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      // Create new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100 // Update status every 100ms
      );

      this.recording = recording;
      this._isRecording = true;
      this.recordingStartTime = Date.now();
      console.log("🎙️ Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  /**
   * Start recording with automatic silence detection
   * Returns the audio file URI when recording stops
   */
  async startRecordingWithAutoStop(
    onLevelChange?: (dB: number) => void
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Stop any existing recording first
        if (this.recording) {
          await this.stopRecording();
        }

        // Ensure audio mode allows recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Store resolver for manual stop capability
        this.recordingResolver = resolve;

        // Create recording with metering enabled
        const recordingOptions = {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        };

        const { recording } = await Audio.Recording.createAsync(
          recordingOptions,
          undefined,
          METERING_POLL_INTERVAL_MS
        );

        this.recording = recording;
        this._isRecording = true;
        this.recordingStartTime = Date.now();
        this.silenceStartTime = null;

        console.log("🎙️ Recording started with auto-stop");

        // Start metering poll
        this.meteringInterval = setInterval(async () => {
          if (!this.recording || !this._isRecording) {
            this.clearMeteringInterval();
            return;
          }

          try {
            const status = await this.recording.getStatusAsync();
            
            if (!status.isRecording) {
              this.clearMeteringInterval();
              return;
            }

            const metering = status.metering ?? -160;
            
            // Normalize dB for UI (typically -160 to 0)
            if (onLevelChange) {
              onLevelChange(metering);
            }

            // Check for max duration
            const elapsed = Date.now() - (this.recordingStartTime || 0);
            if (elapsed >= MAX_RECORDING_DURATION_MS) {
              console.log("⏱️ Max recording duration reached");
              this.clearMeteringInterval();
              const uri = await this.stopRecording();
              this.recordingResolver = null; // Clear resolver
              resolve(uri || "");
              return;
            }

            // Silence detection
            if (metering < SILENCE_THRESHOLD_DB) {
              if (this.silenceStartTime === null) {
                this.silenceStartTime = Date.now();
              } else if (Date.now() - this.silenceStartTime >= SILENCE_DURATION_MS) {
                // Silence detected for long enough - stop recording
                console.log("🤫 Silence detected, stopping recording");
                this.clearMeteringInterval();
                const uri = await this.stopRecording();
                this.recordingResolver = null; // Clear resolver
                resolve(uri || "");
              }
            } else {
              // Sound detected, reset silence timer
              this.silenceStartTime = null;
            }
          } catch (error) {
            console.error("Error in metering poll:", error);
          }
        }, METERING_POLL_INTERVAL_MS);

      } catch (error) {
        console.error("Error in startRecordingWithAutoStop:", error);
        reject(error);
      }
    });
  }

  /**
   * Stop recording and return the audio file URI
   */
  async stopRecording(): Promise<string | null> {
    this.clearMeteringInterval();

    if (!this.recording) {
      console.log("No recording to stop");
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this._isRecording = false;
      this.silenceStartTime = null;
      this.recordingStartTime = null;

      console.log("🎙️ Recording stopped:", uri);
      return uri;
    } catch (error) {
      console.error("Error stopping recording:", error);
      this.recording = null;
      this._isRecording = false;
      return null;
    }
  }

  /**
   * Force stop recording and resolve the pending promise
   * Used when user manually taps to stop (instead of waiting for silence)
   */
  async forceStopRecording(): Promise<string | null> {
    console.log("🛑 Force stopping recording");
    this.clearMeteringInterval();
    
    const uri = await this.stopRecording();
    
    // Resolve the pending promise if exists
    if (this.recordingResolver && uri) {
      this.recordingResolver(uri);
      this.recordingResolver = null;
    }
    
    return uri;
  }

  /**
   * Transcribe audio file to text using ElevenLabs STT
   */
  async transcribeAudio(uri: string): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      console.log("📝 Transcribing audio...");

      // Check if the audio file exists using the new File API
      const audioFile = new File(uri);
      if (!audioFile.exists) {
        throw new Error("Audio file not found");
      }

      // Create form data with the audio file
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);
      formData.append("model_id", "scribe_v1");

      const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("STT API error:", response.status, errorText);
        throw new Error(`STT failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || "";
      
      console.log("📝 Transcription:", text);
      return text;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }

  /**
   * Synthesize speech from text using ElevenLabs TTS
   * Returns the audio file URI
   */
  async synthesizeSpeech(text: string, voiceId?: string): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      console.log("🔊 Synthesizing speech...");

      const voice = voiceId || DEFAULT_VOICE_ID;
      
      const response = await fetch(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${voice}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TTS API error:", response.status, errorText);
        throw new Error(`TTS failed: ${response.status}`);
      }

      // Get the audio blob
      const audioBlob = await response.blob();
      
      // Save to file system using new expo-file-system API
      const file = new File(Paths.cache, `tts_${Date.now()}.mp3`);
      
      // Convert blob to base64 and save
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove data URL prefix
          const base64Content = base64data.split(",")[1];
          resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Write base64 content to file
      await file.write(base64, { encoding: "base64" });

      console.log("🔊 Speech synthesized:", file.uri);
      return file.uri;
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      throw error;
    }
  }

  /**
   * Play audio file
   */
  async playAudio(uri: string, onComplete?: () => void): Promise<void> {
    try {
      // Stop any existing playback
      await this.stopPlayback();

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            this._isPlaying = false;
            if (onComplete) {
              onComplete();
            }
          }
        }
      );

      this.sound = sound;
      this._isPlaying = true;
      
      console.log("▶️ Playing audio");

      // Wait for playback to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          if (!this._isPlaying || !this.sound) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Re-enable recording mode after playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

    } catch (error) {
      console.error("Error playing audio:", error);
      this._isPlaying = false;
      
      // Ensure recording is re-enabled even on error
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch {
        // Ignore
      }
      
      throw error;
    }
  }

  /**
   * Stop audio playback
   */
  async stopPlayback(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping playback:", error);
      }
      this.sound = null;
      this._isPlaying = false;
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up speech service");
    
    this.clearMeteringInterval();
    
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore errors during cleanup
      }
      this.recording = null;
      this._isRecording = false;
    }

    await this.stopPlayback();

    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      // Ignore errors during cleanup
    }
  }

  private clearMeteringInterval(): void {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
    }
  }
}

// Export singleton instance
export const speechService = new SpeechService();

// Export utility function to normalize dB to 0-1 range
export function normalizeDb(dB: number): number {
  // dB typically ranges from -160 (silence) to 0 (max)
  // Normalize to 0-1 range
  const minDb = -60;
  const maxDb = 0;
  const normalized = (dB - minDb) / (maxDb - minDb);
  return Math.max(0, Math.min(1, normalized));
}
