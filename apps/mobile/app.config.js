const defaultUrl = "https://bxbobgvtrjaxiptucxll.supabase.co";
const defaultAnonKey = "sb_publishable_nj-xXWWf5dQ5Gef7XVVgYg_Vs3mKAzV";

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? defaultUrl,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? defaultAnonKey
  }
});
