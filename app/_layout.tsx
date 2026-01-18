import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { hasCompletedOnboarding } from "@/utils/storage";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initial load delay to let the app mount
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === "onboarding";
    const inTabs = segments[0] === "(tabs)";

    // Re-check onboarding status when navigating
    const recheckAndRoute = async () => {
      const completed = await hasCompletedOnboarding();
      
      if (!completed && !inOnboarding) {
        // User hasn't completed onboarding, redirect to onboarding
        router.replace("/onboarding/welcome");
      } else if (completed && !inOnboarding && !inTabs) {
        // User has completed onboarding, redirect to main app
        router.replace("/(tabs)");
      }
    };

    recheckAndRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
});
