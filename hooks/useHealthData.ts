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
        console.warn("Error checking permissions (this is normal on first run):", err);
        // On first run, auth status check might fail - proceed to init
        console.log("Initializing HealthKit for first time...");
        RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
          if (initErr) {
            setError(`Error initializing HealthKit: ${initErr}`);
            console.error("Error initializing HealthKit:", initErr);
            return;
          }
          console.log("HealthKit initialized ✅");
          setHasPermissions(true);
          setError(null); // Clear any previous errors
          callback();
        });
        return;
      }

      console.log("Permission status:", results);
      const readPermissions = permissions.permissions.read;
      const allGranted = readPermissions.every(
        (perm) => results[perm] === 2 // 2 = authorized
      );

      if (allGranted) {
        console.log("All permissions already granted ✅");
        setHasPermissions(true);
        setError(null); // Clear any previous errors
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
          setError(null); // Clear any previous errors
          callback();
        });
      }
    });
  };

  // Fetch data once permissions are confirmed
  // skipPermissionCheck allows bypassing the stale state check when called right after setHasPermissions
  const fetchData = (fetchOptions: HealthInputOptions, skipPermissionCheck = false) => {
    if (!ensureHealthKitAvailable()) return;
    if (!skipPermissionCheck && !hasPermissions) {
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
        setDataTimestamp(new Date().toISOString());
        
        if (successfulFetches > 0) {
          // We got at least some data - success!
          setSuccess(true);
          setError(null); // Clear any error if we got data
          if (fetchErrors.length > 0) {
            console.warn(`Some fetches failed, but got ${successfulFetches} successful: ${fetchErrors.join(", ")}`);
          }
        } else {
          // All fetches failed - set error
          setSuccess(false);
          setError(fetchErrors.length > 0 ? `Failed to fetch: ${fetchErrors.join(", ")}` : "Failed to fetch health data");
        }
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

  // Core trigger function for manual refresh/button press
  const triggerFetch = () => {
    console.log("Manual fetch triggered (button press or refresh)");
    setError(null); // Clear any previous errors before fetching
    
    const options: HealthInputOptions = {
      date: date.toISOString(),
      startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
      endDate: date.toISOString(),
    };

    // Use same logic as auto-fetch, no error dialogs
    if (!ensureHealthKitAvailable()) {
      return;
    }

    RCTAppleHealthKit.getAuthStatus(permissions, (err: string, results: any) => {
      if (err) {
        console.log("Requesting HealthKit permissions for manual fetch...");
        RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
          if (!initErr) {
            setHasPermissions(true);
            setError(null);
            fetchData(options, true); // Skip permission check since we just set it
          } else {
            console.error("Error during permission init:", initErr);
            setError("Unable to access HealthKit");
          }
        });
      } else {
        const readPermissions = permissions.permissions.read;
        const allGranted = readPermissions.every((perm) => results[perm] === 2);
        
        if (allGranted) {
          console.log("Permissions already exist, fetching...");
          setHasPermissions(true);
          setError(null);
          fetchData(options, true); // Skip permission check since we just set it
        } else {
          console.log("Requesting full HealthKit permissions...");
          RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
            if (!initErr) {
              setHasPermissions(true);
              setError(null);
              fetchData(options, true); // Skip permission check since we just set it
            } else {
              console.error("Error during permission init:", initErr);
              setError("Unable to access HealthKit");
            }
          });
        }
      }
    });
  };

  // Auto-fetch on mount - check permissions first silently
  useEffect(() => {
    console.log("useHealthData mounted, checking permissions...");
    
    if (!ensureHealthKitAvailable()) {
      console.log("HealthKit not available on this platform");
      return;
    }

    // Check if we already have permissions without showing errors
    RCTAppleHealthKit.getAuthStatus(permissions, (err: string, results: any) => {
      if (err) {
        console.log("First time - permissions not yet granted, requesting...");
        // First time, request permissions
        RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
          if (!initErr) {
            console.log("HealthKit permissions granted, fetching data...");
            setHasPermissions(true);
            setError(null);
            // Fetch after permissions granted
            const options: HealthInputOptions = {
              date: date.toISOString(),
              startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
              endDate: date.toISOString(),
            };
            fetchData(options, true); // Skip permission check since we just set it
          } else {
            console.error("Error during permission init:", initErr);
          }
        });
      } else {
        // Permissions already exist, just fetch
        const readPermissions = permissions.permissions.read;
        const allGranted = readPermissions.every((perm) => results[perm] === 2);
        
        if (allGranted) {
          console.log("Permissions already granted, fetching data...");
          setHasPermissions(true);
          setError(null);
          const options: HealthInputOptions = {
            date: date.toISOString(),
            startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
            endDate: date.toISOString(),
          };
          fetchData(options, true); // Skip permission check since we just set it
        } else {
          console.log("Permissions partially granted, requesting full permissions...");
          RCTAppleHealthKit.initHealthKit(permissions, (initErr: string) => {
            if (!initErr) {
              setHasPermissions(true);
              setError(null);
              const options: HealthInputOptions = {
                date: date.toISOString(),
                startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
                endDate: date.toISOString(),
              };
              fetchData(options, true); // Skip permission check since we just set it
            }
          });
        }
      }
    });
  }, []);

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
