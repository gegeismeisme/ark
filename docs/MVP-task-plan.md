# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace and shared Supabase env.
- [x] Web (`apps/web`) and mobile (`apps/mobile`) dev environments verified locally.
- [x] Supabase project provisioned; schema synced via migrations.
- [x] Organization bootstrap flow seeds owner membership, default小组, and admin entry.
- [x] Supabase membership views (`organization_member_details`, `group_member_details`) adopted by dashboards.
- [ ] Invitation workflow (carry-over to align with Sprint 2 delivery).

## Sprint 1 · Auth & Org Foundations (Week 1)
- [x] Connect Supabase client across web and mobile shells.
- [x] Implement email/password auth flows with shared hooks from `@project-ark/shared`.
- [x] Create organization bootstrapping flow for first-time users.
- [ ] Build invitation flow（保留需求，待角色/标签设计一并打通）.
- [x] Establish shared types/utilities in `packages/shared`.
- [x] Design GDPR-ready lifecycle data model and审计日志方案。

## Sprint 2 · Admin Dashboard (Week 3)
- [x] Next.js 管理后台框架（侧边栏 / Topbar / 组织切换器&持久化）。
- [x] 成员管理：角色、状态、移除操作接入 Supabase 视图与 RLS 反馈。
- [x] 小组管理：创建、成员增删、角色切换 + 自动保持至少一位管理员。
- [x] 任务中心：基于小组的任务创建、成员指派、截止时间设置。
- [ ] 邀请流程（与 Sprint 1 共用需求，等待通知/邮件投递方案）。
- [ ] Turbo pipeline updates：补齐 mobile/shared lint & test skeleton。

## Sprint 3 · Mobile Task Experience (Week 5)
- [ ] 首页任务列表（TanStack Query + Supabase 实时监听）。
- [ ] 任务详情页（状态流转、提交确认）。
- [ ] 本地乐观更新（Zustand 状态存储）。
- [ ] 附件上传（Expo ImagePicker / DocumentPicker）。
- [ ] 移动端任务通知横幅。

## Sprint 4 · Closed-Loop Validation (Week 7)
- [ ] Edge Function fan-out 任务指派与推送。
- [ ] Expo Push 通知、设备 token 管理。
- [ ] 截止提醒（Edge Scheduler / cron）。
- [ ] 管理端任务分析（完成率、逾期率、指派统计）。
- [ ] 端到端演练：创建 → 指派 → 完成 → 归档。

## Cross-Cutting Requirements
- [ ] Storybook / UI catalog for shared组件。
- [ ] 自动化测试：单元（shared）、组件（web）、端到端冒烟。
- [ ] Observability：RLS 策略校验、文档化。
- [ ] 安全审查清单（上线试点之前完成）。

## Backlog · 标签体系与派发优先级
- [ ] 成员标签系统
  - 组织管理员维护公共标签（如“班主任”“年级负责人”）。
  - 小组管理员可扩展小组专属标签。
  - 成员可为自己申请标签（审批机制待定）。
  - 任务指派支持按标签筛选批量分发。
- [ ] 标签与权限策略评估（可见性、RLS 约束、审计日志）。

## Manual Validation · Sprint 2
- [ ] 登录后自动跳转 `/dashboard`，确认组织切换器记住当前选择。
- [ ] 在“成员管理”中升/降级角色、切换状态、移除非拥有者成员，观察 RLS 失败提示是否明确。
- [ ] 在“小组管理”创建小组，自动成为管理员；添加/移除成员并验证管理员数量限制。
- [ ] 在“任务管理”选择小组创建任务，设置截止时间并指派多名成员，检查 `tasks` 与 `task_assignments` 记录。
- [ ] 刷新仪表盘，确认任务与成员数据即时更新。

## Upcoming Focus
1. 补齐邀请/通知流程（对接 Edge Functions & 邮件服务）。
2. 启动移动端任务体验（Sprint 3 目标）。
3. 设计标签与权限策略，预留 Sprint 4 推广。
