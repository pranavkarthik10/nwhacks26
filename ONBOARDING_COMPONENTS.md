# Onboarding Components - Technical Details

## Component Tree

```
RootLayout (app/_layout.tsx)
├─ Stack Navigation
│  ├─ OnboardingLayout (app/onboarding/_layout.tsx)
│  │  ├─ IntroScreen (intro.tsx)
│  │  ├─ FirstNameScreen (firstName.tsx)
│  │  └─ PrivacyScreen (privacy.tsx)
│  │     └─ DownloadModal (within privacy.tsx)
│  │
│  └─ TabsLayout (app/(tabs)/_layout.tsx)
│     ├─ HomeScreen (index.tsx)
│     └─ ChatScreen (chat.tsx)
```

## Component Details

### 1. IntroScreen (`intro.tsx`)

**Props:** None (root screen)

**State:** None (static content)

**Key Features:**
- ScrollView for content overflow
- Hero section with icon circle
- 3 feature cards (reusable pattern)
- CTA button to firstName

**Navigation:**
```
← (none)  |  IntroScreen  →  FirstNameScreen
```

**Styling:**
- Full width feature cards
- Gradient-like color backgrounds per feature
- Bottom spacing for CTA

---

### 2. FirstNameScreen (`firstName.tsx`)

**Props:** None

**State:**
```typescript
firstName: string         // User input
```

**Key Features:**
- Debug reset button (top right)
- 3-step progress indicator
- Input validation (min 2 chars)
- Auto-focus on mount
- Return key triggers submit

**Navigation:**
```
← (close/leave)  |  FirstNameScreen  →  LastNameScreen
                                           (pass: {firstName})
```

**Validation:**
```typescript
isValid = firstName.trim().length >= 2
```

---

### 3. PrivacyScreen (`privacy.tsx`)

**Props:** Via route params
```typescript
firstName: string   // From firstName screen
```

**State:**
```typescript
selectedChoice: "gemini" | "local" | null
isLoading: boolean
showDownloadModal: boolean
modelStatus: LocalModelStatus | null
downloadProgress: number
```

**Handlers:**
- `startModelDownload()` - Initiates download & polling
- `handleComplete()` - Saves preferences for cloud AI
- `handleDownloadComplete()` - Saves preferences after download

**Subcomponents:**
- **Choice Cards** (reusable pattern)
  - Cloud AI card
  - On-Device card
  - Visual selection state
- **Download Modal** (conditional)
  - Status display
  - Progress bar
  - Action buttons (retry/fallback/continue)

**Navigation:**
```
← FirstNameScreen  |  PrivacyScreen  →  TabsLayout
                     └─ Download Modal (conditional)
```

**Key Logic:**
```typescript
// Route based on selection
if (selectedChoice === "local") {
  // Trigger download flow
  startModelDownload()
} else {
  // Direct to app (cloud AI)
  handleComplete()
}
```

---

## Data Flow

### Onboarding Data Persistence

```
Intro Screen
    ↓
    (no data)
    ↓
First Name Screen
    ↓
    firstName: "John"
    ↓ (pass via params)
Privacy Screen
    ↓
    firstName: "John"
    + selectedChoice: "local" | "gemini"
    ↓ (if download needed)
Download Modal
    ↓
    Poll llmService.getLocalModelStatus()
    ↓ (when complete)
Save Preferences
    ↓
    await saveUserPreferences({
      firstName: "John",
      aiPrivacyConsent: false,  // if local
      hasCompletedOnboarding: true,
      onboardingCompletedAt: "..."
    })
    ↓
Navigate to Main App
```

---

## Shared Patterns

### Progress Indicator

```typescript
// Common across all screens
<View style={styles.progressContainer}>
  <View style={styles.progressDot} />
  <View style={[styles.progressDot, styles.progressDotInactive]} />
  <View style={[styles.progressDot, styles.progressDotInactive]} />
</View>
<Text style={styles.progressText}>Step X of 3</Text>
```

### Input Field Pattern

```typescript
<View style={styles.formSection}>
  <TextInput
    style={styles.input}
    value={value}
    onChangeText={setValue}
    placeholder="..."
    autoFocus
    returnKeyType="next"
    onSubmitEditing={handleContinue}
  />
</View>
```

