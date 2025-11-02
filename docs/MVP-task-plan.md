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
- ✅ `bootstrap_organization` RPC shipped（frontend 整合进行中）.
- ✅ Preview/production APK builds succeed; email notifications 替代推送告警.
- ✅ Web & Mobile previously 展示 “附件即将上线” 占位；Web 端现已接入真实上传流程.
- ✅ `heal_orphan_organizations()` repairs orphaned organisation data.

## 2. Sprint Deliverables

### Sprint 1 · Auth & Org Foundations

- ✅ Unified Supabase client for Web and Mobile authentication.
- ✅ Shared email/password login & registration helpers.
- ✅ Org bootstrap（organisation + default group + owner member）.
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
- ⚠️ Completion modal supports live review feedback（UI ready，待附件&通知协同）.
- ✅ Zustand store refactor + reminder banner.
- ✅ Web & Mobile 附件已打通：签名上传、Supabase 存储、移动端挑选/下载与必传校验。

### Sprint 4 · Closed-Loop Validation

- ⚠️ `task-notifier` email channel active; SES rollout & push channel still pending.
- ⚠️ Edge Scheduler 5-minute polling wired; needs production schedule.
- ⚠️ `/dashboard/analytics` task metrics view waiting implementation.
- ⚠️ `task-reminder` backfills `*_sent_at` fields（todo）.
- ⚠️ Expo push token registration & diagnostics to be finalised.
- ⏳ Admin/client end-to-end scripts still 在积压。

## 3. Risks & Open Items

- ⚠️ Extend Turbo pipeline into CI and coverage reporting.
- ⚠️ Notification stack: final SES creds, monitoring, and fallback policies.
- ⚠️ Expo Push: create FCM project, upload server key, end-to-end test（当前提示用户使用邮件兜底）.
- ⚠️ Attachment UX: surface uploads on Mobile UI、允许强制附件、审批回退流程.
- ⚠️ Tag approvals: add bulk operations and historical filters.
- ⚠️ Testing: Storybook + broader unit coverage remain open.
- ✅ Data migrations `0015`–`0019` landed; environments aligned.
- ✅ Orphan organisations handled via `heal_orphan_organizations()`（详见 `docs/org-heal-guide.md`）.

## 4. Focus for Upcoming Iterations

1. ⚠️ **Notification Delivery**
   - 完成 SES 配置，补充队列日志与重试策略。
   - 完成 FCM wiring 以恢复推送。
   - 参考 `docs/integration-setup-notifications-storage.md`。
2. ⚠️ **Attachments & Storage**
   - ✅ Web/Mobile 使用 Supabase 签名上传并持久化任务附件，移动端可预览与下载。
   - ⚠️ 后续补齐批量上传、离线/弱网重试、附件删除与容量/配额策略。
3. ⚠️ **Org Creation & Self-Healing**
   - 前端切换到 `bootstrap_organization` RPC。
   - 定期执行或管控台触发 `heal_orphan_organizations()` 并记录日志。
4. ⚠️ **Mobile Caching & Offline**（参见 `docs/caching-offline-plan.md`）
   - 引入持久化 store、增量同步、离线提示与重试队列。
   - 评估轻量聚合接口以减少往返。
5. ⚠️ **Task Experience Upgrades**
   - 支持发布时是否强制附件、提交后可否二次编辑。
   - 调整验收拒绝后的回滚/重启流程。
   - 规划周期任务（每日/每周/每月）。
   - 提供移动端简易发布与进度总览。
6. ⚠️ **Ops & Monitoring**
   - 将 Edge Functions/Scheduler 日志纳入 Sentry 或 Logflare。
   - 维护部署/回滚手册与环境一致性。
   - 持续更新 QA checklist (`docs/qa-checklist.md`)。

## 5. Backlog / Ideas

- ⚠️ Attachment policies: mandatory uploads, approval reopen flows, version history.
- ⚠️ Task archiving & historical search.
- ⚠️ Recurring task generator & templates.
- ⚠️ Refresh client messaging once push notifications return.
- ⚠️ Mobile lightweight publishing view.
- ⚠️ Implement caching/offline plan end to end.

## 6. References

- `docs/integration-setup-notifications-storage.md`
- `docs/manual-test-notifications-storage.md`
- `docs/qa-checklist.md`
- `docs/org-heal-guide.md`
- `docs/caching-offline-plan.md`
