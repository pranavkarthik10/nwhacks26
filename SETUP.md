# Health AI Chat App - Setup Guide

## Prerequisites

- iOS device or simulator
- Xcode installed
- Node.js and npm installed

## API Keys Setup

### 1. Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Eleven Labs API Key (Optional - for future voice features)

1. Go to [Eleven Labs](https://elevenlabs.io/)
2. Sign up and get your API key
3. Add to your `.env` file:

```bash
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## Installation

```bash
# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..

# Run on iOS
npm run ios
```

## Features

### Health Tab
- View your daily health metrics:
  - Steps
  - Heart Rate
  - Calories Burned
  - Sleep Duration
- Sync with Apple HealthKit
- Refresh data anytime

### AI Chat Tab
- Natural language queries about your health data
- AI-powered insights using Google Gemini
- Interactive charts for visual analysis
- Example queries:
  - "How many steps did I take today?"
  - "Show me my heart rate for the last week"
  - "How much sleep did I get?"
  - "What's my calorie burn today?"

## Health Permissions

The app requires the following HealthKit permissions:
- Steps
- Active Energy Burned
- Heart Rate
- Sleep Analysis

These are requested when you first sync your data.

## Troubleshooting

### Health Data Not Showing
- Make sure you've granted HealthKit permissions
- Open the Apple Health app to verify data is available
- Try the "Refresh" button on the Health tab

### AI Chat Not Responding
- Verify your Gemini API key is set correctly in `.env`
- Check your internet connection
- Make sure you have health permissions granted

## Architecture

- **Navigation**: Expo Router with Tabs
- **Health Data**: React Native Health (Apple HealthKit)
- **AI**: Google Gemini API
- **Charts**: React Native Chart Kit
- **State Management**: React Hooks

## Project Structure

```
├── app/
│   ├── _layout.tsx        # Tab navigation
│   ├── index.tsx          # Health data view
│   └── chat.tsx           # AI chat interface
├── hooks/
│   └── useHealthData.ts   # Health data hook
├── services/
│   └── healthDataService.ts  # Health API wrapper
├── utils/
│   └── aiHealthTools.ts   # AI + Health integration
└── components/
    └── HealthChart.tsx    # Chart component
```

## Development

The app uses:
- **React Native 0.81.4**
- **Expo SDK 54**
- **TypeScript**
- **Google Gemini 2.0 Flash**
