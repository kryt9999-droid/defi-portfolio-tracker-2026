import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { formatCurrency } from "@defi/shared";
import { usePortfolio } from "../../src/contexts/PortfolioContext";
import { EmptyState } from "../../src/components/EmptyState";
import { TransactionFormModal } from "../../src/components/TransactionFormModal";
import { theme } from "../../src/utils/theme";

export default function TransactionsScreen() {
  const { positions, refreshing, refreshAll, removeTransaction, saveTransaction, transactions } =
    usePortfolio();
  const [modalVisible, setModalVisible] = useState(false);

  if (transactions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="No transactions yet"
          description="Track deposits, withdrawals, claims, and rebalances with a swipe-to-delete ledger."
          actionLabel="Add Transaction"
          onAction={() => setModalVisible(true)}
        />
        <TransactionFormModal
          visible={modalVisible}
          positions={positions}
          onClose={() => setModalVisible(false)}
          onSubmit={async (value) => {
            await saveTransaction(value);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>Pull to refresh. Swipe left to delete an entry.</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#fff" />
        }
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
              <Pressable
                style={styles.deleteAction}
                onPress={async () => {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  await removeTransaction(item.id);
                }}
              >
                <Text style={styles.deleteLabel}>Delete</Text>
              </Pressable>
            )}
          >
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.cardTitle}>
                    {item.action.toUpperCase()} · {item.asset}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.protocol} · {item.network}
                  </Text>
                </View>
                <Text style={styles.cardAmount}>{formatCurrency(item.amount_usd)}</Text>
              </View>
              <Text style={styles.cardMeta}>{item.tx_date}</Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
          </Swipeable>
        )}
      />

      <TransactionFormModal
        visible={modalVisible}
        positions={positions}
        onClose={() => setModalVisible(false)}
        onSubmit={async (value) => {
          await saveTransaction(value);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: 4
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.teal
  },
  primaryButtonText: {
    color: "#06110D",
    fontWeight: "700"
  },
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  card: {
    padding: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  cardMeta: {
    color: theme.colors.muted
  },
  cardAmount: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  notes: {
    color: theme.colors.text,
    lineHeight: 20
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 92,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.red,
    marginBottom: 12
  },
  deleteLabel: {
    color: "#fff",
    fontWeight: "700"
  }
});
