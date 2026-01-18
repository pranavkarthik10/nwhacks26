import { GoogleGenerativeAI } from "@google/generative-ai";
import * as HealthService from "@/services/healthDataService";
import { format, subDays } from "date-fns";

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface HealthQueryResponse {
  text: string;
  chartData?: any;
}

// Define available health tools
const healthTools = [
  {
    name: "getStepsToday",
    description: "Get the total step count for today",
    async execute() {
      const dateRange = HealthService.getTodayRange();
      return await HealthService.getSteps(dateRange);
    },
  },
  {
    name: "getStepsLastWeek",
    description: "Get daily step counts for the last 7 days",
    async execute() {
      const dateRange = HealthService.getDateRange(7);
      return await HealthService.getDailySteps(dateRange);
    },
  },
  {
    name: "getCaloriesToday",
    description: "Get calories burned today",
    async execute() {
      const dateRange = HealthService.getTodayRange();
      return await HealthService.getCalories(dateRange);
    },
  },
  {
    name: "getHeartRateToday",
    description: "Get heart rate data for today including average, min, and max",
    async execute() {
      const dateRange = HealthService.getTodayRange();
      return await HealthService.getHeartRate(dateRange);
    },
  },
  {
    name: "getHeartRateLastWeek",
    description: "Get heart rate data for the last 7 days",
    async execute() {
      const dateRange = HealthService.getDateRange(7);
      return await HealthService.getHeartRate(dateRange);
    },
  },
  {
    name: "getSleepToday",
    description: "Get sleep data for today",
    async execute() {
      const dateRange = HealthService.getTodayRange();
      return await HealthService.getSleep(dateRange);
    },
  },
  {
    name: "getSleepLastWeek",
    description: "Get sleep data for the last 7 days",
    async execute() {
      const dateRange = HealthService.getDateRange(7);
      return await HealthService.getSleep(dateRange);
    },
  },
  {
    name: "getDistanceToday",
    description: "Get distance walked/run today",
    async execute() {
      const dateRange = HealthService.getTodayRange();
      return await HealthService.getDistance(dateRange);
    },
  },
];

// Process query and determine which tools to use
export async function processHealthQuery(query: string): Promise<HealthQueryResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // First, analyze the query to determine which health data to fetch
    const analysisPrompt = `You are a health data assistant. Analyze this user query and determine which health metrics they want to see:
    
Query: "${query}"

Available tools:
${healthTools.map((t, i) => `${i + 1}. ${t.name}: ${t.description}`).join("\n")}

Respond in JSON format:
{
  "tools": ["tool1", "tool2"],
  "needsChart": true/false,
  "chartType": "line" or "bar" or null,
  "reasoning": "brief explanation"
}`;

    const analysisResult = await model.generateContent(analysisPrompt);
    const analysisText = analysisResult.response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: simple keyword matching
        analysis = simpleQueryAnalysis(query);
      }
    } catch (e) {
      analysis = simpleQueryAnalysis(query);
    }

    // Execute the determined tools
    const toolResults: any = {};
    for (const toolName of analysis.tools || []) {
      const tool = healthTools.find((t) => t.name === toolName);
      if (tool) {
        const result = await tool.execute();
        toolResults[toolName] = result;
      }
    }

    // Generate response with health data context
    const responsePrompt = `You are a friendly health assistant. The user asked: "${query}"

Health data retrieved:
${JSON.stringify(toolResults, null, 2)}

Provide a friendly, conversational response about their health data. Be specific with numbers and provide insights. Keep it concise (2-3 sentences).`;

    const responseResult = await model.generateContent(responsePrompt);
    const responseText = responseResult.response.text();

    // Prepare chart data if needed
    let chartData = null;
    if (analysis.needsChart && Object.keys(toolResults).length > 0) {
      chartData = prepareChartData(toolResults, analysis.chartType);
    }

    return {
      text: responseText,
      chartData,
    };
  } catch (error) {
    console.error("Error processing health query:", error);
    return {
      text: "I'm having trouble accessing the health data right now. Please make sure you've granted health permissions and try again.",
    };
  }
}

// Fallback simple analysis based on keywords
function simpleQueryAnalysis(query: string) {
  const lowerQuery = query.toLowerCase();
  const tools: string[] = [];
  let needsChart = false;
  let chartType: "line" | "bar" | null = null;

  if (lowerQuery.includes("step")) {
    if (lowerQuery.includes("week") || lowerQuery.includes("7 day")) {
      tools.push("getStepsLastWeek");
      needsChart = true;
      chartType = "bar";
    } else {
      tools.push("getStepsToday");
    }
  }

  if (lowerQuery.includes("heart") || lowerQuery.includes("pulse")) {
    if (lowerQuery.includes("week") || lowerQuery.includes("7 day")) {
      tools.push("getHeartRateLastWeek");
      needsChart = true;
      chartType = "line";
    } else {
      tools.push("getHeartRateToday");
    }
  }

  if (lowerQuery.includes("calorie") || lowerQuery.includes("burn")) {
    tools.push("getCaloriesToday");
  }

  if (lowerQuery.includes("sleep")) {
    if (lowerQuery.includes("week") || lowerQuery.includes("7 day")) {
      tools.push("getSleepLastWeek");
      needsChart = true;
      chartType = "bar";
    } else {
      tools.push("getSleepToday");
    }
  }

  if (lowerQuery.includes("distance") || lowerQuery.includes("walk") || lowerQuery.includes("run")) {
    tools.push("getDistanceToday");
  }

  // Default to today's summary if no specific query
  if (tools.length === 0) {
    tools.push("getStepsToday", "getCaloriesToday", "getHeartRateToday", "getSleepToday");
  }

  return { tools, needsChart, chartType, reasoning: "Keyword-based analysis" };
}

