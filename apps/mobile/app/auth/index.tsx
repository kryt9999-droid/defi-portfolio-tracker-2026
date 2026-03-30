import { Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { theme } from "../../src/utils/theme";

export default function AuthScreen() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>DeFi tracker</Text>
        <Text style={styles.title}>
          {mode === "login" ? "Sign in to your portfolio" : "Create your account"}
        </Text>
        <Text style={styles.subtitle}>
          Supabase Auth powers login, register, and refresh-token persistence.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            setLoading(true);
            setError("");
            try {
              if (mode === "login") {
                await signIn(email, password);
              } else {
                await signUp(email, password);
              }
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.primaryLabel}>
            {loading ? "Working..." : mode === "login" ? "Login" : "Register"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode((current) => (current === "login" ? "register" : "login"))}>
          <Text style={styles.link}>
            {mode === "login" ? "Need an account? Register" : "Already registered? Login"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: theme.colors.background
  },
  card: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: 20,
    gap: 12
  },
  eyebrow: {
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 20
  },
  input: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.teal
  },
  primaryLabel: {
    color: "#06110D",
    fontWeight: "700"
  },
  link: {
    color: theme.colors.teal,
    textAlign: "center",
    fontWeight: "600"
  },
  error: {
    color: theme.colors.red
  }
});
