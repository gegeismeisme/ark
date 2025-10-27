# Environment Setup Guide

This guide walks through preparing environment variables for the Project Ark monorepo once your Supabase project is ready.

## 1. Create the Supabase project
1. Sign in to https://app.supabase.com/ and create a new project.
2. Under **Project Settings → API**, note the following values:
   - **Project URL** (a.k.a. `SUPABASE_URL`)
   - **anon public key** (client-safe key)
   - **service_role secret** (admin key; keep private)

## 2. Configure the Next.js admin app (`apps/web`)
1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Populate the variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   SUPABASE_SERVICE_ROLE_KEY=<service role secret>
   ```
3. Never commit the `.env.local` file. It is already ignored via `.gitignore`.
4. In the code, `NEXT_PUBLIC_*` variables are available client-side. The `SUPABASE_SERVICE_ROLE_KEY` must only be read in server-side code (e.g., Next.js Route Handlers, Edge Functions) because it grants elevated permissions.

## 3. Configure the Expo mobile app (`apps/mobile`)
1. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
2. Fill in:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=<your Supabase project URL>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```
3. The Expo CLI automatically loads `.env` when running in development. Because the variables are prefixed with `EXPO_PUBLIC_`, they are also bundled for the client runtime and can be accessed with `process.env.EXPO_PUBLIC_SUPABASE_URL` (or through `expo-constants` via `Constants.expoConfig?.extra`).
4. Sensitive keys (like the service role secret) must **not** be added here; the mobile app should only use public anon keys.

## 4. Shared usage tips
- Keep production, staging, and local credentials in separate files (e.g., `.env.production`) and load them via deployment pipelines.
- For automated tooling (CI/CD), configure the same variables through the platform's secret manager instead of checking them into the repo.
- Whenever you rotate keys in Supabase, remember to update all relevant environment files.

Once these files are populated, both the web and mobile apps can import the shared Supabase client utilities (to be implemented under `packages/shared`) and authenticate correctly.
