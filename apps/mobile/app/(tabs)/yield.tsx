import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  calcDailyYield,
  calcMonthlyYield,
  calcYearlyYield,
  formatCurrency
} from "@defi/shared";
import { usePortfolio } from "../../src/contexts/PortfolioContext";
import { EmptyState } from "../../src/components/EmptyState";
import { StatCard } from "../../src/components/StatCard";
import { theme } from "../../src/utils/theme";

export default function YieldScreen() {
  const { positions, refreshing, refreshAll } = usePortfolio();

  if (positions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Yield needs positions"
          description="Add positions with APY and current value to see projected daily, monthly, and yearly income."
        />
      </View>
    );
  }

  const totals = positions.reduce(
    (accumulator, position) => ({
      daily: accumulator.daily + calcDailyYield(position),
      monthly: accumulator.monthly + calcMonthlyYield(position),
      yearly: accumulator.yearly + calcYearlyYield(position)
    }),
    { daily: 0, monthly: 0, yearly: 0 }
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#fff" />
      }
    >
      <View style={styles.cardGrid}>
        <StatCard label="Daily" value={formatCurrency(totals.daily)} />
        <StatCard label="Monthly" value={formatCurrency(totals.monthly)} />
        <StatCard label="Yearly" value={formatCurrency(totals.yearly)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Per Position</Text>
        {positions.map((position) => (
          <View key={position.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{position.protocol}</Text>
              <Text style={styles.rowMeta}>
                {position.assets} · {position.apy.toFixed(2)}% APY
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowValue}>{formatCurrency(calcDailyYield(position))}/day</Text>
              <Text style={styles.rowMeta}>{formatCurrency(calcMonthlyYield(position))}/mo</Text>
              <Text style={styles.rowMeta}>{formatCurrency(calcYearlyYield(position))}/yr</Text>
            </View>
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
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowTitle: {
    color: theme.colors.text,
    fontWeight: "700"
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
