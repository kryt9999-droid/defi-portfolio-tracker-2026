import { StyleSheet, Text, View } from "react-native";
import { theme } from "../utils/theme";

export function StatCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          tone === "positive" && { color: theme.colors.teal },
          tone === "negative" && { color: theme.colors.red }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8
  },
  label: {
    color: theme.colors.muted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  value: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700"
  }
});