// Prepare chart data from health results
function prepareChartData(toolResults: any, chartType: "line" | "bar" | null) {
  console.log("Preparing chart data from:", JSON.stringify(toolResults, null, 2));
  
  // Get all successful results
  const successfulResults = Object.entries(toolResults)
    .filter(([_, result]: [string, any]) => result?.success && result?.data)
    .map(([name, result]: [string, any]) => ({ name, ...result }));

  if (successfulResults.length === 0) {
    console.log("No successful results to chart");
    return null;
  }

  // Try to find result with samples array (for trends)
  const resultWithSamples = successfulResults.find((r: any) => 
    r.data.samples && Array.isArray(r.data.samples) && r.data.samples.length > 0
  );

  if (resultWithSamples) {
    const allSamples = resultWithSamples.data.samples;
    console.log("Found samples:", allSamples.length);
    
    if (allSamples.length === 0) {
      return null;
    }

    // Determine chart type and title based on tool name
    let title = "Health Data";
    let color = "#0000FF";
    let type: "line" | "bar" = chartType || "bar";

    if (resultWithSamples.name.includes("Steps")) {
      title = "Steps - Last 7 Days";
      color = "#FF8904";
      type = "bar";
    } else if (resultWithSamples.name.includes("HeartRate")) {
      title = "Heart Rate Trend";
      color = "#FF6467";
      type = "line";
    } else if (resultWithSamples.name.includes("Sleep")) {
      title = "Sleep Duration - Last 7 Days";
      color = "#21BCFF";
      type = "bar";
    }

    // Group sleep data by day if needed
    let labels: string[] = [];
    let chartDatasets: number[] = [];

    if (resultWithSamples.name.includes("Sleep")) {
      // Aggregate sleep by END day (sleep that ends on a day counts for that day)
      // This handles sleep that crosses midnight properly
      const sleepByDay: { [key: string]: number } = {};
      
      console.log(`Processing ${allSamples.length} sleep samples`);
      
      allSamples.forEach((s: any) => {
        if (s.value !== "AWAKE") {
          // Use END date for grouping (when sleep session ended)
          const endDate = new Date(s.endDate);
          const dayKey = format(endDate, "yyyy-MM-dd");
          
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          const durationHours = (end - start) / (1000 * 60 * 60);
          
          console.log(`Sleep: ${dayKey} duration: ${durationHours.toFixed(2)}h start: ${new Date(s.startDate).toISOString()} end: ${new Date(s.endDate).toISOString()}`);
          
          sleepByDay[dayKey] = (sleepByDay[dayKey] || 0) + durationHours;
        }
      });

      console.log("Sleep aggregated by day:", sleepByDay);

      // Get unique days from data
      const uniqueDays = Object.keys(sleepByDay).sort();
      console.log(`Found sleep data for ${uniqueDays.length} unique days:`, uniqueDays);

      // Only show days that have data, don't backfill empty days
      labels = uniqueDays.map(day => format(new Date(day), "MMM dd"));
      chartDatasets = uniqueDays.map(day => Math.round((sleepByDay[day] || 0) * 10) / 10);
    } else {
      // For other metrics, limit to last 7 samples and show their dates
      const samples = allSamples.slice(-7);
      
      labels = samples.map((s: any) => {
        if (s.startDate) {
          const date = new Date(s.startDate);
          return format(date, "MMM dd");
        }
        return `Sample ${samples.indexOf(s) + 1}`;
      });

      chartDatasets = samples.map((s: any) => {
        if (typeof s.value === 'number') return Math.round(s.value);
        if (s.quantity) return Math.round(s.quantity);
        return 0;
      });
    }

    // Only create chart if we have data
    if (labels.length === 0 || !chartDatasets.some(d => d > 0)) {
      console.log("No valid chart data after processing");
      return null;
    }

    const chartData = {
      type,
      title,
      data: {
        labels,
        datasets: [
          {
            data: chartDatasets,
          },
        ],
      },
      color,
    };

    console.log("Chart data prepared:", JSON.stringify(chartData, null, 2));
    return chartData;
  }

  // If no samples, but we have multiple data points, create a summary chart
  if (successfulResults.length > 1) {
    const labels: string[] = [];
    const data: number[] = [];

    successfulResults.forEach((result: any) => {
      if (result.name.includes("Steps")) {
        labels.push("Steps");
        data.push(Math.round(result.data.steps || 0));
      } else if (result.name.includes("Calories")) {
        labels.push("Calories");
        data.push(Math.round(result.data.calories || 0));
      } else if (result.name.includes("HeartRate") && result.data.average) {
        labels.push("Heart Rate");
        data.push(Math.round(result.data.average));
      } else if (result.name.includes("Sleep") && result.data.totalHours) {
        labels.push("Sleep (hrs)");
        data.push(Math.round(result.data.totalHours * 10) / 10);
      }
    });

    if (labels.length > 0 && data.some(d => d > 0)) {
      return {
        type: "bar",
        title: "Today's Summary",
        data: {
          labels,
          datasets: [{ data }],
        },
        color: "#0000FF",
      };
    }
  }

  console.log("No chart data could be prepared");
  return null;
}
