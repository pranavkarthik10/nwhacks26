import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

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
  if (!data || !data.labels || !data.datasets) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {type === "line" ? (
        <LineChart
          data={data}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      ) : (
        <BarChart
          data={data}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    fontSize: 14,
    color: "#808080",
    textAlign: "center",
    paddingVertical: 20,
  },
});
