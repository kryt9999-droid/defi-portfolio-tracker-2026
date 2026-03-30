import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuth } from "../src/contexts/AuthContext";
import { usePortfolio } from "../src/contexts/PortfolioContext";
import { theme } from "../src/utils/theme";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { exportData, pendingCount } = usePortfolio();
  const [exporting, setExporting] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Sync & export</Text>
        <Text style={styles.body}>
          Pending offline operations: {pendingCount}. Sessions are persisted via Secure Store.
        </Text>
        <Pressable
          style={styles.primaryButton}
          disabled={exporting}
          onPress={async () => {
            setExporting(true);
            try {
              if (!FileSystem.cacheDirectory) {
                throw new Error("Local cache directory is unavailable.");
              }
              const fileUri = `${FileSystem.cacheDirectory}defi-portfolio-export.json`;
              await FileSystem.writeAsStringAsync(fileUri, exportData(), {
                encoding: FileSystem.EncodingType.UTF8
              });
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: "application/json"
                });
              } else {
                Alert.alert("Sharing unavailable", fileUri);
              }
            } catch (error) {
              Alert.alert(
                "Export failed",
                error instanceof Error ? error.message : "Unknown error"
              );
            } finally {
              setExporting(false);
            }
          }}
        >
          <Text style={styles.primaryLabel}>{exporting ? "Exporting..." : "Export JSON"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.body}>Logout clears the active session on this device.</Text>
        <Pressable
          style={styles.dangerButton}
          onPress={() => signOut().catch((error) => Alert.alert("Logout failed", error.message))}
        >
          <Text style={styles.dangerLabel}>Logout</Text>
        </Pressable>
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
  card: {
    padding: 18,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    gap: 10
  },
  title: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: "700"
  },
  body: {
    color: theme.colors.muted,
    lineHeight: 21
  },
  primaryButton: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: theme.colors.teal
  },
  primaryLabel: {
    color: "#06110D",
    fontWeight: "700"
  },
  dangerButton: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: theme.colors.red
  },
  dangerLabel: {
    color: "#fff",
    fontWeight: "700"
  }
});
