/**
 * Voice Chat Overlay Component
 * Full-screen overlay displayed during voice conversation mode
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mascot assets
const MASCOT_IDLE = require("../assets/gifs/Lora Mascot.png");
const MASCOT_THINKING = require("../assets/gifs/lora mascot thinking.gif");
const MASCOT_TALKING = require("../assets/gifs/lora mascot talking.gif");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceChatOverlayProps {
  visible: boolean;
  voiceState: VoiceState;
  audioLevel: number; // 0-1 normalized
  currentMessage: string; // For closed captions
  onExit: () => void;
  onMicPress: () => void; // Called when center mic is tapped (to stop recording & send)
}

// State-specific colors
const STATE_COLORS: Record<VoiceState, string> = {
  idle: "#8E8E93",
  listening: "#007AFF",
  processing: "#FF9500",
  speaking: "#34C759",
};

// State-specific labels
const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Tap mic to send",
  processing: "Thinking...",
  speaking: "Speaking...",
};

export function VoiceChatOverlay({
  visible,
  voiceState,
  audioLevel,
  currentMessage,
  onExit,
  onMicPress,
}: VoiceChatOverlayProps) {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveformAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3))
  ).current;

  // Fade in/out when visibility changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Pulse animation for listening/speaking states
  useEffect(() => {
    if (voiceState === "listening" || voiceState === "speaking") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  // Waveform animation based on audio level
  useEffect(() => {
    if (voiceState === "listening" || voiceState === "speaking") {
      waveformAnims.forEach((anim, index) => {
        // Create variation based on index and audio level
        const targetValue = voiceState === "speaking"
          ? 0.3 + Math.random() * 0.7 // Random for speaking
          : 0.2 + audioLevel * 0.8 * (0.5 + Math.random() * 0.5); // Based on audio level
        
        Animated.timing(anim, {
          toValue: targetValue,
          duration: 100 + index * 20,
          useNativeDriver: false,
        }).start();
      });
    } else {
      // Flat waveform
      waveformAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [audioLevel, voiceState, waveformAnims]);

  if (!visible) return null;

  const color = STATE_COLORS[voiceState];
  const label = STATE_LABELS[voiceState];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Exit Button */}
      <TouchableOpacity
        style={[styles.exitButton, { top: insets.top + 16 }]}
        onPress={onExit}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Center Content */}
      <View style={styles.centerContent}>
        {/* Mascot - Tappable when listening to stop and send */}
        <TouchableOpacity
          activeOpacity={voiceState === "listening" ? 0.7 : 1}
          onPress={voiceState === "listening" ? onMicPress : undefined}
          disabled={voiceState !== "listening"}
        >
          <Animated.View
            style={[
              styles.mascotContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Image
              source={
                voiceState === "speaking"
                  ? MASCOT_TALKING
                  : voiceState === "processing"
                  ? MASCOT_THINKING
                  : MASCOT_IDLE
              }
              style={styles.mascotImage}
              contentFit="contain"
              autoplay={true}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Waveform Bars */}
        <View style={styles.waveformContainer}>
          {waveformAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: color,
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 50],
                  }),
                },
              ]}
            />
          ))}
        </View>

        {/* Status Label */}
        <Text style={styles.statusLabel}>{label}</Text>

        {/* Closed Captions */}
        {voiceState === "speaking" && currentMessage && (
          <View style={styles.captionsContainer}>
            <Text style={styles.captionsText} numberOfLines={4}>
              {currentMessage}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Hint */}
      <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.hintText}>Tap × to exit voice mode</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  exitButton: {
    position: "absolute",
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mascotContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotImage: {
    width: 200,
    height: 200,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    gap: 8,
    marginBottom: 24,
  },
  waveformBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 10,
  },
  statusLabel: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 24,
  },
  captionsContainer: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  captionsText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#fff",
    textAlign: "center",
  },
  bottomHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
});
