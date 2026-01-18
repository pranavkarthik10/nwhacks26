import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";

interface HealthChartProps {
  type: "line" | "bar";
  data: any;
  title: string;
  color?: string;
}

export const HealthChart: React.FC<HealthChartProps> = ({ 
  type, 
  data, 
  title, 
  color = "#0000FF" 
}) => {
  console.log("HealthChart rendering:", { type, title, data: JSON.stringify(data) });

  // Validate data structure
  if (!data || !data.labels || !data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
    console.log("Chart validation failed: missing required fields");
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  // Ensure we have valid data points
  const hasValidData = data.datasets[0].data && 
                       Array.isArray(data.datasets[0].data) && 
                       data.datasets[0].data.length > 0;

  if (!hasValidData) {
    console.log("Chart validation failed: no valid data points");
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>No data available for this period</Text>
      </View>
    );
  }

  // Ensure all data values are valid numbers, replace any NaN/undefined with 0
  const cleanedData = {
    ...data,
    datasets: data.datasets.map((dataset: any) => ({
      ...dataset,
      data: dataset.data.map((val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      }),
    })),
  };

  console.log("Chart rendering with cleaned data:", cleanedData);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: color,
    },
  };

  try {
    // Calculate chart width based on container - account for container padding (16px each side)
    const chartWidth = 280; // Fixed width that fits well in message bubble
    
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.chartWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {type === "line" ? (
              <LineChart
                data={cleanedData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
            ) : (
              <BarChart
                data={cleanedData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                showValuesOnTopOfBars={true}
                fromZero={true}
              />
            )}
          </ScrollView>
        </View>
      </View>
    );
  } catch (error) {
    console.error("Error rendering chart:", error);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>Error displaying chart</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignSelf: "stretch",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  chartWrapper: {
    overflow: "hidden",
    borderRadius: 8,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  chart: {
    borderRadius: 8,
  },
  noData: {
    fontSize: 14,
    color: "#808080",
    textAlign: "center",
    paddingVertical: 20,
  },
});
