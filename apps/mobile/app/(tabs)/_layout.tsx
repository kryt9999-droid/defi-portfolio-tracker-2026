import { Tabs, Redirect, Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { usePortfolio } from "../../src/contexts/PortfolioContext";
import { SyncBadge } from "../../src/components/SyncBadge";
import { theme } from "../../src/utils/theme";

function HeaderRight() {
  const { pendingCount } = usePortfolio();

  return (
    <Link href="/settings" asChild>
      <Pressable style={styles.headerAction}>
        <SyncBadge pendingCount={pendingCount} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border
        },
        tabBarActiveTintColor: theme.colors.teal,
        tabBarInactiveTintColor: theme.colors.muted,
        headerRight: () => <HeaderRight />
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: ({ color }) => <TabLabel color={color} label="Dashboard" />
        }}
      />
      <Tabs.Screen
        name="positions"
        options={{
          title: "Positions",
          tabBarLabel: ({ color }) => <TabLabel color={color} label="Positions" />
        }}
      />
      <Tabs.Screen
        name="yield"
        options={{
          title: "Yield",
          tabBarLabel: ({ color }) => <TabLabel color={color} label="Yield" />
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarLabel: ({ color }) => <TabLabel color={color} label="Transactions" />
        }}
      />
    </Tabs>
  );
}

function TabLabel({ color, label }: { color: string; label: string }) {
  return <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{label}</Text>;
}

const styles = StyleSheet.create({
  headerAction: {
    marginRight: 12
  }
});
