import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../src/utils/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Screen not found</Text>
      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonLabel}>Back to dashboard</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    gap: 16
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700"
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.teal
  },
  buttonLabel: {
    color: "#06110D",
    fontWeight: "700"
  }
});
