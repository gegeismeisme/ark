# MVP Roadmap (Updated)

## 1. Current Status

- ✅ Monorepo managed with pnpm + Turborepo; Supabase connectivity confirmed.
- ✅ Web (Next.js) and Mobile (Expo) share the auth layer and support cross-device login.
- ✅ Database schema, views, and RLS stay in sync via `pnpm exec supabase db push`.
- ✅ First login auto-creates an organisation, default group, and owner membership.
- ✅ Admin dashboard covers members, groups, tasks, invites, join requests, and tags.
- ✅ Task loop delivered end to end: submission → review → notification → analytics.
- ✅ Tag system supports categories, self-tagging, and task filtering.
- ✅ `task-notifier` + Edge Scheduler deliver email notifications (push reserved for FCM).
- ✅ Turbo pipeline runs lint and Vitest for mobile and shared packages.
- ✅ Member dashboard is modular; mobile uses Zustand and reminder banner.
- ✅ Supabase Storage bucket `attachments` + signing APIs verified.
- ✅ `bootstrap_organization` RPC shipped (frontend migration underway).
- ✅ Preview/production APK builds succeed; email notifications substitute push for now.
- ✅ Web & Mobile show “attachments coming soon” placeholders.
- ✅ `heal_orphan_organizations()` repairs orphaned organisation data.

## 2. Sprint Deliverables

### Sprint 1 · Auth & Org Foundations

- ✅ Unified Supabase client for Web and Mobile authentication.
- ✅ Shared email/password login & registration helpers.
- ✅ Org bootstrap (organisation + default group + owner member).
- ✅ Core RLS + helper views in place.

### Sprint 2 · Admin Dashboard

- ✅ Next.js dashboard shell with navigation & organisation switcher.
- ✅ Member management: role/status updates, removal, RLS hints.
- ✅ Group CRUD & membership controls.
- ✅ Task centre: create, assign, review, execution summary.
- ✅ Invite/join flows: links, approvals, remarks.
- ✅ Tag management: categories, tags, member mapping, task filters.
- ✅ Turbo pipeline covering mobile/shared lint + tests.

### Sprint 3 · Mobile Task Experience

- ✅ Mobile task list by organisation/group with status transitions matching Web copy.
- ✅ Mobile self-tagging kept in sync with backend.
- 🚧 Completion modal supports live review feedback (UI ready, awaiting attachments & notifications).
- ✅ Zustand store refactor + reminder banner.
- 🚧 Attachment upload + reminder UX polish (entry points in place; backend wiring pending).

### Sprint 4 · Closed-Loop Validation

- 🚧 `task-notifier` email channel active; SES rollout & push channel still pending.
- 🚧 Edge Scheduler 5-minute polling wired; needs production schedule.
- 🚧 `/dashboard/analytics` task metrics view waiting implementation.
- 🚧 `task-reminder` backfills `*_sent_at` fields (todo).
- 🚧 Expo push token registration & diagnostics to be finalised.
- ⏳ Admin/client end-to-end scripts still in backlog.

## 3. Risks & Open Items

- 🚧 Extend Turbo pipeline into CI and coverage reporting.
- 🚧 Notification stack: final SES creds, monitoring, and fallback policies.
- 🚧 Expo Push: create FCM project, upload server key, end-to-end test (currently warning users).
- 🚧 Attachment UX: surface uploads on Web/Mobile UI, persist metadata, list files.
- 🚧 Tag approvals: add bulk operations and historical filters.
- 🚧 Testing: Storybook + broader unit coverage remain open.
- ✅ Data migrations `0015`–`0018` landed; environments aligned.
- ✅ Orphan organisations handled via `heal_orphan_organizations()` (see `docs/org-heal-guide.md`).

## 4. Focus for Upcoming Iterations

1. 🚧 **Notification Delivery**
   - Complete SES configuration, add queue logging and retries.
   - Finish FCM wiring to restore push notifications.
   - Reference `docs/integration-setup-notifications-storage.md`.
2. 🚧 **Attachments & Storage**
   - Wire Web/Mobile flows: select → sign upload → PUT file → persist metadata → list files.
   - Abstract storage service to keep the door open for R2/S3.
   - Define quotas and size limits to protect the bucket.
3. 🚧 **Org Creation & Self-Healing**
   - Swap frontend to `bootstrap_organization` RPC.
   - Schedule periodic `heal_orphan_organizations()` runs or admin tooling.
   - Record runs for auditability.
4. 🚧 **Mobile Caching & Offline (see `docs/caching-offline-plan.md`)**
   - Add persistent store, delta sync, offline toasts, retry queue.
   - Explore lightweight aggregation endpoints to reduce round-trips.
5. 🚧 **Task Experience Upgrades**
   - Optional attachment requirement on publish; control post-submit edits.
   - Review rejection flow for rollbacks/restarts.
   - Support recurring tasks (daily/weekly/monthly).
   - Provide lightweight publish & progress views on mobile.
6. 🚧 **Ops & Monitoring**
   - Pipe Edge Functions/Scheduler logs into Sentry or Logflare.
   - Maintain deploy/rollback playbooks + env parity.
   - Keep QA checklist (`docs/qa-checklist.md`) up to date.

## 5. Backlog / Ideas

- 🚧 Attachment policies: mandatory uploads, approval reopen flows, version history.
- 🚧 Task archiving & historical search.
- 🚧 Recurring task generator & templates.
- 🚧 Refresh client messaging once push notifications return.
- 🚧 Mobile lightweight publishing view.
- 🚧 Implement caching/offline plan end to end.

## 6. References

- `docs/integration-setup-notifications-storage.md`
- `docs/manual-test-notifications-storage.md`
- `docs/qa-checklist.md`
- `docs/org-heal-guide.md`
- `docs/caching-offline-plan.md`
