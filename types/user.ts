// User preferences and onboarding types

export interface UserPreferences {
  firstName: string;
  hasCompletedOnboarding: boolean;
  aiPrivacyConsent: boolean; // true = Gemini API, false = On-device ML
  onboardingCompletedAt: string; // ISO date string
}

export interface OnboardingFormData {
  firstName: string;
}
