import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserPreferences } from "@/types/user";

const USER_PREFERENCES_KEY = "@user_preferences";

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const data = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return null;
  }
}

export async function saveUserPreferences(
  prefs: UserPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Error saving user preferences:", error);
    throw error;
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const prefs = await getUserPreferences();
    return prefs?.hasCompletedOnboarding ?? false;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}
