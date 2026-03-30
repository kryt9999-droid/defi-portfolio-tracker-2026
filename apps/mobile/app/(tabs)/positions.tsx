import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { calcPnl, formatCurrency, type Position } from "@defi/shared";
import { usePortfolio } from "../../src/contexts/PortfolioContext";
import { EmptyState } from "../../src/components/EmptyState";
import { PositionFormModal } from "../../src/components/PositionFormModal";
import { fetchCurrentValueFromAssets } from "../../src/utils/coingecko";
import { theme } from "../../src/utils/theme";

export default function PositionsScreen() {
  const { positions, refreshing, refreshAll, removePosition, savePosition } = usePortfolio();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  if (positions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="No positions tracked"
          description="Add LPs, staking vaults, lending positions, and wallets. Changes cache locally and sync later if offline."
          actionLabel="Add Position"
          onAction={() => setModalVisible(true)}
        />
        <PositionFormModal
          visible={modalVisible}
          initialValue={editing}
          onClose={() => {
            setEditing(null);
            setModalVisible(false);
          }}
          onSubmit={async (value) => {
            await savePosition(value);
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
          <Text style={styles.title}>Positions</Text>
          <Text style={styles.subtitle}>Swipe left to delete, tap to edit or refresh prices.</Text>
        </View>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setEditing(null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={[...positions].sort((left, right) => right.current_value - left.current_value)}
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
                  await removePosition(item.id);
                }}
              >
                <Text style={styles.deleteLabel}>Delete</Text>
              </Pressable>
            )}
          >
            <Pressable
              style={styles.card}
              onPress={() => {
                setEditing(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.cardTitle}>{item.protocol}</Text>
                  <Text style={styles.cardMeta}>
                    {item.assets} · {item.network}
                  </Text>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(item.current_value)}</Text>
              </View>

              <View style={styles.rowBottom}>
                <Text style={[styles.pnl, calcPnl(item) >= 0 ? styles.positive : styles.negative]}>
                  {formatCurrency(calcPnl(item))}
                </Text>
                <Text style={styles.cardMeta}>{item.apy.toFixed(2)}% APY</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={async () => {
                    setRefreshingId(item.id);
                    try {
                      const currentValue = await fetchCurrentValueFromAssets(item.assets);
                      await savePosition({
                        ...item,
                        current_value: Number(currentValue.toFixed(2))
                      });
                      await Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                      );
                    } catch (error) {
                      Alert.alert(
                        "Price refresh failed",
                        error instanceof Error ? error.message : "Unknown error"
                      );
                    } finally {
                      setRefreshingId(null);
                    }
                  }}
                >
                  <Text style={styles.secondaryLabel}>
                    {refreshingId === item.id ? "Refreshing..." : "Refresh Price"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Swipeable>
        )}
      />

      <PositionFormModal
        visible={modalVisible}
        initialValue={editing}
        onClose={() => {
          setEditing(null);
          setModalVisible(false);
        }}
        onSubmit={async (value) => {
          await savePosition(value);
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
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  cardMeta: {
    color: theme.colors.muted
  },
  cardValue: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  pnl: {
    fontWeight: "700"
  },
  positive: {
    color: theme.colors.teal
  },
  negative: {
    color: theme.colors.red
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  secondaryLabel: {
    color: theme.colors.text,
    fontWeight: "600"
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
