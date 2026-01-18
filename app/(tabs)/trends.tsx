import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useHealthData from '@/hooks/useHealthData';
import { calculateWeeklyTrends, WeeklyTrendsData } from '@/services/weeklyTrendsService';

export default function TrendsPage() {
  const date = new Date();
  const { steps, sleep, heartRate, success } = useHealthData(date);
  const [trends, setTrends] = useState<WeeklyTrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        if (success) {
          setLoading(true);
          const sleepNum = typeof sleep === 'string' ? parseFloat(sleep) : sleep;
          const weeklyData = await calculateWeeklyTrends(steps, sleepNum, heartRate);
          setTrends(weeklyData);
        }
      } catch (error) {
        console.error('Error fetching trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [steps, sleep, heartRate, success]);

  const formatNumber = (num: any) => {
    if (!num || num === '--') return '--';
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '--';
    return parsed.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  };

  const StatCard = ({
    title,
    thisWeek,
    lastWeek,
    percentChange,
    direction,
    unit,
    color,
  }: {
    title: string;
    thisWeek: number;
    lastWeek: number;
    percentChange: number;
    direction: 'up' | 'down' | 'stable';
    unit: string;
    color: string;
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
      </View>
    );
  };

  if (loading || !trends) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing your trends...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>This Week's Trends</Text>
        <Text style={styles.headerSubtitle}>Compared to last week</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Steps"
          thisWeek={trends.steps.thisWeekAvg}
          lastWeek={trends.steps.lastWeekAvg}
          percentChange={trends.steps.percentChange}
          direction={trends.steps.direction}
          unit="steps"
          color="#FF9500"
        />
        <StatCard
          title="Sleep"
          thisWeek={trends.sleep.thisWeekAvg}
          lastWeek={trends.sleep.lastWeekAvg}
          percentChange={trends.sleep.percentChange}
          direction={trends.sleep.direction}
          unit="hours"
          color="#5856D6"
        />
        <StatCard
          title="Heart Rate"
          thisWeek={trends.heartRate.thisWeekAvg}
          lastWeek={trends.heartRate.lastWeekAvg}
          percentChange={trends.heartRate.percentChange}
          direction={trends.heartRate.direction}
          unit="BPM"
          color="#FF2D55"
        />
      </View>

      {/* AI Insight */}
      <View style={styles.insightSection}>
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={20} color="#007AFF" />
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>{trends.insight}</Text>
          <Text style={styles.insightTime}>
            Generated at {trends.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E5EA',
  },
  statChangeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  changeLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastWeekValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  insightSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
    marginBottom: 12,
    fontWeight: '500',
  },
  insightTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bottomPadding: {
    height: 100,
  },
});
