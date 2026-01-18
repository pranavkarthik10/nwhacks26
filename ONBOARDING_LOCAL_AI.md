# Onboarding Flow - Local AI Model Download

## Overview

When users select **"On-Device AI"** during onboarding (Step 2 of 2), the app now automatically downloads and sets up the local LLM model before entering the main app.

## User Flow

```
Welcome Screen
    ↓
Privacy Screen (Choose Provider)
    ├─ Cloud AI (Gemini) → Direct to app
    └─ On-Device → Download Screen
                       ↓
                 Download starts
                 Progress bar updates
                       ↓
                 Model complete
                       ↓
                 Setup complete → Main app
```

## Implementation Details

### Files Modified

1. **`app/onboarding/privacy.tsx`**
   - Added `showDownloadModal` state
   - Added `ModelStatus` tracking
   - New download handler that:
     - Checks device compatibility
     - Starts model download
     - Polls for progress updates
     - Shows progress modal
     - Handles errors with fallback to Cloud AI

2. **`services/llmService.ts`** (unchanged)
   - Exposes `loadLocalModel()` for download
   - Exposes `getLocalModelStatus()` for status checks
   - Already handles provider persistence

### New UI Components

**Download Modal** shows:
- Model name: "Qwen2.5-3B-Instruct (4-bit)"
- Model specs: "~1.9GB • Fully offline • Metal GPU accelerated"
- Progress bar (0-100%)
- Status badge (Downloading/Complete/Error)
- Info box about download time expectations
- Action buttons:
  - ✅ "Continue to App" (when complete)
  - 🔄 "Try Again" (if error)
  - ☁️ "Use Cloud AI" (fallback option)

## Key Features

✅ **Real-time Progress Tracking**
- Updates every 1 second
- Shows percentage complete
- Smooth visual feedback

✅ **Error Handling**
- Catches device incompatibility (simulator, no Metal)
- Shows helpful error messages
- Offers retry or fallback to Cloud AI

✅ **Seamless Integration**
- Automatically sets LLM provider to "local" on success
- Saves user preferences
- Transitions directly to main app

✅ **User Experience**
- Clear status badges (Downloading/Complete/Waiting)
- Helpful info about download time
- Option to switch to Cloud AI if download fails
- Loading indicator on button during setup

## Testing

### On Physical iPhone with Metal GPU:

1. Run: `npx expo run:ios --device`
2. Go through onboarding
3. Select "On-Device" on privacy screen
4. Watch download progress (5-10 minutes)
5. Verify model loads successfully
6. Go to chat, verify local model is used

### On Simulator:

1. Select "On-Device"
2. See error: "MLX requires a physical device with Metal GPU"
3. Option to "Use Cloud AI" appears
4. App falls back to Gemini gracefully

## Settings & Model Management

Users can manage their local model anytime via the **Settings** modal in the chat screen:

- View model status
- Download model (if not already downloaded)
- Unload model from memory (frees up ~1.9GB RAM)
- See privacy notice about on-device processing

## First-Time Setup Checklist

Before testing on physical device:

- [ ] **Add MLX Swift packages** via Xcode (see `LOCAL_MODEL_SETUP.md`)
- [ ] **Update Privacy Manifest** to declare HuggingFace domain
- [ ] **Connect physical iPhone** via USB
- [ ] **Build:** `npx expo run:ios --device`
- [ ] **Complete onboarding** and select "On-Device"
- [ ] **Watch download** (~5-10 min for 1.9GB)
- [ ] **Verify model works** by chatting

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "MLX not found" build error | Add packages via Xcode: File → Add Package Dependencies |
| Download fails immediately | Ensure physical device, check WiFi, verify 2GB+ storage |
| Download stalls | Network issue - tap "Try Again" to resume |
| Model loads but responses slow | Normal - first inference compiles Metal shaders (5-10s) |
| "Cannot download" on simulator | Use physical iPhone - simulators can't run Metal code |

## Architecture

```
User selects "On-Device"
        ↓
handleComplete() called
        ↓
startModelDownload() called
        ↓
llmService.loadLocalModel() → Native bridge → LocalLLMService.swift → MLX
        ↓
Poll getLocalModelStatus() every 1s
        ↓
When isLoaded=true → handleDownloadComplete()
        ↓
llmService.setProvider("local")
        ↓
Save preferences → Navigate to main app
```

## Next Steps

After onboarding:
1. Users can access model settings from chat header
2. Model stays loaded in device memory for instant inference
3. Subsequent app launches are instant (model cached)
4. Users can switch between Cloud AI and On-Device anytime
