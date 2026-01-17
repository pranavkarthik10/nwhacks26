// Health data types for the app

export interface HealthMetric {
  value: number;
  startDate: string;
  endDate: string;
  unit?: string;
}

export interface StepsData {
  steps: number;
  date: string;
}

export interface HeartRateData {
  average: number;
  min: number;
  max: number;
  samples: HealthMetric[];
}

export interface SleepData {
  totalHours: number;
  samples: HealthMetric[];
}

export interface CaloriesData {
  calories: number;
  samples: HealthMetric[];
}

export interface DistanceData {
  distance: number;
  unit: string;
}

export interface ChartData {
  type: "line" | "bar";
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
    }>;
  };
  color?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  chartData?: ChartData;
  timestamp: Date;
}

export interface HealthQueryResponse {
  text: string;
  chartData?: ChartData;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type HealthToolName =
  | "getStepsToday"
  | "getStepsLastWeek"
  | "getCaloriesToday"
  | "getHeartRateToday"
  | "getHeartRateLastWeek"
  | "getSleepToday"
  | "getSleepLastWeek"
  | "getDistanceToday";
