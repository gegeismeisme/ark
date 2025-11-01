# MVP Roadmap (Updated)

## 1. Current Status

- [x] Monorepo managed with pnpm + Turborepo; Supabase connectivity verified.
- [x] Web (Next.js) & Mobile (Expo) share auth module and support cross-device login.
- [x] Database schema / views / RLS synced via `pnpm exec supabase db push`.
- [x] First login auto-creates organisation, default group, and owner membership.
- [x] Admin dashboard covers members, groups, tasks, invites, join requests, tags.
- [x] Task loop delivered: submission → review → notification → analytics.
- [x] Tag system supports category maintenance, self-service tagging, task filtering.
- [x] `task-notifier` + Edge Scheduler send emails; push channel reserved (FCM pending).
- [x] Turbo pipeline runs lint/tests for mobile & shared packages (Vitest coverage).
- [x] Member page modularised; mobile uses Zustand store with reminder banner.
- [x] Supabase Storage bucket `attachments` + RLS ready; signing APIs verified.
- [x] `bootstrap_organization` RPC released (frontend migration pending).
- [x] Preview/production APK installs succeed; push currently downgraded to email notice.
- [x] Web & Mobile display “attachments coming soon” notice to reserve upload entry points.
- [x] `heal_orphan_organizations()` function created for orphaned data repair.

## 2. Sprint Deliverables

### Sprint 1 · Auth & Org Foundations

- Unified Supabase client for web/mobile auth.
- Shared email/password login & registration helpers.
- Auto bootstrap of organisation + default group + owner member.
- Core RLS & helper views in place.

### Sprint 2 · Admin Dashboard

- Next.js dashboard shell (navigation & organisation switcher).
- Member management：role/status updates, removal, RLS prompts.
- Group CRUD & membership management.
- Task centre：create/assign/review with execution summary.
- Invite/join flows：links + admin approval + remarks.
- Tag management：categories、tags、member mapping、task filtering.
- Turbo pipeline covering mobile/shared lint & tests.

### Sprint 3 · Mobile Task Experience

- Mobile task list by organisation/group，status transitions，文案与 Web 对齐。
- Tag self-service mirrored on mobile。
- Completion modal with 实时审核反馈。
- Zustand store 重构 + 提醒卡片。
- 附件上传与提醒优化待补齐。

### Sprint 4 · Closed-Loop Validation

- `task-notifier` 邮件通路就绪，预留推送。
- Edge Scheduler 5 分钟轮询提醒。
- `/dashboard/analytics` 显示任务统计。
- `task-reminder` 写回 `*_sent_at`。
- Expo Push token 注册、日志脚本待完善。
- 管理端 / 客户端 E2E 脚本待补充。

## 3. Risks & Open Items

- 接入 Turbo pipeline → CI → 覆盖率统计。
- 通知链路：SES / FCM 正式密钥与监控。
- Expo Push：搭建 FCM 项目、上传 Server Key、端到端联调（当前改提示）。
- 附件体验：Web / Mobile 接入签名上传、列表展示。
- 标签审批：补充批量操作、历史筛选。
- 测试体系：Storybook / 更多单测仍在 backlog。
- 数据迁移：确认 `0015` ~ `0018` 全部执行。
- 组织“孤儿数据”：通过 `heal_orphan_organizations()` 自愈（见《docs/org-heal-guide.md》）。

## 4. Focus for Upcoming Iterations

1. 通知通道落地

   - SES 正式配置、队列日志化、失败重试。
   - 完成 FCM 配置，恢复移动端推送。
   - 参考《docs/integration-setup-notifications-storage.md》。

2. 附件与存储完善

   - Web/Mobile 整合上传 UI → 签名上传 → 元数据落库 → 列表展示。
   - 抽象存储服务接口，预留迁移 R2/S3。
   - 设定存储配额与类型/大小限制。

3. 组织创建 & 数据自愈

   - 前端改用 `bootstrap_organization` RPC。
   - 使用 `heal_orphan_organizations()` 批量修复历史数据。
   - 定期运行或接入后台工具。

4. 移动端缓存与离线体验（见《docs/caching-offline-plan.md》）

   - 引入持久化 store、增量同步、离线提示与重试队列。
   - 评估轻量聚合服务减少 round-trip。

5. 任务体验升级

   - 发布时支持附件必填、提交后可编辑控制。
   - 审批驳回支持回退/重启任务。
   - 支持按日/周/月等周期性任务。
   - 移动端提供精简任务发布与进度视图。

6. 监控与运维

   - Edge Functions / Scheduler 接入 Sentry/Logflare。
   - 编写部署/回滚手册，保持环境变量一致。
   - 维护 QA 文档（见《docs/qa-checklist.md》）。

## 5. Backlog / Ideas

- 附件体验：必填、编辑策略、审核回退。
- 任务归档与历史检索。
- 周期任务自动生成。
- 推送恢复后更新客户端提示。
- 移动端轻量任务发布视图。
- 缓存/同步方案文档与实现。

## 6. References

- `docs/integration-setup-notifications-storage.md`
- `docs/manual-test-notifications-storage.md`
- `docs/qa-checklist.md`
- `docs/org-heal-guide.md`
- `docs/caching-offline-plan.md`
