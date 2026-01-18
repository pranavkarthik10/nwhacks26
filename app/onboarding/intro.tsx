import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function IntroScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={64} color="#007AFF" />
          </View>
          <Text style={styles.appName}>Lora</Text>
          <Text style={styles.tagline}>Your Personal AI Health Assistant</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Meet Lora</Text>
          
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: "#E8F4FF" }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Talk Naturally</Text>
              <Text style={styles.featureDesc}>
                Chat with Lora about your health just like talking to a friend
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: "#E8FFE8" }]}>
              <Ionicons name="pulse" size={24} color="#34C759" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Personalized Insights</Text>
              <Text style={styles.featureDesc}>
                Lora analyzes your health trends and gives tailored advice
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: "#FFE8E8" }]}>
              <Ionicons name="shield-checkmark" size={24} color="#FF3B30" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Your Privacy Matters</Text>
              <Text style={styles.featureDesc}>
                Choose between cloud AI or fully offline processing with Lora
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>
            Ready to get started? We'll set things up in just a few steps.
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push("/onboarding/firstName")}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  heroSection: {
    alignItems: "center",
    marginBottom: 48,
    marginTop: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "500",
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  ctaSection: {
    alignItems: "center",
  },
  ctaText: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: "100%",
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});
