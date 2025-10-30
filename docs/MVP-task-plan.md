# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace and shared Supabase environment。
- [x] Web (`apps/web`) 和 mobile (`apps/mobile`) 开发环境运行验证完毕。
- [x] Supabase 项目初始化并通过迁移保持 schema 同步。
- [x] 组织创建流程会自动写入 owner 会员、默认小组与管理员成员。
- [x] Supabase 视图 `organization_member_details` / `group_member_details` 已被管理端采纳。
- [x] 邀请工作流（链接生成、加入申请、移动端兑换）上线，邮件通知通道已实现队列与 Edge Scheduler，等待接入真实 SMTP 凭据。
- [x] 任务执行闭环：移动端可提交完成说明，管理员在 Web 端审核并推送邮件；任务分析仪表板展示执行、验收、逾期统计。
- [x] 成员标签管理：组织管理员可配置标签类别/标签，小组管理员可维护组内标签，成员标签支持任务指派时按标签筛选。
- [ ] Turbo pipeline 更新：补充 mobile/shared lint & test 骨架。

## Sprint 1 - Auth & Org Foundations (Week 1)
- [x] 接入 Supabase client，统一 web / mobile 鉴权环境。
- [x] 共享包 `@project-ark/shared` 暴露 email/password 登录注册逻辑。
- [x] 初次登录自动创建组织、默认小组及管理成员。
- [x] 邀请工作流（生成/兑换链接、加入申请）已与后续通知方案打通。
- [x] 共享类型与工具沉淀到 `packages/shared`。
- [x] 数据生命周期与审计方案设计完成。

## Sprint 2 - Admin Dashboard (Week 3)
- [x] Next.js 管理后台框架（侧栏、顶部导航、组织切换持久化）。
- [x] 成员管理：角色切换、状态更新、移除成员并返回 RLS 友好提示。
- [x] 小组管理：建组、成员增删、角色调整、至少一位管理员校验。
- [x] 任务中心：创建任务、指派成员、设置截止日期、查看执行明细。
- [x] 邀请与加入申请：生成链接、审核申请、写入组织成员。
- [x] 标签管理：组织管理员维护标签类别/标签，成员标签可在任务指派中筛选。
- [ ] Turbo pipeline：为 mobile/shared 纳入 lint 与测试脚手架。

## Sprint 3 - Mobile Task Experience (Week 5)
- [x] 移动端任务列表：统一多组织任务、状态筛选、开始/完成/重新打开流程。
- [x] 邀请与加入申请中心：邀请码兑换、申请列表、刷新入口。
- [x] 完成说明弹窗：成员可提交/编辑完成说明，状态更新即时回写。
- [ ] 本地乐观更新（Zustand store）。
- [ ] 附件上传（Expo ImagePicker / DocumentPicker）。
- [ ] 应用内任务提醒 banner。

### Sprint 3 · 实施记录
- `App.tsx` 重写模块拆分（Auth / Task / Invite），梳理 UI 状态与中文文案。
- `useAssignments` / `useInvites` Hook 统一指派与邀请加载、刷新和状态更新。
- 移动端完成说明弹窗 + 状态切换逻辑与 Web 端验收流程保持一致，为 Sprint 4 通知闭环铺路。

## Sprint 4 - Closed-Loop Validation (Week 7)
- [x] Edge Function & Scheduler：`task-notifier` 处理任务事件，定时轮询发送邮件；新增 `TASK_PORTAL_URL` 支持跳转。
- [ ] Expo push notifications 与设备 token 管理。
- [x] 截止提醒作业：Edge Scheduler 已配置，每 5 分钟拉取队列；需要补充实际提醒策略。
- [x] 管理端任务分析：`/dashboard/analytics` 使用 `task_assignment_summary` 展示指派、完成、验收与逾期指标。
- [ ] 端到端演练：创建 → 指派 → 成员完成 → 管理员验收 → 存档（待编写自动化或手动脚本）。

