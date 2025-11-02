# MVP Roadmap (Updated)

## 1. Current Status

- ✅ Monorepo (pnpm + Turborepo) wired with Supabase; auth flows shared across Web & Mobile.
- ✅ First-login bootstrap creates organisation、默认小组和所有者成员；`heal_orphan_organizations()` 修复孤立数据并已记录在 `docs/org-heal-guide.md`。
- ✅ Web 管理后台模块化：成员、邀请、加入申请、标签、任务中心、数据分析。
- ✅ 任务闭环已打通：派发 → 执行 → 验收 → 通知 → 统计；附件签名上传联通 Web & Mobile。
- ✅ Tag 系统支持类别、成员自标记与任务筛选；`task-notifier` + Edge Scheduler 提供邮件提醒（推送待 FCM 接入）。
- ✅ Turbo pipeline 跑 lint；移动端 Zustand 重构与提示 Banner 完成。
- ✅ `bootstrap_organization` RPC 已上线，前端正在切换接入点。
- ✅ 移动端支持任务执行、附件查看与上传；Expo 推送暂以邮箱提醒替代。
- ✅ `/organizations` 目录页改为分页列表，支持搜索、申请备注与审批状态展示。
- ⚙️ Sprint 4 部分事项推进中：邮件通道完善、Edge Scheduler 上线、分析面板可视化增量、推送管道。
- ⚙️ 缺口：CI 覆盖率、Storybook、FCM、通知监控、定时任务脚本。

## 2. Sprint Deliverables

### Sprint 1 · Auth & Org Foundations

- ✅ Supabase 通用客户端（Web/Mobile）登录注册。
- ✅ 组织引导（组织 + 默认小组 + Owner 成员）。
- ✅ 核心 RLS、视图与触发器。

### Sprint 2 · Admin Dashboard

- ✅ Next.js 仪表盘 + 导航 + 组织切换。
- ✅ 成员管理：角色/状态、移除、邀请、加入申请、可见性切换。
- ✅ 小组管理：列表、分页、成员维护、快速添加。
- ✅ 任务中心：任务发布（弹窗）、标签筛选、附件要求、执行明细弹窗（分页）。
- ✅ 标签管理：类别分页、标签增删、成员标签侧边面板（弹窗编辑）。
- ✅ Turbo pipeline 覆盖 lint；任务依赖的数据库视图、函数同步完成。

### Sprint 3 · Mobile Task Experience

- ✅ 任务列表/详情、状态流转、附件上传与查看与 Web 对齐。
- ✅ Zustand 重构 & 提醒 Banner。
- ⚙️ 完成弹窗待补交互说明（附件/通知与 Web 统一）。
- ⚙️ 推送 token 收集提示仍在展示；FCM 管道待激活。

### Sprint 4 · Closed-Loop Validation

- ⚙️ `task-notifier` 邮件通道激活（SES 凭据与监控进行中）。
- ⚙️ Edge Scheduler 验证成功，生产计划待配置。
- ⚙️ `/dashboard/analytics` 组件化完成，指标拓展（漏斗/趋势）排期中。
- ⚙️ `task-reminder` backfill、FCM 推送、运维脚本仍在 TODO。

## 3. Risks & Open Items

- ⚠️ 通知栈：SES 凭据、重试策略、监控与报警需完善。
- ⚠️ FCM：创建项目、上传 server key、全链路测试后替换当前的「忽略推送」提示。
- ⚠️ 附件体验：移动端批量上传、断点续传、版本历史待设计。
- ⚠️ Tag 审批：批量处理、历史记录筛选尚未实现。
- ⚠️ 测试建设：CI 覆盖率、Storybook、移动端 UI 快照仍缺位。
- ⚠️ Turbo pipeline 尚未集成覆盖率与单测；移动端自动化测试待定。

## 4. Focus for Upcoming Iterations

1. **通知投产**
   - 完成 SES 配置、模板、监控。
   - FCM 管线：token 注册、服务端推送、错误回退策略。
2. **附件与存储体验**
   - Web/Mobile 附件统一消息；移动端补充重命名/查看逻辑。
   - 规划批量上传、删除、容量报警。
3. **Org Bootstrapping**
   - 前端改用 `bootstrap_organization` RPC。
   - 运维脚本周期性执行 `heal_orphan_organizations()` 并记录日志。
4. **离线与缓存**
   - 按 `docs/caching-offline-plan.md` 落地离线存储、同步、冲突策略。
5. **任务体验升级**
   - 是否强制附件、验收退回、重复编辑流程。
   - 支持周期任务（按日/周/月）。
   - 移动端提供轻量发布与实时进度视图。
6. **Ops & Monitoring**
   - Edge Functions/Scheduler 接入 Sentry/Logflare。
   - 更新 QA checklist，固化手动测试脚本。

## 5. Backlog / Ideas

- 附件版本管理、批量操作。
- 历史任务归档与搜索。
- 任务模板、常用场景快速派发。
- 推送文案与策略在 FCM 生效后统一。
- 移动端轻量管理视图（发布/统计）。
- 全链路离线体验、灰度同步策略。

## 6. References

- `docs/integration-setup-notifications-storage.md`
- `docs/manual-test-notifications-storage.md`
- `docs/qa-checklist.md`
- `docs/org-heal-guide.md`
- `docs/caching-offline-plan.md`
