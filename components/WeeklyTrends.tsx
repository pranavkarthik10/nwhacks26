import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateWeeklyTrends, WeeklyTrendsData } from '@/services/weeklyTrendsService';

interface WeeklyTrendsProps {
  steps: number;
  sleep: number | string;
  heartRate: any[];
}

export const WeeklyTrends: React.FC<WeeklyTrendsProps> = ({ steps, sleep, heartRate }) => {
  const [trends, setTrends] = useState<WeeklyTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const weeklyData = await calculateWeeklyTrends(steps, sleep, heartRate);
        setTrends(weeklyData);
        setError(null);
      } catch (err) {
        console.error('Error fetching weekly trends:', err);
        setError('Could not load weekly trends');
      } finally {
        setLoading(false);
      }
    };

    if (steps || sleep || heartRate.length > 0) {
      fetchTrends();
    }
  }, [steps, sleep, heartRate]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (error || !trends) {
    return null;
  }

  const TrendBadge = ({
    metric,
    percentChange,
    direction,
  }: {
    metric: string;
    percentChange: number;
    direction: 'up' | 'down' | 'stable';
  }) => {
    const isPositive = direction === 'up';
    const isMixed = direction === 'stable';
    const arrowIcon =
      direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'arrow-forward';
    const bgColor = isPositive ? '#34C759' : isMixed ? '#999999' : '#FF3B30';
    const textColor = '#fff';

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <View style={styles.badgeContent}>
          <Ionicons name={arrowIcon as any} size={16} color={textColor} />
          <Text style={[styles.badgePercent, { color: textColor }]}>
            {Math.abs(percentChange)}%
          </Text>
        </View>
        <Text style={[styles.badgeLabel, { color: textColor }]}>{metric}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={20} color="#007AFF" />
        <Text style={styles.headerTitle}>This Week's Trends</Text>
      </View>

      {/* Badges Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.badgesScroll}
        contentContainerStyle={styles.badgesContainer}
      >
        <TrendBadge
          metric={trends.steps.metric}
          percentChange={trends.steps.percentChange}
          direction={trends.steps.direction}
        />
        <TrendBadge
          metric={trends.sleep.metric}
          percentChange={trends.sleep.percentChange}
          direction={trends.sleep.direction}
        />
        <TrendBadge
          metric={trends.heartRate.metric}
          percentChange={trends.heartRate.percentChange}
          direction={trends.heartRate.direction}
        />
      </ScrollView>

      {/* AI Insight */}
      <View style={styles.insightContainer}>
        <View style={styles.insightContent}>
          <Text style={styles.insightText}>{trends.insight}</Text>
          <Text style={styles.insightTimestamp}>
            vs last week • {trends.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  badgesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  badgesContainer: {
    gap: 8,
    paddingRight: 16,
  },
  badge: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
    gap: 8,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  insightContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  insightContent: {
    gap: 4,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 20,
  },
  insightTimestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
