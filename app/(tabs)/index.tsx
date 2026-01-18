import useHealthData from "@/hooks/useHealthData";
import { WeeklyTrends } from "@/components/WeeklyTrends";
import { HealthChart } from "@/components/HealthChart";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { calculateWeeklyTrends, WeeklyTrendsData } from "@/services/weeklyTrendsService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

  const [currentPage, setCurrentPage] = useState(0);
  const [trends, setTrends] = useState<WeeklyTrendsData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  console.log(steps, calories, heartRate, sleep, dataTimestamp);
  console.log("Success: ", success);
  console.log("Error: ", error);
  console.log("Permission: ", hasPermissions);

  // Load trends data when health data is available
  useEffect(() => {
    const loadTrends = async () => {
      if (success && (steps || sleep || heartRate.length > 0)) {
        try {
          setLoadingTrends(true);
          const sleepNum = typeof sleep === 'string' ? parseFloat(getTotalSleep(sleep)) : getTotalSleep(sleep);
          const weeklyData = await calculateWeeklyTrends(steps, sleepNum, heartRate);
          setTrends(weeklyData);
        } catch (error) {
          console.error('Error loading trends:', error);
        } finally {
          setLoadingTrends(false);
        }
      }
    };
    loadTrends();
  }, [success, steps, sleep, heartRate]);

  // Handle horizontal scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>Your Health</Text>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          <View style={styles.lastUpdateInline}>
            <View style={styles.statusIndicator} />
            <Text style={styles.lastUpdateText}>
              {formatTimestamp(dataTimestamp)}
            </Text>
          </View>
        </View>
      </View>

      {/* Horizontal Scrollable Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
      >
        {/* Page 1: Health Cards */}
        <ScrollView 
          style={[styles.page, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
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
        </ScrollView>

        {/* Page 2: Trends */}
        <ScrollView 
          style={[styles.page, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          <TrendsPageContent 
            trends={trends} 
            loading={loadingTrends}
            steps={steps}
            sleep={getTotalSleep(sleep)}
            heartRate={heartRate}
          />
        </ScrollView>
      </ScrollView>

      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
        <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
      </View>
    </View>
  );

  // Generate mock 7-day data for charts
  const generateDailyData = (avg: number, variance: number = 0.15) => {
    return Array(7)
      .fill(0)
      .map(() => Math.round(avg * (1 + (Math.random() - 0.5) * variance * 2)));
  };

  // Trends Page Content Component
  const TrendsPageContent = ({ 
    trends, 
    loading,
    steps,
    sleep,
    heartRate
  }: { 
    trends: WeeklyTrendsData | null; 
    loading: boolean;
    steps: number;
    sleep: string | number;
    heartRate: any[];
  }) => {
    if (loading || !trends) {
      return (
        <View style={styles.trendsLoading}>
          <Text style={styles.trendsLoadingText}>Analyzing trends...</Text>
        </View>
      );
    }

    // Generate daily data for charts
    const dailySteps = generateDailyData(trends.steps.thisWeekAvg, 0.2);
    const dailySleep = generateDailyData(trends.sleep.thisWeekAvg, 0.15).map(v => v / 1);
    const dailyHeartRate = generateDailyData(trends.heartRate.thisWeekAvg, 0.1);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const StatCard = ({
      title,
      thisWeek,
      lastWeek,
      percentChange,
      direction,
      unit,
      color,
      chartData,
    }: {
      title: string;
      thisWeek: number;
      lastWeek: number;
      percentChange: number;
      direction: 'up' | 'down' | 'stable';
      unit: string;
      color: string;
      chartData: number[];
    }) => {
      const isPositive = direction === 'up';
      const arrowIcon =
        direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'arrow-forward';
      const changeColor = isPositive ? '#34C759' : direction === 'stable' ? '#999999' : '#FF3B30';

      return (
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.statIconBg, { backgroundColor: color }]}>
              <Ionicons
                name={
                  title === 'Steps'
                    ? 'footsteps'
                    : title === 'Sleep'
                      ? 'moon'
                      : 'heart'
                }
                size={24}
                color="#fff"
              />
            </View>
            <Text style={styles.statTitle}>{title}</Text>
          </View>

          <View style={styles.statValues}>
            <View>
              <Text style={styles.statLabel}>This Week Avg</Text>
              <Text style={styles.statValue}>{formatNumber(thisWeek)}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statChangeContainer}>
              <View style={[styles.changeBadge, { backgroundColor: changeColor }]}>
                <Ionicons name={arrowIcon as any} size={16} color="#fff" />
                <Text style={styles.changePercent}>{Math.abs(percentChange)}%</Text>
              </View>
              <Text style={styles.changeLabel}>vs last week</Text>
              <Text style={styles.lastWeekValue}>{formatNumber(lastWeek)} {unit}</Text>
            </View>
          </View>

          {/* Daily Chart */}
          <View style={styles.chartContainer}>
            <HealthChart
              type="bar"
              data={{
                labels: labels,
                datasets: [{ data: chartData }],
              }}
              title="Daily Breakdown"
              color={color}
            />
          </View>
        </View>
      );
    };

    return (
      <>
        <Text style={styles.trendsPageTitle}>Weekly Trends</Text>
        
        {/* AI Insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={20} color="#007AFF" />
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>{trends.insight}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title="Steps"
            thisWeek={trends.steps.thisWeekAvg}
            lastWeek={trends.steps.lastWeekAvg}
            percentChange={trends.steps.percentChange}
            direction={trends.steps.direction}
            unit="steps"
            color="#FF9500"
            chartData={dailySteps}
          />
          <StatCard
            title="Sleep"
            thisWeek={trends.sleep.thisWeekAvg}
            lastWeek={trends.sleep.lastWeekAvg}
            percentChange={trends.sleep.percentChange}
            direction={trends.sleep.direction}
            unit="hours"
            color="#5856D6"
            chartData={dailySleep}
          />
          <StatCard
            title="Heart Rate"
            thisWeek={trends.heartRate.thisWeekAvg}
            lastWeek={trends.heartRate.lastWeekAvg}
            percentChange={trends.heartRate.percentChange}
            direction={trends.heartRate.direction}
            unit="BPM"
            color="#FF2D55"
            chartData={dailyHeartRate}
          />
        </View>
      </>
    );
  };

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
  
  container: {
    flex: 1,
  },
  
  horizontalScroll: {
    flex: 1,
  },
  
  page: {
    flex: 1,
  },
  
  pageContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  headerSection: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  lastUpdateInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    fontSize: 12,
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
  // Page Indicator
  pageIndicator: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  activeDot: {
    backgroundColor: "#007AFF",
    width: 24,
  },
  
  // Trends Page
  trendsPageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 24,
    marginTop: 8,
  },
  trendsLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  trendsLoadingText: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "500",
  },
  statsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  statValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#E5E5EA",
  },
  statChangeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  changeLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  lastWeekValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  chartContainer: {
    marginTop: 20,
    marginHorizontal: -20,
    paddingHorizontal: 4,
  },
  insightCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1C1C1E",
    fontWeight: "500",
  },
});
