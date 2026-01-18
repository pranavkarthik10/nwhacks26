import * as HealthService from "@/services/healthDataService";
import { format, subDays } from "date-fns";
import { llmService, generateText } from "@/services/llmService";

interface HealthQueryResponse {
  text: string;
  chartData?: any;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
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
export async function processHealthQuery(
  query: string, 
  conversationHistory: ConversationMessage[] = []
): Promise<HealthQueryResponse> {
  try {
    // Initialize LLM service
    await llmService.initialize();

    console.log(`🔍 Processing query with ${conversationHistory.length} previous messages`);
    if (conversationHistory.length > 0) {
      console.log("Recent context:", conversationHistory.slice(-2));
    }

    // Build conversation context for tool selection
    let contextSummary = "";
    if (conversationHistory.length > 0) {
      // Include last 3 messages for context
      const recentMessages = conversationHistory.slice(-3);
      contextSummary = "\n\nRecent conversation:\n" + 
        recentMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    }

    // First, analyze the query to determine which health data to fetch
    const analysisPrompt = `You are a health data assistant. Analyze this user query and determine which health metrics they want to see:
    
Query: "${query}"${contextSummary}

Available tools:
${healthTools.map((t, i) => `${i + 1}. ${t.name}: ${t.description}`).join("\n")}

Respond in JSON format ONLY (no markdown, no explanation):
{
  "tools": ["tool1", "tool2"],
  "needsChart": true/false,
  "chartType": "line" or "bar" or null,
  "reasoning": "brief explanation"
}`;

    const analysisText = await generateText(analysisPrompt);
    
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

    // Build system prompt with raw health data (sent only once, not repeated in history)
    const hasData = Object.keys(toolResults).length > 0;
    const dataContext = hasData 
      ? `\n\n=== HEALTH DATA ===\n${JSON.stringify(toolResults, null, 2)}\n\nUse this data to answer the user's question with specific numbers and insights.`
      : "";

    const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      {
        role: "system",
        content: `You are Lora, a friendly health assistant. Provide conversational responses about health data. Be specific with numbers and provide insights. Keep responses concise (2-3 sentences). Remember the conversation context and refer back to previous messages when relevant.${dataContext}`
      }
    ];

    // Add conversation history (limit to recent messages to manage token count)
    // The conversation history already includes the current query as the last message
    // Can include more history now since health data is only in system prompt, not repeated
    const recentHistory = conversationHistory.slice(-8);
    recentHistory.forEach(msg => {
      chatMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

    console.log(`💬 Sending ${chatMessages.length} messages to LLM (1 system w/ health data + ${recentHistory.length} chat)`);

    const responseText = await llmService.chat(chatMessages);

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

    // Determine chart type and base info based on tool name
    let titlePrefix = "Health Data";
    let color = "#0000FF";
    let type: "line" | "bar" = chartType || "bar";

    if (resultWithSamples.name.includes("Steps")) {
      titlePrefix = "Steps";
      color = "#FF8904";
      type = "bar";
    } else if (resultWithSamples.name.includes("HeartRate")) {
      titlePrefix = "Heart Rate Trend";
      color = "#FF6467";
      type = "line";
    } else if (resultWithSamples.name.includes("Sleep")) {
      titlePrefix = "Sleep Duration";
      color = "#21BCFF";
      type = "bar";
    }

    // Group sleep data by day if needed
    let labels: string[] = [];
    let chartDatasets: number[] = [];
    let numDays = 0;

    if (resultWithSamples.name.includes("Sleep")) {
      // Aggregate sleep by END day (sleep that ends on a day counts for that day)
      // This handles sleep that crosses midnight properly
      // Group sleep samples by day, then merge overlaps to avoid double-counting
      const sleepSamplesByDay: { [key: string]: Array<{ start: number; end: number }> } = {};
      
      console.log(`Processing ${allSamples.length} sleep samples`);
      
      // First, group all sleep samples by their END date
      allSamples.forEach((s: any) => {
        if (s.value !== "AWAKE") {
          const endDate = new Date(s.endDate);
          const dayKey = format(endDate, "yyyy-MM-dd");
          
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          
          if (!sleepSamplesByDay[dayKey]) {
            sleepSamplesByDay[dayKey] = [];
          }
          sleepSamplesByDay[dayKey].push({ start, end });
          
          console.log(`Sleep: ${dayKey} start: ${new Date(s.startDate).toISOString()} end: ${new Date(s.endDate).toISOString()}`);
        }
      });

      // Now merge overlapping sleep periods for each day
      const sleepByDay: { [key: string]: number } = {};
      Object.keys(sleepSamplesByDay).forEach(dayKey => {
        const ranges = sleepSamplesByDay[dayKey];
        
        // Sort by start time
        ranges.sort((a, b) => a.start - b.start);
        
        // Merge overlapping ranges
        const merged: Array<{ start: number; end: number }> = [ranges[0]];
        for (let i = 1; i < ranges.length; i++) {
          const current = ranges[i];
          const lastMerged = merged[merged.length - 1];
          
          if (current.start <= lastMerged.end) {
            // Overlapping, extend the last merged range
            lastMerged.end = Math.max(lastMerged.end, current.end);
          } else {
            // No overlap, add as new range
            merged.push(current);
          }
        }
        
        // Calculate total hours from merged ranges
        const totalMs = merged.reduce((sum, range) => sum + (range.end - range.start), 0);
        const totalHours = totalMs / (1000 * 60 * 60);
        sleepByDay[dayKey] = totalHours;
        
        console.log(`Sleep for ${dayKey}: ${ranges.length} samples -> ${merged.length} merged -> ${totalHours.toFixed(2)}h`);
      });

      console.log("Sleep aggregated by day:", sleepByDay);

      // Get unique days from data
      const uniqueDays = Object.keys(sleepByDay).sort();
      console.log(`Found sleep data for ${uniqueDays.length} unique days:`, uniqueDays);

      // Only show days that have data, don't backfill empty days
      labels = uniqueDays.map(day => format(new Date(day), "MMM dd"));
      chartDatasets = uniqueDays.map(day => Math.round((sleepByDay[day] || 0) * 10) / 10);
      numDays = uniqueDays.length;
    } else if (resultWithSamples.name.includes("Steps")) {
      // For steps, the samples should already be daily aggregates from getDailySteps
      // Each sample should have: {value: number, startDate: string, endDate: string}
      // Group by day to ensure we have daily totals
      const stepsByDay: { [key: string]: number } = {};
      
      allSamples.forEach((s: any) => {
        if (s.startDate && (s.value !== undefined || s.quantity !== undefined)) {
          const dayKey = format(new Date(s.startDate), "yyyy-MM-dd");
          const stepValue = s.value !== undefined ? s.value : s.quantity;
          
          // Aggregate steps for the same day (in case there are multiple entries)
          if (stepsByDay[dayKey]) {
            stepsByDay[dayKey] += stepValue;
          } else {
            stepsByDay[dayKey] = stepValue;
          }
        }
      });
      
      // Get sorted days
      const uniqueDays = Object.keys(stepsByDay).sort();
      console.log(`Found steps data for ${uniqueDays.length} unique days:`, uniqueDays);
      
      labels = uniqueDays.map(day => format(new Date(day), "MMM dd"));
      chartDatasets = uniqueDays.map(day => Math.round(stepsByDay[day] || 0));
      numDays = uniqueDays.length;
    } else {
      // For other metrics (heart rate, etc.), show individual samples
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
      numDays = samples.length;
    }

    // Only create chart if we have data
    if (labels.length === 0 || !chartDatasets.some(d => d > 0)) {
      console.log("No valid chart data after processing");
      return null;
    }

    // Create dynamic title based on number of days
    let title = titlePrefix;
    if (resultWithSamples.name.includes("Steps") || resultWithSamples.name.includes("Sleep")) {
      if (numDays === 1) {
        title += " - Today";
      } else if (numDays > 1) {
        title += ` - Last ${numDays} Day${numDays > 1 ? 's' : ''}`;
      }
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
