import { useEffect, useState } from "react";
import { Platform, NativeModules } from "react-native";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
  HealthValue,
} from "react-native-health";

const RCTAppleHealthKit = NativeModules.RCTAppleHealthKit;

// Permissions mapping
const PERMISSIONS = AppleHealthKit.Constants?.Permissions ?? {
  ActiveEnergyBurned: "ActiveEnergyBurned",
  Steps: "Steps",
  HeartRate: "HeartRate",
  SleepAnalysis: "SleepAnalysis",
};

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      PERMISSIONS.ActiveEnergyBurned,
      PERMISSIONS.Steps,
      PERMISSIONS.HeartRate,
      PERMISSIONS.SleepAnalysis,
    ],
    write: [],
  },
};

const useHealthData = (date: Date) => {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [heartRate, setHeartRate] = useState<HealthValue[]>([]);
  const [sleep, setSleep] = useState<HealthValue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);

  // Guard: ensure platform + native module
  const ensureHealthKitAvailable = (): boolean => {
    if (Platform.OS !== "ios") {
      setError("HealthKit is only available on iOS");
      return false;
    }
    if (!RCTAppleHealthKit) {
      setError("Native HealthKit module not available");
      return false;
    }
    return true;
  };

  // Check/request permissions before any fetch
  const checkAndRequestPermissions = (callback: () => void) => {
    if (!ensureHealthKitAvailable()) return;

    console.log("Checking HealthKit permissions...");
    RCTAppleHealthKit.getAuthStatus(permissions, (err: string, results: any) => {
      if (err) {
        setError(`Error checking permissions: ${err}`);
        console.error("Error checking permissions:", err);
        return;
      }

      console.log("Permission status:", results);
      const readPermissions = permissions.permissions.read;
      const allGranted = readPermissions.every(
        (perm) => results[perm] === 2 // 2 = authorized
      );

      if (allGranted) {
        console.log("All permissions granted ✅");
        setHasPermissions(true);
        callback();
      } else {
        console.log("Requesting HealthKit permissions...");
        RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
          if (initErr) {
            setError(`Error initializing HealthKit: ${initErr}`);
            console.error("Error initializing HealthKit:", initErr);
            return;
          }
          console.log("HealthKit initialized ✅");
          setHasPermissions(true);
          callback();
        });
      }
    });
  };

  // Fetch data once permissions are confirmed
  const fetchData = (fetchOptions: HealthInputOptions) => {
    if (!ensureHealthKitAvailable()) return;
    if (!hasPermissions) {
      setError("Health permissions not granted");
      return;
    }

    setSuccess(false);
    setError(null);

    let completedFetches = 0;
    let successfulFetches = 0;
    let fetchErrors: string[] = [];
    const totalFetches = 4;

    const checkCompletion = () => {
      completedFetches++;
      console.log(`Health fetch progress: ${completedFetches}/${totalFetches}, ${successfulFetches} successful`);
      
      if (completedFetches === totalFetches) {
        console.log(`All fetches complete! ${successfulFetches}/${totalFetches} successful`);
        
        if (successfulFetches > 0) {
          setSuccess(true);
          // Only set error if ALL fetches failed
          if (successfulFetches === 0) {
            setError(`Failed to fetch: ${fetchErrors.join(", ")}`);
          } else if (fetchErrors.length > 0) {
            console.warn(`Some fetches failed: ${fetchErrors.join(", ")}`);
          }
        } else {
          setError(fetchErrors.length > 0 ? `Failed to fetch: ${fetchErrors.join(", ")}` : "Failed to fetch health data");
        }
        setDataTimestamp(new Date().toISOString());
      }
    };

    // Steps
    RCTAppleHealthKit.getStepCount(fetchOptions, (err: any, results: any) => {
      if (err) {
        console.warn("Error fetching steps:", err);
        fetchErrors.push("steps");
      } else {
        setSteps(results.value || 0);
        successfulFetches++;
      }
      checkCompletion();
    });

    // Calories
    RCTAppleHealthKit.getActiveEnergyBurned(
      fetchOptions,
      (err: any, results: any[]) => {
        if (err) {
          console.warn("Error fetching calories:", err);
          fetchErrors.push("calories");
        } else {
          setCalories(results.reduce((sum, sample) => sum + sample.value, 0) || 0);
          successfulFetches++;
        }
        checkCompletion();
      }
    );

    // Heart Rate
    RCTAppleHealthKit.getHeartRateSamples(
      fetchOptions,
      (err: any, results: HealthValue[]) => {
        if (err) {
          console.warn("Error fetching heart rate:", err);
          fetchErrors.push("heart rate");
        } else {
          setHeartRate(results || []);
          successfulFetches++;
        }
        checkCompletion();
      }
    );

    // Sleep
    RCTAppleHealthKit.getSleepSamples(
      fetchOptions,
      (err: any, results: HealthValue[]) => {
        if (err) {
          console.warn("Error fetching sleep:", err);
          fetchErrors.push("sleep");
        } else {
          setSleep(results || []);
          successfulFetches++;
        }
        checkCompletion();
      }
    );
  };

  // Core trigger function
  const triggerFetch = () => {
    const options: HealthInputOptions = {
      date: date.toISOString(),
      startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
      endDate: date.toISOString(),
    };

    checkAndRequestPermissions(() => fetchData(options));
  };

  // Hook API
  return {
    steps,
    calories,
    heartRate,
    sleep,
    error,
    hasPermissions,
    success,
    dataTimestamp,
    onPress: triggerFetch,
    refetch: triggerFetch,
  };
};

export default useHealthData;
