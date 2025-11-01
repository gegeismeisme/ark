# MVP Roadmap (Updated)

## 1. Current Status

- ✅ Monorepo managed via pnpm + Turborepo with Supabase connected.
- ✅ Web (Next.js) and Mobile (Expo) share the auth module; cross-device login works.
- ✅ Database schema / views / RLS synced through `pnpm exec supabase db push`.
- ✅ First login auto-creates an organisation, default group, and owner membership.
- ✅ Web admin dashboard covers members, groups, tasks, invites, join requests, and tags.
- ✅ Task loop delivered: member submission → manager review → Edge Function notification → analytics.
- ✅ Tag system supports category maintenance, member self-service, task filtering.
- ✅ `task-notifier` + Edge Scheduler send emails (push channel reserved, awaiting FCM).
- ✅ Turbo pipeline runs lint/tests for mobile & shared packages (Vitest covers task store/formatter).
- ✅ Member page modularised; join requests refresh; mobile uses Zustand store with reminder banner.
- ✅ Supabase Storage bucket `attachments` + RLS ready; upload/download signing APIs verified.
- ✅ `bootstrap_organization` RPC released; frontend still pending migration.
- ✅ Preview/production APK installs and login succeed; push temporarily downgraded to email notice.

## 2. Sprint Deliverables

### Sprint 1 · Auth & Org Foundations
- ✅ Unified Supabase client for web/mobile auth.
- ✅ Shared email/password login & registration helpers.
- ✅ Auto bootstrap of organisation + default group + owner member.
- ✅ Core RLS & helper views in place.

### Sprint 2 · Admin Dashboard
- ✅ Next.js dashboard shell with navigation & org switcher.
- ✅ Member management (role/status updates, removal, RLS messaging).
- ✅ Group CRUD and membership management.
- ✅ Task centre (create/assign/review, execution summary).
- ✅ Invite / join request flows with admin approval.
- ✅ Tag management (categories, tags, member tagging, task filtering).
- ✅ Turbo pipeline covering mobile/shared lint & test.

### Sprint 3 · Mobile Task Experience
- ✅ Mobile task list by org/group; status transitions; wording aligned with web.
- ✅ Tag self-serve mirrored on mobile.
- ✅ Completion note modal with real-time review feedback.
- ✅ Zustand refactor + reminder banner.
- ⬜ Attachment upload UI & richer reminders still outstanding.

### Sprint 4 · Closed-Loop Validation
- ✅ `task-notifier` consumes queue, sends email, keeps push hook.
- ✅ Edge Scheduler runs every 5 minutes for reminders.
- ✅ `/dashboard/analytics` visualises task metrics.
- ✅ `task-reminder` writes back reminder timestamps.
- ⬜ Expo push token enrolment & device sync pending (temporarily downgraded with warning).
- ⬜ End-to-end manual scripts for web/mobile pending.

## 3. Risks & Open Items

- ⏳ Wire Turbo pipeline into CI and collect coverage.
- ⏳ Finalise SES / Expo Push credentials and monitoring.
- ⬜ Configure FCM, upload Server Key, finish push integration.
- ⬜ Build user-facing attachment upload & listing on web/mobile.
- ⬜ Add bulk approval & historical filters for tag requests.
- ⬜ Storybook / extended unit tests remain on backlog.
- ⏳ Ensure migrations `0015`–`0017` applied in all environments.
- ⏳ Detect and auto-heal orphan organisations (owner without membership).

## 4. Focus for Upcoming Iterations

1. ⏳ **Notification channel readiness**  
   - Lock in SES credentials, add queue logging & retry policy.  
   - Complete FCM setup, store device tokens, run full push flows.  
   - See `docs/integration-setup-notifications-storage.md`.

2. ⏳ **Attachment & storage UX**  
   - Hook signed upload APIs into web/mobile UI, persist metadata, show file lists.  
   - Introduce storage service abstraction to prepare for R2/S3 migration.  
   - Apply size/type quotas per organisation/member.

3. ⏳ **Organisation bootstrap & healing**  
   - Migrate web `OrgBootstrap` to use `bootstrap_organization` RPC.  
   - Provide auto-heal script to reattach owners & default groups.  
   - Run healing on historical data to remove orphan records.

4. ⬜ **Mobile caching & offline**  
   - Introduce AsyncStorage/MMKV + React Query or Zustand persist.  
   - Use `updated_at` / Realtime for delta refresh, add offline prompts & retry queue.  
   - Evaluate lightweight aggregation service if needed.

5. ⬜ **Task experience upgrades**  
   - New options: require attachments, allow post-submit edits, support review rollback.  
   - Support recurring tasks (daily/weekly/monthly).  
   - Deliver lightweight task creation & progress views on mobile.

6. ⏳ **Monitoring & operations**  
   - Add Sentry/Logflare for Edge Functions & Scheduler.  
   - Document deploy/rollback playbooks, ensure secrets aligned.  
   - Maintain QA checklist (see `docs/qa-checklist.md`).

## 5. Backlog / Future Ideas

- 📝 Task attachments: UI integration, required attachments, edit policy, review rollback.  
- 📝 Task archive: add archived state, search & metrics.  
- 📝 Recurring tasks: auto-create instances by rule.  
- 📝 Push reactivation: complete FCM setup and replace current warning.  
- 📝 Mobile task creation: quick publish & progress dashboards.  
- 📝 Caching & sync spec: document caching strategy for web/mobile.

## 6. Documentation

- `docs/integration-setup-notifications-storage.md` — notification & storage setup guide.  
- `docs/manual-test-notifications-storage.md` — manual testing steps for notification/attachments.  
- `docs/qa-checklist.md` — regression checklist for releases.  
- Future: caching/offline design, org auto-heal playbook, deployment handbook.

---

> Keep this roadmap in sync with actual progress. When new risks or features emerge, update the corresponding sections so that planning and testing remain aligned.***
