import {
  createClient,
  type SupabaseClientOptions
} from "@supabase/supabase-js";
import type { Database } from "./types";

type EnvSource = Record<string, string | undefined>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) {
    return "";
  }

  if (rawUrl.includes("/dashboard/project/")) {
    const projectRef = rawUrl.split("/dashboard/project/")[1]?.split(/[/?#]/)[0];
    return projectRef ? `https://${projectRef}.supabase.co` : rawUrl;
  }

  return rawUrl;
}

export function resolveSupabaseConfig(source?: EnvSource): SupabaseConfig {
  const importMetaEnv =
    typeof import.meta !== "undefined"
      ? ((import.meta as unknown as { env?: EnvSource }).env ?? {})
      : {};
  const processEnv =
    ((globalThis as { process?: { env?: EnvSource } }).process?.env as
      | EnvSource
      | undefined) ?? {};
  const env = { ...processEnv, ...importMetaEnv, ...(source ?? {}) };

  const rawUrl =
    env.VITE_SUPABASE_URL ??
    env.EXPO_PUBLIC_SUPABASE_URL ??
    env.SUPABASE_URL ??
    "";
  const anonKey =
    env.VITE_SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    env.SUPABASE_ANON_KEY ??
    "";

  return {
    url: normalizeSupabaseUrl(rawUrl),
    anonKey
  };
}

export function createSupabaseClient(
  config?: Partial<SupabaseConfig>,
  options?: SupabaseClientOptions<"public">
) {
  const resolved = { ...resolveSupabaseConfig(), ...(config ?? {}) };
  if (!resolved.url || !resolved.anonKey) {
    return null;
  }

  return createClient<Database>(resolved.url, resolved.anonKey, options);
}

export const supabase = createSupabaseClient();
