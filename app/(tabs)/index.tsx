import useHealthData from "@/hooks/useHealthData";
import { WeeklyTrends } from "@/components/WeeklyTrends";
import React, { useEffect } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  const date = new Date();
  const {
    steps,
    calories,
    heartRate,
    sleep,
    error,
    success,
    hasPermissions,
    dataTimestamp,
    onPress,
    refetch,
  } = useHealthData(date);

  console.log(steps, calories, heartRate, sleep, dataTimestamp);
  console.log("Success: ", success);
  console.log("Error: ", error);
  console.log("Permission: ", hasPermissions);

  // Get latest heart rate
  const getLatestHeartRate = (heartRate: any[]) => {
    if (!heartRate.length) return "--";
    const sorted = [...heartRate].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    return sorted[0].value;
  };

  // Calculate total sleep duration (in hours) for TODAY only
  // Only count sleep that ended TODAY (handles midnight crossings)
  // Merges overlapping sleep periods to avoid double-counting
  const getTotalSleep = (sleepSamples: any[]) => {
    if (!sleepSamples.length) return "--";

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

    // Filter and convert sleep samples to time ranges
    const sleepRanges: Array<{ start: number; end: number }> = [];
    sleepSamples.forEach((sample) => {
      if (sample.value !== "AWAKE") {
        const endTime = new Date(sample.endDate).getTime();
        
        // Only count if sleep ended today
        if (endTime >= todayStart && endTime < todayEnd) {
          const start = new Date(sample.startDate).getTime();
          const end = endTime;
          sleepRanges.push({ start, end });
        }
      }
    });

    if (sleepRanges.length === 0) return "--";

    // Sort by start time
    sleepRanges.sort((a, b) => a.start - b.start);

    // Merge overlapping ranges to avoid double-counting
    const merged: Array<{ start: number; end: number }> = [sleepRanges[0]];
    
    for (let i = 1; i < sleepRanges.length; i++) {
      const current = sleepRanges[i];
      const lastMerged = merged[merged.length - 1];
      
      // If current overlaps with last merged, extend the last merged
      if (current.start <= lastMerged.end) {
        lastMerged.end = Math.max(lastMerged.end, current.end);
      } else {
        // No overlap, add as new range
        merged.push(current);
      }
    }

    // Calculate total duration from merged ranges
    let totalMs = 0;
    merged.forEach(range => {
      totalMs += range.end - range.start;
    });

    const hours = totalMs / (1000 * 60 * 60);
    return hours === 0 ? "--" : hours.toFixed(1); // e.g. "7.5"
  };

  // Track if we've shown alerts to prevent duplicates
  const hasShownErrorRef = React.useRef(false);
  const hasShownNoDataRef = React.useRef(false);

  useEffect(() => {
    // Only show error if: we have an error AND NO success (all fetches failed)
    // Don't show if we have success (some data loaded successfully)
    if (error && !success && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      console.log("Showing error alert:", error);
      Alert.alert("Cannot fetch health data", error || "Please try again!", [
        {
          text: "Try Again",
          onPress: () => {
            hasShownErrorRef.current = false;
            refetch();
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            hasShownErrorRef.current = false;
          },
        },
      ]);
    }
    // Reset if successful
    if (success) {
      hasShownErrorRef.current = false;
    }
  }, [error, success]);

  useEffect(() => {
    if (success && hasPermissions && !hasShownNoDataRef.current) {
      if (
        steps === 0 &&
        calories === 0 &&
        heartRate.length === 0 &&
        sleep.length === 0
      ) {
        hasShownNoDataRef.current = true;
        Alert.alert(
          "No Health Data Available",
          "Open the Apple Health app to view or add your health data for today.",
          [
            {
              text: "Go to Health",
              onPress: () => {
                Linking.openURL("x-apple-health://");
                hasShownNoDataRef.current = false;
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                hasShownNoDataRef.current = false;
              },
            },
          ]
        );
      } else {
        // Reset if we have data
        hasShownNoDataRef.current = false;
      }
    }
  }, [success, hasPermissions, steps, calories, heartRate, sleep])

  const handleRevokeAccess = async () => {
    try {
      const settingsUrl = "app-settings:";
      const supported = await Linking.canOpenURL(settingsUrl);
      if (supported) {
        await Linking.openURL(settingsUrl);
      } else {
        await Linking.openURL("app-settings:");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to open Settings. Please go to Settings > Health > Data Access & Devices > MyHealthApp."
      );
      console.error("Error opening Settings:", error);
    }
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      "Reset Onboarding",
      "This will clear all saved data and return to onboarding",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              router.replace("/onboarding/welcome");
            } catch (error) {
              Alert.alert("Error", "Failed to reset onboarding");
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Not synced";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatNumber = (num: any) => {
    if (!num || num === "--") return "--";
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return "--";
    // Remove trailing zeros and unnecessary decimals
    return parsed.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  };

  const SyncDataView = () => (
    <ScrollView style={styles.syncDataView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>Your Health</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
      </View>

      {/* Last Update */}
      <View style={styles.lastUpdateContainer}>
        <View style={styles.statusIndicator} />
        <Text style={styles.lastUpdateText}>
          Last synced at {formatTimestamp(dataTimestamp)}
        </Text>
      </View>

      {/* Health Cards */}
      <View style={styles.cardsContainer}>
        <TouchableOpacity style={[styles.cardLarge, { backgroundColor: "#FF9500" }]} activeOpacity={0.9}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="footsteps" size={24} color="#FF9500" />
            </View>
            <Text style={styles.cardLabel}>Steps</Text>
          </View>
            <Text style={styles.cardValue}>{formatNumber(steps)}</Text>
          <Text style={styles.cardUnit}>steps today</Text>
        </TouchableOpacity>

        <View style={styles.cardRow}>
          <TouchableOpacity style={[styles.cardSmall, { backgroundColor: "#FF2D55" }]} activeOpacity={0.9}>
            <View style={styles.cardIconBg}>
              <Ionicons name="heart" size={20} color="#FF2D55" />
            </View>
            <Text style={styles.cardValueSmall}>{formatNumber(getLatestHeartRate(heartRate))}</Text>
            <Text style={styles.cardUnitSmall}>BPM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cardSmall, { backgroundColor: "#FF3B30" }]} activeOpacity={0.9}>
            <View style={styles.cardIconBg}>
              <MaterialIcons name="local-fire-department" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.cardValueSmall}>{formatNumber(calories)}</Text>
            <Text style={styles.cardUnitSmall}>kcal</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.cardLarge, { backgroundColor: "#5856D6" }]} activeOpacity={0.9}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="moon" size={24} color="#5856D6" />
            </View>
            <Text style={styles.cardLabel}>Sleep</Text>
          </View>
            <Text style={styles.cardValue}>{formatNumber(getTotalSleep(sleep))}</Text>
          <Text style={styles.cardUnit}>hours last night</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Trends */}
      <WeeklyTrends steps={steps} sleep={getTotalSleep(sleep)} heartRate={heartRate} />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const NoDataView = () => (
    <View style={styles.noDataView}>
      <View style={styles.noDataContent}>
        <View style={styles.noDataIcon}>
          <Ionicons name="heart-outline" size={64} color="#007AFF" />
        </View>
        <Text style={styles.noDataTitle}>Connect Health Data</Text>
        <Text style={styles.noDataSubtitle}>
          Sync with Apple Health to see your steps, heart rate, sleep, and more.
        </Text>
        <TouchableOpacity style={styles.syncBtn} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name="sync" size={20} color="#fff" />
          <Text style={styles.syncBtnText}>Connect Health</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const BottomActions = () => (
    <View style={styles.bottomActions}>
      <TouchableOpacity style={styles.refreshBtn} onPress={refetch} activeOpacity={0.8}>
        <Ionicons name="refresh" size={22} color="#007AFF" />
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => {
          Alert.alert(
            "Health Settings",
            "Manage your health data permissions",
            [
              { text: "Open Settings", onPress: handleRevokeAccess },
              { text: "Reset Onboarding", onPress: handleResetOnboarding, style: "destructive" },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="settings-outline" size={22} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      {hasPermissions && success && !error ? SyncDataView() : NoDataView()}
      {hasPermissions && success && !error ? BottomActions() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  
  // Sync Data View
  syncDataView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingTop: 60,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 4,
  },
  lastUpdateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
    marginRight: 8,
  },
  lastUpdateText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  
  // Cards
  cardsContainer: {
    gap: 12,
  },
  cardLarge: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardSmall: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  cardValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1,
  },
  cardValueSmall: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1,
    marginTop: 12,
  },
  cardUnit: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  cardUnitSmall: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  bottomPadding: {
    height: 120,
  },

  // No Data View
  noDataView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noDataIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,122,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  noDataTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  noDataSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  syncBtn: {
    marginTop: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  syncBtnText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },

  // Bottom Actions
  bottomActions: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  refreshBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  settingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
