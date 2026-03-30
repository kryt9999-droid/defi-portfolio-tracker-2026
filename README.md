# DeFi Portfolio Tracker

Monorepo with a web PWA and an Expo mobile app that share one Supabase backend through a shared package.

## Workspaces

- `apps/web`: React + Vite + PWA
- `apps/mobile`: React Native + Expo Router
- `packages/shared`: shared Supabase client, types, API functions, and portfolio utilities

## Setup

1. Run `npm install` at the repo root.
2. Start the web app with `npm run dev:web`.
3. Start the mobile app with `npm run dev:mobile`.

## Supabase

The provided Supabase dashboard URL has been normalized to the API URL format:

- Dashboard URL: `https://supabase.com/dashboard/project/bxbobgvtrjaxiptucxll`
- API URL used by the apps: `https://bxbobgvtrjaxiptucxll.supabase.co`

Update the shared types in [`packages/shared/src/types.ts`](/Users/kryt9999/Documents/Playground/defi-portfolio-tracker/packages/shared/src/types.ts) if your `transactions` table schema differs from the assumed fields in this scaffold.
