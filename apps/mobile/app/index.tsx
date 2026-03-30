import { Redirect } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

export default function IndexScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  return <Redirect href={session ? "/(tabs)" : "/auth"} />;
}
