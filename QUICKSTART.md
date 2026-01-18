# 🚀 Quick Start Guide

Get Lora, your Health AI Companion, running in 5 minutes!

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your key

## Step 2: Set Up Environment

```bash
# Create .env file
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_actual_key_here" > .env

# Replace 'your_actual_key_here' with your real API key
```

## Step 3: Install Dependencies

```bash
# Install npm packages
npm install

# Install iOS pods
cd ios && pod install && cd ..
```

## Step 4: Run the App

```bash
# Start the app
npm run ios
```

## Step 5: Grant Permissions

1. When the app opens, tap "Sync Data" on the Health tab
2. Grant HealthKit permissions when prompted
3. Your health data will load automatically

## Step 6: Chat with Lora

1. Switch to the "Lora" chat tab
2. Try these example questions:
   - "How many steps today?"
   - "Show my heart rate"
   - "How much did I sleep?"
   - "Show my steps for the last week"

## Troubleshooting

### No Health Data?
- Open Apple Health app
- Add some test data
- Return to the app and tap refresh

### Chat Not Working?
- Check your `.env` file has the correct API key
- Restart the app: Press Cmd+R in the simulator

### Build Errors?
```bash
# Clean install
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
npm run ios
```

## What You Built

✅ Tab-based navigation (Health + AI Chat)  
✅ Apple HealthKit integration  
✅ Google Gemini AI integration  
✅ Natural language health queries  
✅ Dynamic chart generation  
✅ Tool calling architecture  
✅ Beautiful modern UI  

## Next Steps

- Add more health metrics
- Implement voice input with Eleven Labs
- Add health goal tracking
- Create weekly/monthly summaries
- Build personalized health insights

---

**Need help?** Check out the full [README.md](./README.md) or [SETUP.md](./SETUP.md)
