# MVP Task Plan

## 当前进度

- ✅ Monorepo 已使用 pnpm workspace + Supabase 环境就绪。
- ✅ Web（Next.js）与 Mobile（Expo）端均可启动并通过共享 Auth 模块登录。
- ✅ Supabase schema、视图与 RLS 策略同步完毕，核心触发器通过 `pnpm exec supabase db push` 验证。
- ✅ 组织创建流程：初始用户自动成为 owner，默认生成管理小组与管理员成员。
- ✅ Web 仪表盘完善成员、群组、任务、邀请与加入申请等管理功能。
- ✅ 任务闭环：成员提交 → 管理员审核 → Edge Function 通知 → Analytics 汇总。
- ✅ 标签体系：组织/小组管理员可维护类别与标签，成员支持自助申请，发布任务时可按标签筛选。
- ✅ Edge Scheduler + `task-notifier` 已联通邮件通道，占位等待正式 SMTP/推送密钥。
- ✅ Turbo pipeline（mobile/shared lint & test）已接入：统一 `turbo lint` / `turbo test`，覆盖 shared & mobile。
- ✅ 组织成员页组件化，加入申请支持刷新并展示申请人姓名/邮箱。
- ✅ Mobile 端切换至 Zustand 状态管理并补齐 Vitest 覆盖（task store / formatter）。

## Sprint 1 · Auth & Org Foundations（Week 1）

- ✅ 接入 Supabase client，统一 web / mobile 鉴权上下文。
- ✅ `@project-ark/shared` 暴露 email/password 登录注册逻辑。
- ✅ 首次登录自动创建组织、默认小组及管理员成员。
- ✅ 构建组织/成员基础 RLS 与视图函数。

## Sprint 2 · Admin Dashboard（Week 3）

- ✅ Next.js 仪表盘框架：顶栏、侧边导航、组织切换。
- ✅ 成员管理：角色切换、状态更新、移除成员、RLS 返回提示。
- ✅ 小组管理：创建/解散小组、成员增删、角色分配、管理员校验。
- ✅ 任务中心：创建任务、指派成员、截止时间、执行明细与审核流程。
- ✅ 邀请与加入申请：生成/撤销邀请链接，成员申请、管理员审批、自助备注。
- ✅ 标签管理：类别维护、标签增删、成 员标签分配、任务按标签筛选。
- ✅ Turbo pipeline 补齐 mobile/shared lint & test。

## Sprint 3 · Mobile Task Experience（Week 5）

- ✅ Expo 任务列表：按组织/小组聚合、状态切换、详情复用 Web 文案。
- ✅ 自助标签申请：客户端支持提交/撤回，状态与 Web 保持一致。
- ✅ 完成说明弹窗：成员可补充说明，审核结果实时回传。
- ✅ Zustand store 重构 + 任务提醒横幅。
- ⏳ 附件上传与更丰富的任务提醒体验待实现。

## Sprint 4 · Closed-Loop Validation（Week 7）

- ✅ `task-notifier` Edge Function：消费 `task_notification_queue`，发送邮件并预留推送。
- ✅ Edge Scheduler：5 分钟轮询一次，驱动提醒、到期/逾期通知。
- ✅ `/dashboard/analytics` 仪表卡片：任务数量、完成率、审核结果、逾期统计。
- ✅ `task-reminder` Function：根据 `task_assignments` 中的提醒时间驱动通知，写回 `*_sent_at` 字段。
- ⏳ Expo Push token 注册、设备表落库、推送联调待补齐。
- ⏳ 客户端/管理端串联“发布 → 执行 → 验收 → 归档”全链路脚本待记录。

## 待办与风险

- Turbo pipeline：已具备基础脚本，后续接入 CI 并完善覆盖率报告。
- 通知通道：上线前需配置正式 SMTP、推送渠道，补充密钥管理与告警。
- Expo Push integration：实现 token 注册、退订、推送降级策略。
- 自助标签审批需补充批量操作与历史筛选（可列入后续 Sprint）。
- Storybook / 单元测试仍在 backlog，后续逐步引入。
- 数据库迁移：执行 `pnpm exec supabase db push` 应用 `0015_join_request_details.sql`（提供 `list_org_join_requests` RPC）。

## 下一步建议

1. **通知通道落地**：完成 SMTP、Expo Push、监控与重试策略。
2. **客户端细化**：实现附件上传、任务内图文说明、状态跳转动画。
3. **Turbo pipeline**：统一 lint/test，准备 CI（GitHub Actions 或 Turborepo pipeline）。
4. **验收脚本**：整理管理端 & 客户端 E2E 手动脚本，为后续自动化打基础。
5. **标签扩展**：规划跨组织标签模板与权限矩阵，支撑更复杂筛选。
