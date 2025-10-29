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
   EXPO_PUBLIC_EAS_PROJECT_ID=<Expo project ID>
   ```
3. The Expo CLI automatically loads `.env` when running in development. Because the variables are prefixed with `EXPO_PUBLIC_`, they are also bundled for the client runtime and can be accessed with `process.env.EXPO_PUBLIC_SUPABASE_URL` (or through `expo-constants` via `Constants.expoConfig?.extra`).
4. `EXPO_PUBLIC_EAS_PROJECT_ID` is required for `expo-notifications` to obtain an Expo push token. You can copy the Project ID from the Expo dashboard (**Project Settings → General → Project ID**) or from your `eas.json`.
5. Sensitive keys (like the service role secret) must **not** be added here; the mobile app should only use public anon keys.

## 4. Shared usage tips
- Keep production, staging, and local credentials in separate files (e.g., `.env.production`) and load them via deployment pipelines.
- For automated tooling (CI/CD), configure the same variables through the platform's secret manager instead of checking them into the repo.
- Whenever you rotate keys in Supabase, remember to update all relevant environment files.

## 5. Configure notification infrastructure
To enable task notifications, supply the following secrets:

### Supabase Edge Function (`task-notifier`)
Add these environment variables when running the Supabase CLI locally (or via the Supabase dashboard in production):

```env
NOTIFY_SMTP_HOST=<smtp host>
NOTIFY_SMTP_USER=<smtp username>
NOTIFY_SMTP_PASS=<smtp password>
NOTIFY_FROM_EMAIL="Project Ark <noreply@yourdomain>"
TASK_PORTAL_URL=https://your-web-app-domain/dashboard
```

`TASK_PORTAL_URL` powers the links embedded in notification emails. To run the queue consumer on a cadence, configure an Edge Scheduler job (for example: `supabase functions schedule create task-notifier --cron "*/5 * * * *"`). The scheduler configuration can also be added to `supabase/config.toml` once Supabase publishes a stable format.

### Reminder Edge Function (`task-reminder`)
- Deploy with `pnpm exec supabase functions deploy task-reminder --no-verify-jwt`.
- Schedule a reminder run（示例：每小时）：
  ```bash
  supabase functions schedule create task-reminder-job --cron "0 * * * *" --function task-reminder
  ```
  Adjust the cron expression to the cadence you need. The reminder job enqueues `due_reminder` 和 `overdue_reminder` 事件，并会在 `task_assignments` 中记录发送时间，防止重复提醒。

### Expo push notifications
Once the Expo app starts on a real device, it requests push permissions and stores the Expo push token in `user_device_tokens`. Ensure `EXPO_PUBLIC_EAS_PROJECT_ID` is configured; otherwise token registration will fail. To refresh tokens manually, reinstall the app or sign out/in to trigger the registration hook.

When ready to send push alerts, the Edge Function (or another service) can read from `user_device_tokens` using the service role key.

Once these files are populated, both the web and mobile apps can import the shared Supabase client utilities (to be implemented under `packages/shared`) and authenticate correctly.
