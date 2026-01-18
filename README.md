# 🏥 Health AI Chat App

An intelligent health companion app that integrates Apple HealthKit data with Google Gemini AI to provide personalized health insights through natural language conversations.

<img src="https://img.shields.io/badge/React%20Native-0.81.4-61DAFB?logo=react" alt="React Native" />
<img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo" />
<img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript" alt="TypeScript" />
<img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google" alt="Gemini" />

## ✨ Features

### 📊 Health Dashboard
- **Real-time Health Metrics**: Steps, heart rate, calories burned, sleep duration
- **Apple HealthKit Integration**: Secure access to your health data
- **Beautiful UI**: Color-coded health cards with intuitive icons
- **Quick Refresh**: Update your data anytime with a single tap

### 💬 AI Chat Assistant
- **Natural Language Queries**: Ask questions about your health in plain English
- **Intelligent Responses**: Powered by Google Gemini 2.0 Flash
- **Dynamic Charts**: Visual representations of your health trends
- **Tool Calling**: AI automatically fetches the right health data to answer your questions

#### Example Queries:
- "How many steps did I take today?"
- "Show me my heart rate trends for the last week"
- "How well did I sleep last night?"
- "What's my calorie burn for today?"
- "Compare my activity this week to last week"

### 🎙️ Voice AI Responses
- **Natural Voice Output**: Hear responses from AI in natural human voices
- **5 Voice Options**: Choose from Rachel, Bella, Antoni, Arnold, or Domi
- **Voice Preview**: Test voices before selecting your preference
- **Automatic Playback**: AI responses spoken automatically

### 💾 Chat Persistence
- **Auto-Save**: Every conversation automatically saved to device
- **Chat History**: Browse and revisit previous conversations
- **Multiple Sessions**: Switch between different chat conversations
- **Persistent Across Sessions**: Your last chat automatically loads when you open the app

## 🚀 Quick Start

### Prerequisites
- macOS with Xcode installed
- Node.js 18+ and npm
- iOS device or simulator
- Apple Developer account (for device testing)

### Installation

1. **Clone and install dependencies**
```bash
cd nwhacks26
npm install
```

2. **Set up API keys**
```bash
# Copy the example env file
cp env.example.txt .env

# Edit .env and add your Gemini API key
# Get it from: https://makersuite.google.com/app/apikey
```

3. **Install iOS dependencies**
```bash
cd ios && pod install && cd ..
```

4. **Run the app**
```bash
npm run ios
```

## 🔑 API Keys

### Google Gemini API Key (Required)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`: `EXPO_PUBLIC_GEMINI_API_KEY=your_key_here`

### Eleven Labs API Key (Optional)
For future voice features:
1. Sign up at [Eleven Labs](https://elevenlabs.io/)
2. Get your API key
3. Add to `.env`: `EXPO_PUBLIC_ELEVENLABS_API_KEY=your_key_here`

## 🏗️ Architecture

```
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Tab navigation
│   ├── index.tsx                # Health dashboard
│   └── chat.tsx                 # AI chat interface
├── components/                   # Reusable components
│   └── HealthChart.tsx          # Chart visualization
├── hooks/                        # Custom React hooks
│   └── useHealthData.ts         # HealthKit data hook
├── services/                     # Business logic
│   └── healthDataService.ts     # HealthKit API wrapper
└── utils/                        # Utilities
    └── aiHealthTools.ts         # AI + Health integration
```

## 🧠 How It Works

### Health Data Flow
1. User grants HealthKit permissions
2. App fetches health metrics using React Native Health
3. Data is displayed in real-time on the dashboard
4. Data is cached and can be refreshed on demand

### AI Chat Flow
1. User types a natural language query
2. Query is sent to Google Gemini AI
3. AI analyzes the query and determines which health data to fetch
4. App executes the appropriate health data functions
5. AI generates a conversational response with insights
6. If applicable, a chart is rendered with the data

### Available Health Tools
The AI can call these functions to fetch your data:
- `getStepsToday()` - Today's step count
- `getStepsLastWeek()` - Daily steps for 7 days
- `getCaloriesToday()` - Calories burned today
- `getHeartRateToday()` - Heart rate stats (avg, min, max)
- `getHeartRateLastWeek()` - 7 days of heart rate data
- `getSleepToday()` - Today's sleep duration
- `getSleepLastWeek()` - 7 days of sleep data
- `getDistanceToday()` - Distance walked/run

## 📱 Screens

### Health Tab
View your daily health metrics with:
- Steps counter with colorful card
- Heart rate display (latest reading)
- Calories burned tracker
- Sleep duration calculator
- Last sync timestamp
- Refresh button
- Revoke access option

### AI Chat Tab
Interactive chat interface featuring:
- Conversational message bubbles
- Loading indicators
- Dynamic chart rendering
- Scrollable message history
- Keyboard-aware input
- Send button with validation

## 🔒 Privacy & Permissions

This app requires the following HealthKit permissions:
- **Steps**: Read daily step counts
- **Active Energy Burned**: Read calorie data
- **Heart Rate**: Read heart rate measurements
- **Sleep Analysis**: Read sleep duration and quality

**Privacy Note**: All health data stays on your device. The only data sent to external services is your text queries to Google Gemini. Raw health data is never sent to external servers.

## 🛠️ Tech Stack

- **Framework**: React Native 0.81.4
- **Runtime**: Expo SDK 54
- **Language**: TypeScript 5.9.2
- **Navigation**: Expo Router (File-based routing)
- **Health Data**: react-native-health (Apple HealthKit bridge)
- **AI**: Google Gemini 2.0 Flash via @google/generative-ai
- **Charts**: react-native-chart-kit
- **Icons**: @expo/vector-icons (Ionicons, MaterialIcons)
- **Date Handling**: date-fns

## 🐛 Troubleshooting

### "Cannot fetch health data" error
- ✅ Grant HealthKit permissions when prompted
- ✅ Open Apple Health app and verify data exists
- ✅ Try the refresh button
- ✅ Restart the app

### AI Chat not responding
- ✅ Check your `.env` file has the correct Gemini API key
- ✅ Verify internet connection
- ✅ Check the console for error messages
- ✅ Make sure you've granted HealthKit permissions

### Charts not displaying
- ✅ Ask for data over multiple days (e.g., "last week")
- ✅ Ensure you have historical data in Apple Health
- ✅ Try specific queries like "show my steps for the last 7 days"

### Build errors
```bash
# Clean and reinstall
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
```

## 📄 License

MIT License - feel free to use this project for your own apps!

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Voice input/output with Eleven Labs
- More health metrics (weight, blood pressure, etc.)
- Activity trends and predictions
- Health goal setting and tracking
- Export health reports
- Android support with Google Fit

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React Native, Expo, and Google Gemini AI
