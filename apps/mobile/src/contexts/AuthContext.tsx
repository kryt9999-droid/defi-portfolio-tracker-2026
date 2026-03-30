import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseClient } from "@defi/shared";

const secureStoreAdapter = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
};

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export const mobileSupabase = (() => {
  const client = createSupabaseClient(
    {
      url: extra.supabaseUrl,
      anonKey: extra.supabaseAnonKey
    },
    {
      auth: {
        storage: secureStoreAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

  if (!client) {
    throw new Error("Supabase credentials are missing for the mobile app.");
  }

  return client;
})();

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = mobileSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await mobileSupabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          throw error;
        }
      },
      async signUp(email, password) {
        const { error } = await mobileSupabase.auth.signUp({
          email,
          password
        });
        if (error) {
          throw error;
        }
      },
      async signOut() {
        const { error } = await mobileSupabase.auth.signOut();
        if (error) {
          throw error;
        }
      }
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
