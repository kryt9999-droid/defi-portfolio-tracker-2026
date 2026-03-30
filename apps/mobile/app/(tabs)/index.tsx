import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { formatCurrency } from "@defi/shared";
import { usePortfolio } from "../../src/contexts/PortfolioContext";
import { StatCard } from "../../src/components/StatCard";
import { EmptyState } from "../../src/components/EmptyState";
import { theme } from "../../src/utils/theme";

function buildBreakdown(items: Array<{ label: string; value: number }>) {
  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.label] = (accumulator[item.label] ?? 0) + item.value;
    return accumulator;
  }, {});

  return Object.entries(counts).map(([label, value], index) => ({
    label,
    value,
    color: chartColors[index % chartColors.length]
  }));
}

const chartColors = [
  theme.colors.teal,
  "#5FB9FF",
  "#E1B255",
  "#F17BB0",
  "#837BFF",
  "#7FD4C8"
];

export default function DashboardScreen() {
  const {
    positions,
    refreshing,
    refreshAll,
    totalInvested,
    totalMonthlyYield,
    totalPnl,
    totalValue
  } = usePortfolio();

  if (positions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="No positions yet"
          description="Add your first position to unlock allocation charts, projected yield, and portfolio summaries."
        />
      </View>
    );
  }

  const networkData = buildBreakdown(
    positions.map((position) => ({
      label: position.network,
      value: position.current_value
    }))
  );
  const protocolData = buildBreakdown(
    positions.map((position) => ({
      label: position.protocol,
      value: position.current_value
    }))
  );
  const topPositions = [...positions]
    .sort((left, right) => right.current_value - left.current_value)
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#fff" />
      }
    >
      <View style={styles.cardGrid}>
        <StatCard label="Total Value" value={formatCurrency(totalValue)} />
        <StatCard label="Invested" value={formatCurrency(totalInvested)} />
        <StatCard
          label="P&L"
          value={formatCurrency(totalPnl)}
          tone={totalPnl >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Monthly Yield" value={formatCurrency(totalMonthlyYield)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>By Network</Text>
        <PolarChart
          data={networkData}
          labelKey="label"
          valueKey="value"
          colorKey="color"
        >
          <Pie.Chart innerRadius={56}>
            {() => <Pie.Slice />}
          </Pie.Chart>
        </PolarChart>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>By Protocol</Text>
        <PolarChart
          data={protocolData}
          labelKey="label"
          valueKey="value"
          colorKey="color"
        >
          <Pie.Chart innerRadius={56}>
            {() => <Pie.Slice />}
          </Pie.Chart>
        </PolarChart>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Top 5 Positions</Text>
        {topPositions.map((position) => (
          <View key={position.id} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{position.protocol}</Text>
              <Text style={styles.rowMeta}>
                {position.assets} · {position.network}
              </Text>
            </View>
            <Text style={styles.rowValue}>{formatCurrency(position.current_value)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: 16,
    gap: 16
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  panel: {
    padding: 16,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card
  },
  panelTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowTitle: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  rowMeta: {
    color: theme.colors.muted,
    marginTop: 2
  },
  rowValue: {
    color: theme.colors.text,
    fontWeight: "700"
  }
});
