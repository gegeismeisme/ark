# Environment Setup Guide

This guide walks through preparing environment variables for the Project Ark monorepo once your Supabase project is ready.

## 1. Create the Supabase project
1. Sign in to https://app.supabase.com/ and create a new project.
2. Under **Project Settings → API**, note the following values:
   - **Project URL** (`SUPABASE_URL`)
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
3. Never commit `.env.local`; it is already ignored via `.gitignore`.
4. In the code, `NEXT_PUBLIC_*` variables are available client-side. The `SUPABASE_SERVICE_ROLE_KEY` must only be used in server-side code because it grants elevated permissions.

## 3. Configure the Expo mobile app (`apps/mobile`)
1. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
2. Fill in:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=<your Supabase project URL>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   EXPO_PUBLIC_EAS_PROJECT_ID=<Expo project ID>
   ```
3. The Expo CLI automatically loads `.env` during development. Because the variables are prefixed with `EXPO_PUBLIC_`, they are bundled for the client runtime and can be accessed via `process.env.EXPO_PUBLIC_SUPABASE_URL` (or `Constants.expoConfig?.extra`).
4. `EXPO_PUBLIC_EAS_PROJECT_ID` is required for `expo-notifications` to obtain an Expo push token. You can copy it from the Expo dashboard (**Project Settings → General → Project ID**) or from `eas.json`.
5. Sensitive values (such as the service role secret) must **not** be added here; the mobile app should only use public anon keys.

## 4. Shared usage tips
- Keep production, staging, and local credentials in separate files (e.g. `.env.production`) and load them via deployment pipelines.
- For automated tooling (CI/CD), configure the same variables through the platform’s secret manager instead of checking them into the repo.
- Whenever you rotate keys in Supabase, remember to update all related environment files.

## 5. Configure notification infrastructure
To enable email and push notifications, provide the following environment variables when running Supabase CLI commands or deploying edge functions:

```env
NOTIFY_SMTP_HOST=<smtp host>
NOTIFY_SMTP_USER=<smtp username>
NOTIFY_SMTP_PASS=<smtp password>
NOTIFY_FROM_EMAIL="Project Ark <noreply@yourdomain>"
TASK_PORTAL_URL=https://your-web-app-domain/dashboard
```

`TASK_PORTAL_URL` is used to render links in notification messages. Scheduler setup commands for the queue processor and reminder jobs are documented in `docs/scheduler-commands.md`.

### Reminder Edge Function (`task-reminder`)
- Deploy with `pnpm exec supabase functions deploy task-reminder --no-verify-jwt`.
- Scheduler commands are listed in `docs/scheduler-commands.md`. The reminder job enqueues due/overdue reminders and updates `task_assignments` reminder timestamps to prevent duplicate sends.

### Expo push notifications
Once the mobile app runs on a physical device, it asks for push permissions and stores the Expo push token in `user_device_tokens`. If registration fails, double-check `EXPO_PUBLIC_EAS_PROJECT_ID`. To refresh tokens manually, reinstall the app or sign out/in to trigger the registration hook.

When ready to send push alerts, the `task-notifier` edge function (or any service with the service role key) can read from `user_device_tokens`.

---

With these environment variables populated, the web and mobile apps can import the shared Supabase client utilities from `@project-ark/shared` and authenticate correctly. Refer to the docs in this folder for deployment commands, QA checklists, and scheduler configuration.
