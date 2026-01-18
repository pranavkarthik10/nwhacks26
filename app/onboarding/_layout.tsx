import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="intro" />
      <Stack.Screen name="firstName" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
