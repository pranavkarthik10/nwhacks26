/**
 * Weekly Trends Service
 * Calculates 7-day health trends and generates AI insights
 */

import { generateText } from './llmService';

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
}

export interface WeeklyTrend {
  thisWeekAvg: number;
  lastWeekAvg: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
  metric: string;
  unit: string;
}

export interface WeeklyTrendsData {
  steps: WeeklyTrend;
  sleep: WeeklyTrend;
  heartRate: WeeklyTrend;
  insight: string;
  generatedAt: Date;
}

/**
 * Calculate trend between two weeks
 */
function calculateTrend(thisWeekAvg: number, lastWeekAvg: number): WeeklyTrend['direction'] {
  if (thisWeekAvg > lastWeekAvg * 1.05) return 'up';
  if (thisWeekAvg < lastWeekAvg * 0.95) return 'down';
  return 'stable';
}

/**
 * Calculate percent change
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Mock weekly data generator (since we don't have a full 14-day history)
 * In production, this would pull from historical storage
 */
function generateMockHistoricalData(current: number, variance: number = 0.15) {
  return Array(7)
    .fill(0)
    .map(() => current * (1 + (Math.random() - 0.5) * variance * 2));
}

/**
 * Calculate weekly trends from current data
 * @param steps - steps today
 * @param sleep - sleep hours last night
 * @param heartRate - heart rate samples from today
 */
export async function calculateWeeklyTrends(
  steps: number,
  sleep: number | string,
  heartRate: any[]
): Promise<WeeklyTrendsData> {
  try {
    const sleepNum = typeof sleep === 'string' ? parseFloat(sleep) : sleep;
    const avgHeartRate = heartRate.length > 0 
      ? Math.round(heartRate.reduce((sum, hr) => sum + hr.value, 0) / heartRate.length)
      : 0;

    // Generate mock historical data (in production, fetch from DB)
    const stepsThisWeek = generateMockHistoricalData(steps, 0.2);
    const stepsLastWeek = generateMockHistoricalData(steps * 0.95, 0.2);
    const sleepThisWeek = generateMockHistoricalData(sleepNum, 0.15);
    const sleepLastWeek = generateMockHistoricalData(sleepNum - 0.5, 0.15);
    const hrThisWeek = generateMockHistoricalData(avgHeartRate, 0.1);
    const hrLastWeek = generateMockHistoricalData(avgHeartRate + 5, 0.1);

    const stepsThisWeekAvg = Math.round(stepsThisWeek.reduce((a, b) => a + b) / 7);
    const stepsLastWeekAvg = Math.round(stepsLastWeek.reduce((a, b) => a + b) / 7);
    const sleepThisWeekAvg = Math.round((sleepThisWeek.reduce((a, b) => a + b) / 7) * 10) / 10;
    const sleepLastWeekAvg = Math.round((sleepLastWeek.reduce((a, b) => a + b) / 7) * 10) / 10;
    const hrThisWeekAvg = Math.round(hrThisWeek.reduce((a, b) => a + b) / 7);
    const hrLastWeekAvg = Math.round(hrLastWeek.reduce((a, b) => a + b) / 7);

    const stepsPercent = calculatePercentChange(stepsThisWeekAvg, stepsLastWeekAvg);
    const sleepPercent = calculatePercentChange(sleepThisWeekAvg, sleepLastWeekAvg);
    const hrPercent = calculatePercentChange(hrThisWeekAvg, hrLastWeekAvg);

    const trends: WeeklyTrendsData = {
      steps: {
        thisWeekAvg: stepsThisWeekAvg,
        lastWeekAvg: stepsLastWeekAvg,
        percentChange: stepsPercent,
        direction: calculateTrend(stepsThisWeekAvg, stepsLastWeekAvg),
        metric: 'Steps',
        unit: 'steps',
      },
      sleep: {
        thisWeekAvg: sleepThisWeekAvg,
        lastWeekAvg: sleepLastWeekAvg,
        percentChange: sleepPercent,
        direction: calculateTrend(sleepThisWeekAvg, sleepLastWeekAvg),
        metric: 'Sleep',
        unit: 'hours',
      },
      heartRate: {
        thisWeekAvg: hrThisWeekAvg,
        lastWeekAvg: hrLastWeekAvg,
        percentChange: hrPercent,
        direction: calculateTrend(hrThisWeekAvg, hrLastWeekAvg),
        metric: 'Resting Heart Rate',
        unit: 'BPM',
      },
      generatedAt: new Date(),
      insight: '', // Will be populated by AI
    };

    // Generate AI insight
    const insightPrompt = `Based on this week's health data, provide ONE sentence insight (max 15 words):
- Steps: ${stepsThisWeekAvg}/day (${stepsPercent > 0 ? '+' : ''}${stepsPercent}% vs last week)
- Sleep: ${sleepThisWeekAvg}h/night (${sleepPercent > 0 ? '+' : ''}${sleepPercent}% vs last week)
- Resting HR: ${hrThisWeekAvg} BPM (${hrPercent > 0 ? '+' : ''}${hrPercent}% vs last week)

Keep it positive and motivating. Format: "[emoji] [insight]"`;

    try {
      const insight = await generateText(insightPrompt);
      trends.insight = insight.trim();
    } catch (error) {
      console.warn('Failed to generate AI insight:', error);
      // Fallback insight
      trends.insight = '💪 Keep up the great work with your health!';
    }

    return trends;
  } catch (error) {
    console.error('Error calculating weekly trends:', error);
    throw error;
  }
}
