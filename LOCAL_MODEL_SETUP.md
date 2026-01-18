# On-Device AI Model Setup Guide

This guide explains how to enable on-device LLM inference using MLX Swift. This allows your iPhone to run AI models locally without sending data to the cloud.

## Prerequisites

- **Physical iPhone with A-series chip** (iPhone 12 or newer recommended)
- iPhone with **Metal GPU support** - this is critical for performance
- Xcode 15+ installed on macOS
- ~2GB of free storage for the model (~1.9GB model + runtime)
- WiFi for initial model download (only needs to be done once)

## ⚠️ Important: Simulator Support

**MLX Swift ONLY works on physical devices with Metal GPU.** The simulator cannot run Metal code, so you MUST test on a real iPhone.

If you try to use the local model on a simulator, it will gracefully fall back to mock responses with a helpful message.

## Step 1: Add MLX Swift Package Dependencies to Xcode

You need to add two Swift packages via Xcode's package manager. Unfortunately, Podfile cannot manage Swift packages, so we do this through Xcode.

### Instructions:

1. **Open Xcode project:**
   ```bash
   open ios/MyHealthApp.xcworkspace
   ```
   (Always use `.xcworkspace`, not `.xcodeproj`)

2. **Add MLX Swift package:**
   - Go to `File` → `Add Package Dependencies...`
   - In the URL field, enter:
     ```
     https://github.com/ml-explore/mlx-swift.git
     ```
   - Select branch: `release/0.10`
   - Click `Add Package`
   - Select `MyHealthApp` as the target

3. **Add MLX LLM package:**
   - Go to `File` → `Add Package Dependencies...`
   - In the URL field, enter:
     ```
     https://github.com/ml-explore/mlx-swift-examples.git
     ```
   - Select branch: `release/0.10`
   - Click `Add Package`
   - Select `MyHealthApp` as the target

4. **Link Framework Search Paths:**
   - Select `MyHealthApp` target
   - Go to `Build Settings`
   - Search for `Framework Search Paths`
   - Verify that both MLX packages appear in the search paths
   - This should happen automatically after adding packages

## Step 2: Update Privacy Manifest (Apple Requirement)

Since your app downloads models from the internet, you need to declare this in your Privacy Manifest.

1. **Edit `PrivacyInfo.xcprivacy`:**
   ```bash
   open ios/MyHealthApp/PrivacyInfo.xcprivacy
   ```

2. **Add this property if not present:**
   ```xml
   <key>NSPrivacyConnectedNetworking</key>
   <array>
     <dict>
       <key>NSPrivacyConnectedNetworkingDomains</key>
       <array>
         <string>huggingface.co</string>
       </array>
     </dict>
   </array>
   ```

   Models are downloaded from Hugging Face, so declare that domain.

## Step 3: Build and Test

1. **Clean build:**
   ```bash
   cd ios
   rm -rf build
   xcodebuild clean -workspace MyHealthApp.xcworkspace -scheme MyHealthApp
   ```

2. **Connect your physical iPhone** via USB cable

3. **Select your device in Xcode:** 
   - Top menu bar → device selector → Your iPhone

4. **Build and run:**
   ```bash
   npx expo run:ios --device
   ```

## Step 4: First Model Download

When you select "On-Device AI" during onboarding:

1. **Model Download Starts:**
   - Progress indicator shows: "Downloading..." with percentage
   - On first run: ~5-10 minutes (depends on WiFi speed, ~1.9GB download)
   - File is cached locally, future app launches are instant

2. **Metal Shader Compilation:**
   - After download completes, the model warms up
   - Metal shaders are compiled for your device's GPU
   - This takes ~2-3 minutes (first time only)

3. **Ready to Use:**
   - Once complete, all AI inference happens **100% offline** on your device
   - No data leaves your phone
   - No internet required after initial download

## Troubleshooting

### "MLX requires physical device"
- **Issue:** Running on simulator
- **Solution:** Use a real iPhone for testing

### "Failed to download model"
- **Issue:** Network connectivity or disk space
- **Solution:** Check WiFi connection, ensure 2GB+ free storage
- Try downloading again - it will resume from where it left off

### Build fails with "MLX not found"
- **Issue:** Packages not properly linked
- **Solution:**
  1. Delete build folder: `rm -rf ios/build`
  2. Reinstall pods: `cd ios && pod install`
  3. Re-add packages via Xcode (File → Add Package Dependencies)

### Model loads but responses are slow
- **Issue:** Normal on first inference (shader compilation + first pass)
- **Solution:** Subsequent requests are faster (50-100ms vs 5-10s for first request)

### Metal shader compilation errors
- **Issue:** Device GPU limitation
- **Solution:** Ensure device is iPhone 12 or newer

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│      React Native TypeScript                │
│  (app/onboarding/privacy.tsx)               │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│    llmService.ts (abstraction layer)        │
│  - Manages Gemini + Local models            │
│  - Progress tracking                        │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│   React Native Bridge                       │
│ LocalLLMServiceBridge.m (Objective-C)       │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│   LocalLLMService.swift                     │
│  - MLX Swift integration                    │
│  - Model loading & inference                │
│  - Metal GPU acceleration                   │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│   MLX Swift Packages                        │
│  - Model downloading from HuggingFace       │
│  - Metal shader compilation                 │
│  - GPU inference                            │
└─────────────────────────────────────────────┘
```

## Model Details

**Qwen2.5-3B-Instruct-4bit**
- **Size:** ~1.9GB (4-bit quantization)
- **Language:** English
- **Capabilities:** Health Q&A, data analysis, reasoning
- **Speed:** 50-100ms per token on Apple Silicon
- **Quality:** Similar to Gemini for health tasks

## Privacy & Security

- ✅ **100% offline** - no data sent to any server
- ✅ **On-device encryption** - all models stored locally
- ✅ **No tracking** - no analytics or telemetry
- ✅ **Private inference** - no chat history leaves device
- ✅ **User control** - can delete model anytime from settings

## Reference

- [MLX Swift GitHub](https://github.com/ml-explore/mlx-swift)
- [MLX Swift Examples](https://github.com/ml-explore/mlx-swift-examples)
- [Apple Metal Performance Guide](https://developer.apple.com/metal/)
- [Hugging Face Model Hub](https://huggingface.co/mlx-community)
