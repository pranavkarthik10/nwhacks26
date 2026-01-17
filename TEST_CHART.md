# Testing Charts

## Console Logs to Check

When you ask a question that should show a chart, check the console (Metro bundler) for these logs:

1. **`Preparing chart data from:`** - Shows what health data was fetched
2. **`Found samples:`** - Number of data points found
3. **`Chart data prepared:`** - The final chart configuration
4. **`HealthChart rendering:`** - What the chart component received

## Test Queries

### Should Show Charts ✅
- "Show my steps for the last week"
- "Show my heart rate trends"
- "How did my sleep change this week"

### Won't Show Charts ❌
- "How many steps today?" (single value, no trend)
- "What's my heart rate?" (single value)

## Common Issues

### "No data available"
- You might not have historical data in HealthKit
- Open Apple Health and check if you have data for the past 7 days
- Try adding some test data

### Empty/Blank Chart
- Check console logs for errors
- Data might be all zeros
- HealthKit might not be returning samples

## Manual Test

To manually test if charts work, add this temporary code to `chat.tsx`:

```typescript
// Add a test button that creates fake chart data
const testChart = {
  type: "bar",
  title: "Test Chart",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [{ data: [5000, 6000, 4000, 8000, 7000] }],
  },
  color: "#0000FF",
};
```

Then in a message, set `chartData: testChart` to see if the chart renders at all.

## Debug Mode

Open the app with:
```bash
npm run ios
```

Then check the Metro bundler terminal for all console.log outputs.
