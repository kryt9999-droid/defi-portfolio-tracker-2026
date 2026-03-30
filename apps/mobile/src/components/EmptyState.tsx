import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../utils/theme";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    gap: 12
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  description: {
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 22
  },
  button: {
    marginTop: 6,
    backgroundColor: theme.colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999
  },
  buttonLabel: {
    color: "#06110D",
    fontWeight: "700"
  }
});
