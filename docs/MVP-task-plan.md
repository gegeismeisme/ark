# MVP 任务计划（最新）

## 一、当前进度概览

- ✅ Monorepo 采用 pnpm + Turborepo 管理，Supabase 环境已联通。
- ✅ Web（Next.js）与 Mobile（Expo）共享认证模块，可跨端登录。
- ✅ 数据库 schema / 视图 / RLS 通过 `pnpm exec supabase db push` 全量同步。
- ✅ 首次登录自动创建组织，生成默认小组并绑定管理员。
- ✅ Web 管理台覆盖成员、群组、任务、邀请、加入申请、标签等核心功能。
- ✅ 任务闭环：成员提交 → 管理员审核 → Edge Function 通知 → Analytics 汇总。
- ✅ 标签体系可维护类别与标签，成员支持自助申请，任务按标签筛选。
- ✅ `task-notifier` + Edge Scheduler 支持邮件与（预留）Expo Push，等待正式密钥。
- ✅ mobile/shared lint & test 接入 Turbo pipeline；Vitest 覆盖 task store / formatter。
- ✅ 成员页组件化，加入申请支持刷新；移动端采用 Zustand 状态管理。
- ✅ Supabase Storage 建立 `attachments` 桶及 RLS，签名上传 API 可用。
- ✅ `bootstrap_organization` RPC 发布，组织创建流程实现事务化。
- ✅ 移动端 Preview / Production 构建可通过 APK 安装并成功登录。
- ✅ 因 FCM 未配置，移动端推送暂时降级为提示，通知默认以邮件发送。

## 二、按 Sprint 划分的既有成果

### Sprint 1 · Auth & Org Foundations（Week 1）

- ✅ 接入 Supabase client，统一 web / mobile 鉴权。
- ✅ `@project-ark/shared` 提供邮箱密码登录注册逻辑。
- ✅ 首次登录自动建组织、默认小组与管理员成员。
- ✅ 完成组织 / 成员基础 RLS 与视图函数。

### Sprint 2 · Admin Dashboard（Week 3）

- ✅ Next.js 仪表盘框架（导航、组织切换）。
- ✅ 成员管理：角色切换、状态更新、移除成员、RLS 提示。
- ✅ 小组管理：增删小组、成员分配、角色校验。
- ✅ 任务中心：创建任务、指派成员、执行明细、审核流程。
- ✅ 邀请与申请：生成 / 撤销邀请链接，成员申请、审批、备注反馈。
- ✅ 标签管理：类别维护、标签增删、成员标签分配、任务按标签筛选。
- ✅ Turbo pipeline 接入 mobile / shared lint & test。

### Sprint 3 · Mobile Task Experience（Week 5）

- ✅ Expo 任务列表：按组织 / 小组聚合、状态切换、同步 Web 文案。
- ✅ 成员自助标签申请，与 Web 流程保持一致。
- ✅ 任务完成说明弹窗，审核结果实时回传。
- ✅ Zustand store 重构与任务提醒横幅。
- ⬜ 附件直传、提醒体验待补齐。

### Sprint 4 · Closed-Loop Validation（Week 7）

- ✅ `task-notifier` Edge Function 消费队列，发送邮件并预留 Push。
- ✅ Edge Scheduler 5 分钟轮询，驱动到期 / 逾期提醒。
- ✅ `/dashboard/analytics` 统计看板（任务、完成率、审核结果、逾期）。
- ✅ `task-reminder` Function 根据 `task_assignments` 写回 `*_sent_at`。
- ⬜ Expo Push token 注册、设备表留存、通知联调尚待完成（当前给出提示）。
- ⬜ 管理端 / 客户端链路脚本尚未完善。

## 三、待办与风险

- ⏳ Turbo pipeline 需接入 CI、完善覆盖率统计。
- ⏳ 通知通道：SES / Expo Push 正式密钥与监控告警需配置。
- ⬜ Expo Push：搭建 FCM 项目、上传 Server Key，完成端到端联调（当前改为提示）。
- ⬜ 附件体验：Web / 移动端整合签名上传入口、附件列表展示。
- ⬜ 标签审批：补充批量操作、历史筛选等高级功能。
- ⬜ 测试体系：Storybook / 更多单元测试仍在 backlog。
- ⏳ 数据库迁移：确认执行 `0015` ~ `0017` 并持续维护。
- ⏳ 组织“孤儿数据”风险：需要监控，提供自动修复脚本。

## 四、下一阶段重点方向

1. ⏳ **通知通道落地**

   - Amazon SES 正式配置、队列日志化、失败重试策略。
   - Expo Push：完成 FCM 配置、设备 token 落库与推送联调（解除临时提示）。
   - 参考《docs/integration-setup-notifications-storage.md》。

2. ⏳ **附件与存储完善**

   - Web / 移动端接入附件上传 UI，打通签名上传 → 元数据落库 → 列表展示。
   - 抽象存储服务接口，预留迁移 Cloudflare R2 / AWS S3 的能力。
   - 设置组织 / 成员存储配额、文件类型与大小限制。

3. ⏳ **组织创建 & 数据自愈**

   - 前端改用 `bootstrap_organization` RPC。
   - 编写自愈脚本：自动补齐缺失的 owner 成员、默认小组成员。
   - 对历史数据执行修复任务，避免“孤儿组织”。

4. ⬜ **移动端缓存与离线体验（新增）**

   - 引入本地缓存层（AsyncStorage / MMKV + React Query 或 Zustand persist）。
   - 列表先读缓存，再依据 `updated_at` 或 Realtime 做增量刷新。
   - 设计离线状态提示、失败重试队列，评估轻量中间层。

5. ⬜ **Web / Mobile 任务体验提升（新增需求）**

   - 任务发布支持设置“是否必须上传附件”，可配置提交后允许编辑。
   - 审批驳回支持回退 / 重新开启任务，记录历史操作。
   - 支持按日 / 周 / 月等周期任务，自动生成实例。
   - 在移动端提供轻量级任务发布和进度查看入口。

6. ⏳ **监控与运维**

   - Edge Functions / Scheduler 增加日志聚合（Sentry / Logflare）。
   - 编写部署 / 回滚手册，确保环境变量与 Storage 策略同步。
   - 建立 QA Checklist，覆盖通知、附件、组织事务化、缓存等关键流程。

## 五、功能规划（新增需求池）

- 📝 任务附件体验：补齐上传入口、附件必填控制、提交后编辑策略、审批回退机制。
- 📝 任务归档：提供归档状态与历史检索能力。
- 📝 周期性任务：支持按日 / 周 / 月等规则自动生成子任务。
- 📝 推送恢复：完成 FCM 配置后，恢复移动端推送并调整客户端提示。
- 📝 移动端轻量任务发布：提供管理者快捷发布、查看进度的界面。
- 📝 缓存与数据同步设计文档：明确前后端缓存策略、同步机制。

## 六、配套文档

- 《docs/integration-setup-notifications-storage.md》：通知与存储部署 / 调试指南。
- 《docs/manual-test-notifications-storage.md》：通知与附件手动测试流程。
- 后续计划：新增缓存 / 离线策略文档、组织自愈脚本说明、部署手册等。

---

> 本计划将随迭代持续更新。如新增需求或风险，请及时补充到“待办与风险 / 下一阶段重点方向”中，确保团队节奏与视图保持一致。\*\*\*
