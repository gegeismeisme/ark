# 项目局部总结（通知体系 & 移动端聚焦）

## Monorepo 结构总览
- **apps/web**：Next.js 16 应用，核心页面位于 `app/`，业务逻辑集中在 `lib/`，静态资源放在 `public/`。
- **apps/mobile**：Expo / React Native 项目，入口文件 `App.tsx`，`app.config.ts` 负责 Expo 配置，资源置于 `assets/`。
- **packages/shared**：共享 TypeScript 工具与认证封装，统一通过 `@project-ark/shared` 引入。
- **supabase**：包含 `config.toml`、Edge Functions（`task-notifier`、`task-reminder`）、SQL 迁移脚本。
- **docs**：环境、QA、验收等流程文档；新增通知链路与移动端体验的操作指南。

## 通知体系现状
- **Edge Function 模板双语化**：`task-notifier` 使用中文 / 英文邮件模板，`TASK_NOTIFY_LOCALE` 控制默认语言。
- **多通道推送**：移动端同时上报 Expo、FCM（及预留 APNs）Token，`user_device_tokens` 新增 `provider` 字段；后端按 provider 分发。
- **调度机制**：
  - `supabase/config.toml` 维持任务函数配置，Scheduler 通过 CLI 命令下发；运行 `pnpm exec supabase update` 后再执行 `pnpm exec supabase db push` 可避免 `scheduler` 解析错误。
  - `task-notifier/scheduler` 每 5 分钟消费队列；`task-reminder` 任务用于逾期与即将到期提醒。
- **存储 & QA**：脚本 `pnpm qa:attachments` 校验附件桶和签名上传逻辑；`docs/manual-test-notifications-storage.md` 补充了 FCM 测试说明。

## 移动端体验优化
- **附件与任务流程**
  - `useAttachmentActions` 聚合 Expo `Constants.extra` 与 manifest 来源，保障打包环境能读取 `EXPO_PUBLIC_WEB_BASE_URL`。
  - `TaskList`、`AssignmentCard`、`AttachmentPanel`、`CompletionModal` 重构后支持「接受 → 执行 → 完成」闭环，并仅在完成弹窗提供附件上传入口。
  - 列表与弹窗实时展示附件清单，支持上传、刷新、下载。
- **推送令牌同步**：`usePushToken` 并行处理 Expo、FCM/APNs Token；未配置推送时给出“暂以邮件提醒”提示。
- **Safe Area 支撑**：`App.tsx` 使用 `SafeAreaProvider` 与底部 Padding，避免被设备导航键遮挡；项目引入 `react-native-safe-area-context`。
- **文案本地化**：移动端主要提示语采用中文文案（已转为 UTF-8 直写），提升可读性。

## Web 仪表盘补充
- `/dashboard/analytics` Summary Card 提供完成率、验收率、逾期比例、提醒覆盖等指标。
- `/dashboard/playground` 页面用于在无真实数据场景下预览 UI 组件。

## 自动化与文档更新
- 新增 `docs/验收过程.md`（验收清单）与更新版 `docs/MVP-task-plan.md`，聚焦通知监控、指标挖掘、移动端优化、Storybook 计划。
- `docs/scheduler-commands.md` 记录 Edge Scheduler 的 CLI 配置步骤。

## 环境准备与执行要点
1. 运行 `pnpm install`（新增 QA 依赖 `@supabase/supabase-js`、移动端 Safe Area 依赖等）。
2. 顺序执行：
   ```bash
   pnpm exec supabase update
   pnpm exec supabase db push
   pnpm exec supabase functions deploy task-notifier --no-verify-jwt
   pnpm exec supabase functions deploy task-reminder --no-verify-jwt
   ```
3. Scheduler 需通过 `docs/scheduler-commands.md` 中的 CLI 指令创建。
4. 环境变量：SMTP、FCM、`TASK_NOTIFY_LOCALE`、`EXPO_PUBLIC_WEB_BASE_URL` 等需在 Web / Mobile / Edge Functions 中分别配置。

## 后续关注方向
- **通知监控**：接入 Sentry / Logflare，补充失败重试与告警策略。
- **指标深挖**：扩展完成率、逾期率、附件趋势的分析维度与导出能力。
- **移动端迭代**：实现任务发布入口、补充 Detox / 组件测试。
- **文档与工具**：完善 Storybook / Playground 体系及排错指南。