### Action Button

```typescript
<TouchableOpacity
  style={[
    styles.continueButton,
    !isValid && styles.continueButtonDisabled
  ]}
  onPress={handleContinue}
  disabled={!isValid}
  activeOpacity={0.8}
>
  <Text style={styles.continueButtonText}>Continue</Text>
  <Ionicons name="arrow-forward" size={20} color="#fff" />
</TouchableOpacity>
```

---

## Styling Architecture

### Global Styles Used

```typescript
// Colors
#F2F2F7  - Background gray
#1C1C1E  - Dark text
#8E8E93  - Placeholder/secondary text
#007AFF  - Primary blue
#34C759  - Success green
#FF3B30  - Error red

// Typography
fontSize: 28-36  - Titles
fontSize: 18    - Form inputs
fontSize: 15-16 - Subtitles
fontSize: 13-14 - Secondary text

// Spacing
paddingHorizontal: 24 - Main content padding
paddingVertical: 16   - Form inputs
gap: 8-12             - Element spacing

// Shadows
shadowOpacity: 0.06   - Subtle cards
shadowOpacity: 0.3    - Emphasized buttons
```

---

## Navigation Flow (Expo Router)

```
/
├─ onboarding/
│  ├─ intro           [NEW]
│  ├─ firstName       [NEW]
│  └─ privacy         [UPDATED]
│
└─ (tabs)/
   ├─ index           [HOME]
   └─ chat            [CHAT]
```

**Routing Logic:**
1. App launches → Check `hasCompletedOnboarding()`
2. If false → Navigate to `/onboarding/intro`
3. User completes flow → `saveUserPreferences()` → Navigate to `/(tabs)`
4. On next app launch → Directly to `/(tabs)` (skips onboarding)

---

## Mobile Responsiveness

### Screen Sizes Tested
- iPhone SE (375px width)
- iPhone 12/13 (390px width)
- iPhone Pro Max (430px width)
- iPad (larger screens)

### Key Responsive Features
- `useSafeAreaInsets()` for notches/home indicators
- Flexible padding (`paddingHorizontal: 24`)
- `flex: 1` for content distribution
- ScrollView for overflow content (intro)
- Large touch targets (48px+ buttons)

---

## Performance Optimizations

✅ **Minimal Re-renders**
- useState limited to needed state
- No unnecessary context providers
- Static content where possible

✅ **Lazy Loading**
- Download modal only renders when needed
- Progress polling stops when complete

✅ **Memory Efficient**
- Single TextInput focus at a time
- Modal disposal after completion

---

## Accessibility Features

✅ **Keyboard Support**
- `autoFocus` for inputs
- `returnKeyType="next"` directs focus
- Proper keyboard dismissal

✅ **Touch Targets**
- Buttons 48-56px tall (Apple HIG)
- Text fields large (16px+ font)

✅ **Semantic Naming**
- Clear screen titles
- Descriptive placeholders
- Progress indicators

---

## Error Handling

### Intro → FirstName
- No errors possible (static screen)

### FirstName → LastName
- Validation errors shown via disabled button
- User must enter min 2 chars

### LastName → Privacy
- Validation errors shown via disabled button

### Privacy → Download
- Device compatibility check
- Network error handling
- Storage availability check
- Retry mechanism in modal
- Fallback to cloud AI option

---

## Testing Strategy

### Unit Tests (Per Screen)

```typescript
// IntroScreen
- Hero section renders
- Features display
- CTA button navigates to firstName

// FirstNameScreen
- Input accepts text
- Validation works (min 2 chars)
- Debug button clears data
- Continue button disabled when empty
- Navigation passes param correctly

// PrivacyScreen
- Both choice options selectable
- Cloud AI path works
- Local AI triggers download
- Download modal appears
- Preferences saved correctly
```

### Integration Tests

- Full onboarding flow
- Data persistence
- Provider setting
- Navigation routing

---

## Future Extensibility

**Could add:**
- Health profile questions
- Biometric setup
- Health app permission request
- Additional personalization
- Branching flows based on user type

**Modular enough to:**
- Reorder screens
- Skip screens conditionally
- Add new screens between existing ones
- Show different flows for different users
