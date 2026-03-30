import { View, Text, StyleSheet } from "react-native";
import { theme } from "../utils/theme";

export function SyncBadge({ pendingCount }: { pendingCount: number }) {
  const synced = pendingCount === 0;

  return (
    <View style={styles.badge}>
      <View
        style={[
          styles.dot,
          { backgroundColor: synced ? theme.colors.teal : theme.colors.yellow }
        ]}
      />
      <Text style={styles.label}>{synced ? "Synced" : `${pendingCount} pending`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600"
  }
});
