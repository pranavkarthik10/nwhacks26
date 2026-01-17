import { Platform, NativeModules } from "react-native";
import AppleHealthKit, {
  HealthInputOptions,
  HealthValue,
} from "react-native-health";

const RCTAppleHealthKit = NativeModules.RCTAppleHealthKit;

export interface HealthDataResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Get steps for a date range
export async function getSteps(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getStepCount(options, (err: any, results: any) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        resolve({ success: true, data: { steps: results.value, ...results } });
      }
    });
  });
}

// Get daily step samples
export async function getDailySteps(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getDailyStepCountSamples(options, (err: any, results: any[]) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        resolve({ success: true, data: results });
      }
    });
  });
}

// Get calories burned
export async function getCalories(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getActiveEnergyBurned(options, (err: any, results: any[]) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        const totalCalories = results.reduce((sum, sample) => sum + sample.value, 0);
        resolve({ success: true, data: { calories: totalCalories, samples: results } });
      }
    });
  });
}

// Get heart rate samples
export async function getHeartRate(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getHeartRateSamples(options, (err: any, results: HealthValue[]) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        const avgHeartRate = results.length > 0 
          ? results.reduce((sum, sample) => sum + sample.value, 0) / results.length 
          : 0;
        resolve({ 
          success: true, 
          data: { 
            average: avgHeartRate, 
            samples: results,
            min: Math.min(...results.map(s => s.value)),
            max: Math.max(...results.map(s => s.value))
          } 
        });
      }
    });
  });
}

// Get sleep data
export async function getSleep(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getSleepSamples(options, (err: any, results: HealthValue[]) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        let totalSleepMs = 0;
        results.forEach((sample) => {
          if (sample.value !== "AWAKE") {
            const start = new Date(sample.startDate).getTime();
            const end = new Date(sample.endDate).getTime();
            totalSleepMs += end - start;
          }
        });
        
        const totalHours = totalSleepMs / (1000 * 60 * 60);
        resolve({ 
          success: true, 
          data: { 
            totalHours, 
            samples: results 
          } 
        });
      }
    });
  });
}

// Get distance walked/run
export async function getDistance(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getDistanceWalkingRunning(options, (err: any, results: any) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        resolve({ success: true, data: { distance: results.value, unit: "meters", ...results } });
      }
    });
  });
}

// Get workout data
export async function getWorkouts(dateRange: DateRange): Promise<HealthDataResponse> {
  if (Platform.OS !== "ios" || !RCTAppleHealthKit) {
    return { success: false, error: "HealthKit not available" };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    RCTAppleHealthKit.getSamples(options, (err: any, results: any[]) => {
      if (err) {
        resolve({ success: false, error: err });
      } else {
        resolve({ success: true, data: results });
      }
    });
  });
}

// Helper function to format dates
export function getDateRange(days: number = 1): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function getTodayRange(): DateRange {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  return {
    startDate: startOfDay.toISOString(),
    endDate: today.toISOString(),
  };
}
