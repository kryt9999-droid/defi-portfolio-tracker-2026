import { createSupabaseClient } from "@defi/shared";

export const webSupabase = (() => {
  const client = createSupabaseClient(
    {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  if (!client) {
    throw new Error("Supabase credentials are missing for the web app.");
  }

  return client;
})();
