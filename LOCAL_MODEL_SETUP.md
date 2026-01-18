# On-Device AI Setup Guide

This app supports **on-device AI inference** using Apple's MLX framework. This means:
- 🔒 **100% Private** - Your health data never leaves your device
- 📶 **Offline** - Works without internet connection  
- ⚡ **Fast** - Optimized for Apple Silicon

## Requirements

- **Physical iPhone** with A14 chip or newer (iPhone 12+)
- **iOS 17.0+**
- **~3GB free storage** for model download
- **Xcode 15+** to add MLX packages

> ⚠️ **Note**: MLX does NOT work on iOS Simulator. You must test on a physical device.

## Setup Instructions

### Step 1: Open Xcode Project

```bash
cd ios
open MyHealthApp.xcworkspace
```

### Step 2: Add MLX Swift Packages

1. In Xcode, go to **File → Add Package Dependencies**
2. Add these packages:

| Package URL | Version |
|-------------|---------|
| `https://github.com/ml-explore/mlx-swift` | 0.21.2+ |
| `https://github.com/ml-explore/mlx-swift-examples` | 1.19.0+ |

3. When prompted, add these libraries to the **MyHealthApp** target:
   - `MLX`
   - `MLXLLM`
   - `MLXLMCommon`
   - `MLXNN`
   - `MLXRandom`

### Step 3: Build & Run on Device

1. Connect your iPhone
2. Select your device in Xcode (not simulator)
3. Build and run (⌘R)

### Step 4: Download Model in App

1. Open the app on your iPhone
2. Tap "Health AI" in the chat header
3. Tap **"Download Model"** 
4. Wait for download (~1.9GB, 3-10 minutes on WiFi)
5. Select **"On-Device (Private)"** as your provider

## Model Details

| Model | Qwen2.5-3B-Instruct-4bit |
|-------|--------------------------|
| Size | ~1.9GB |
| Parameters | 3 billion |
| Quantization | 4-bit |
| Source | HuggingFace mlx-community |

## Troubleshooting

### "MLX requires physical device"
MLX uses Metal GPU which isn't available in the simulator. Test on a real iPhone.

### Download stuck or failed
- Ensure stable WiFi connection
- Check available storage (need ~3GB)
- Try restarting the app

### Slow first response
The first inference compiles Metal shaders (~30 seconds). Subsequent responses are fast (2-5 seconds).

### Out of memory crash
The 3B model uses ~2GB RAM. Close other apps if you experience crashes.

## Architecture

```
┌─────────────────────────────────────┐
│        React Native (JS)            │
│      aiHealthTools.ts               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        llmService.ts                │
│    (Provider abstraction)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     LocalLLMService.swift           │
│  (Native iOS MLX integration)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        MLX Swift                    │
│   (Apple's ML framework)            │
└─────────────────────────────────────┘
```

## Privacy

When using the on-device model:
- ✅ All AI processing happens locally on your iPhone
- ✅ No health data is sent to any server
- ✅ Works completely offline
- ✅ Model weights stored locally in app sandbox