### Sprint 4 · 实施记录
- `supabase/migrations/0008_task_review_and_metrics.sql` 增加完成/验收字段、通知队列视图及触发器。
- `supabase/functions/task-notifier/` 提供队列消费、邮件发送及 Edge Scheduler 入口。
- 推送通道：`usePushToken` 在移动端注册 Expo Push 令牌并写入 `user_device_tokens`，Edge Function 按任务事件发送邮件 + Expo Push 通知。
- 新增 `task-reminder` Edge Function，定时扫描即将到期/已逾期的指派并入队提醒事件；`task_assignments` 增加提醒时间戳列。
- Web 端新增任务分析页面（任务列表 + 小组聚合 + 核心指标卡片）。
- 更新移动端 UI，突出验收状态、管理员备注与完成说明编辑。

## Cross-Cutting Requirements
- [ ] Storybook 或组件文档化。
- [ ] 自动化测试：shared 单测、web 组件测试、端到端冒烟。
- [ ] 监控与安全：整理 RLS 策略、补充安全审计清单。
- [ ] 设备通知配置：完成 Expo 推送、SMTP 凭据与日志追踪。

## Backlog - Tagging System & Assignment Priorities
- [ ] 成员标签
  - [x] 组织管理员维护全局标签（如“班主任”“年级负责人”），并可在“标签管理”中分配成员标签。
  - [x] 小组管理员维护组内标签（标签类别可绑定特定小组，组管理员可以创建并分配）。
  - [ ] 成员可申请自我标签（审批流程待定）。
  - [x] 任务派发支持标签过滤与批量指派。
- [ ] 标签权限策略：可见性、RLS 约束、审计需求。

## Manual Validation - Sprint 2
- [ ] 登录并确认自动重定向 `/dashboard`，组织切换器记住选择。
- [ ] 在“成员管理”调整角色和状态、移除非 owner 成员并验证 RLS 提示。
- [ ] 在“小组管理”建组、确认管理员自动加入、成员增删与至少一位管理员校验。
- [ ] 在“任务管理”创建任务（含截止时间、多成员），检查 `tasks` 与 `task_assignments` 数据。
- [ ] 刷新仪表盘确认成员/任务统计实时更新。

## Manual Validation - Sprint 3 & 4
> **Note:** 下列检查项仍为未完成状态，请在每个迭代周期结束前逐项确认并记录结果。
- [ ] 移动端登录后验证任务列表状态切换、完成说明提交、重新打开、完成说明编辑。
- [ ] 管理端“执行明细”中审核通过/调整任务，确认通知队列入库并通过 CLI 函数发送邮件。
- [ ] 访问 `/dashboard/analytics`，核对任务/小组维度的指派、完成、逾期统计。
- [ ] Edge Scheduler 运行后检查 `task_notification_queue.processed_at` 时间戳更新。
- [ ] 手动演练邀请 → 组织加入 → 任务指派 → 成员完成 → 管理员验收的完整闭环。
- [ ] 创建距离 24 小时内到期的任务，运行 `task-reminder` 并确认到期提醒邮件/推送与 Analytics 指标同步更新。
- [ ] 模拟逾期任务（修改截止时间或等待逾期），触发逾期提醒并验证 `due_reminder_sent_at` / `overdue_reminder_sent_at` 已更新、提醒事件被消费。
- [ ] 参考《notification-qa-checklist.md》完成邮件/推送全链路的冒烟测试并记录结果。

## Upcoming Focus
1. 补齐通知通道：配置 SMTP、集成 Expo Push，确保任务事件多端提醒。
2. 完成移动端乐观更新、附件上传与任务提醒，收束 Sprint 3 backlog。
3. 推进 Turbo pipeline + 自动化测试脚手架，保障后续特性迭代。
4. 准备端到端演练脚本，验证任务从创建到归档的全链路操作。
5. 扩展标签体系：补充小组级标签、成员自助申请与权限审计流程。
