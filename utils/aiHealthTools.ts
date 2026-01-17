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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
  const firstResult = Object.values(toolResults)[0] as any;
  
  if (!firstResult?.success || !firstResult?.data) {
    return null;
  }

  // Handle daily step samples
  if (firstResult.data.samples && Array.isArray(firstResult.data.samples)) {
    const samples = firstResult.data.samples.slice(0, 7); // Last 7 days
    
    return {
      type: chartType || "bar",
      title: "Last 7 Days",
      data: {
        labels: samples.map((s: any) => {
          const date = new Date(s.startDate);
          return format(date, "MMM dd");
        }),
        datasets: [
          {
            data: samples.map((s: any) => s.value || 0),
          },
        ],
      },
      color: "#0000FF",
    };
  }

  // Handle heart rate data with multiple samples
  if (firstResult.data.samples && firstResult.data.average !== undefined) {
    const samples = firstResult.data.samples.slice(0, 10); // Last 10 readings
    
    return {
      type: "line",
      title: "Heart Rate",
      data: {
        labels: samples.map((_: any, i: number) => `${i + 1}`),
        datasets: [
          {
            data: samples.map((s: any) => s.value || 0),
          },
        ],
      },
      color: "#FF6467",
    };
  }

  return null;
}
