# Mobile Localization Summary

## Overview
- Migrated the Expo mobile app to a centralized i18n system powered by `apps/mobile/src/i18n/{en,zh}.json`.
- All user-facing strings in auth, session management, task workflows, attachments, and notification flows now rely on translation keys via the `t()` helper.
- Added runtime locale detection that respects `EXPO_PUBLIC_LOCALE` or Expo `extra.defaultLocale`/`locale` values, defaulting to English.
- Ensured Supabase-driven error surfaces and attachment flows bubble consistent, localized messaging.

## Key Changes
- Rebuilt `App.tsx` copy (auth alerts, tab labels, placeholders, feature previews) to use `t(...)` keys and added message/error lookup maps (`app.message.*`, `app.error.*`).
- Extended `en.json` and `zh.json` with comprehensive keys for task management, attachments, reminders, navigation, and global UI chrome.
- Localized critical hooks (`useAttachmentActions`, `useTaskAttachments`, `useAssignments`) so error states, alerts, and fallbacks align with the active locale.
- Updated shared utilities/tests (`formatDateTime`, `taskStore` tests) to reflect English defaults and added `setLocale` resets for deterministic test output.
- Removed legacy backup files and ensured no stray hard-coded Chinese strings remain outside the zh resource file.

## Usage Notes
- Set `EXPO_PUBLIC_LOCALE=zh` (or configure `expo.extra.defaultLocale`) to switch the mobile client to Simplified Chinese; omit to keep English.
- When adding new UI copy, define keys in both `en.json` and `zh.json`, then reference them via `t('namespace.key')`.
- Prefer passing dynamic segments through replacement placeholders (e.g., `t('task.card.assigned', { time })`).
- Tests that depend on localized text should call `setLocale('en')` (or desired locale) during setup for consistency.

## Next Steps
- Wire a future settings toggle so users can switch locales in-app without relaunching.
- Mirror the same i18n conventions in the Next.js web app to keep copy consistent across platforms.
- Consider extracting shared translation keys (e.g., status labels) into the shared package if needed by both clients.
