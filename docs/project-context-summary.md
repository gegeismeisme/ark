# Project Ark 上下文摘要

本文档汇总当前仓库结构、通知体系进展及短期行动项，便于后续协作。

## Monorepo 结构速览
- `apps/web`：Next.js 16 仪表板与任务管理前端，业务入口位于 `app/`，共享逻辑在 `lib/`，Tailwind 4 + ESLint/Vitest 已配置。
- `apps/mobile`：Expo/React Native 客户端，核心逻辑集中于 `src/`，`useAttachmentActions`、`usePushToken` 等 hook 聚合端上行为。
- `packages/shared`：`@project-ark/shared` 导出认证相关类型、Supabase 会话 hooks 与动作方法，供 Web/移动端复用。
- `supabase`：Edge Functions（`task-notifier`、`task-reminder`）、SQL 迁移与 `config.toml`；新增 Scheduler 计划任务。
- `docs`：包含环境搭建、通知存储手册、MVP 规划等知识库，本总结归档于此目录。
- `scripts`：`qa/attachment-flow.mjs` 等自动化脚本由 Turbo 脚手架统一调度。

## 通知体系现状
- **多语言模板**：`task-notifier` Edge Function 已拆分中/英文模板，`TASK_NOTIFY_LOCALE` 决定发送语言。
- **多通道推送**：`user_device_tokens` 表新增 `provider` 字段，客户端可同时上报 Expo、FCM、APNs token，实现双通道推送。
- **Scheduler 调度**：`supabase/config.toml` 启用 `scheduler`，每 5 分钟触发 `/task-notifier/scheduler`，每 30 分钟触发 `/task-reminder`；CLI 需升级至 ≥2.54 才能解析后执行 `supabase update` 与 `db push`。
- **QA 自动化**：新增 `pnpm qa:attachments` 检测附件桶与签名上传链路。
- **文档更新**：`docs/manual-test-notifications-storage.md` 补充 FCM 测试流程；新增 `docs/验收过程.md` 阐述验收清单；`docs/MVP-task-plan.md` 聚焦通知监控、指标体系与移动端优化。

## Web 仪表板亮点
- `/dashboard/analytics` Summary Cards 展示完成率、验收率、逾期比例、提醒覆盖等核心指标。
- `/dashboard/playground` 提供组件演示页，便于在缺少真实数据时预览 UI 与交互。

## 移动端交付要点
- `useAttachmentActions` 合并多种 `Constants.extra` 来源，解决打包环境无法读取 `EXPO_PUBLIC_WEB_BASE_URL` 的问题。
- `usePushToken` 同步 Expo/FCM(APNs) token，若未能注册推送，会提示“暂以邮件提醒”。
- `.env` 仍沿用 `EXPO_PUBLIC_WEB_BASE_URL=https://unsieved-candace-monarchally.ngrok-free.dev`，保持与 Web 的跳转衔接。

## Supabase 与基础设施
- `task-notifier/process.ts` 负责组装多语言通知正文、调度邮件与推送。
- `task-reminder` Edge Function 定期扫描逾期任务，配合 Scheduler 形成提醒闭环。
- `supabase/migrations` 记录通知表结构演进，新增字段需同步更新手动测试清单。
- 本地 CLI 操作顺序：`pnpm exec supabase update` → `pnpm exec supabase db push` → 部署 Edge Functions。

## 当前环境准备与待办
- 依赖安装：`pnpm install`（引入 `@supabase/supabase-js` 等 QA 依赖）。
- 环境变量：配置 SMTP、FCM、`TASK_NOTIFY_LOCALE`、`EXPO_PUBLIC_WEB_BASE_URL` 等。
- 部署：执行 supabase 同步命令后，再部署 `task-notifier` 与 `task-reminder`。

## 下一步建议
- **通知监控**：落地 Sentry / Logflare，记录重试与失败上下文。
- **指标深挖**：扩展完成率、逾期率、附件使用趋势与导出能力。
- **移动端**：实现任务发布入口并筹备 Detox 测试。
- **设计体系**：完善 Storybook / Playground 及排错文档，支撑跨端 UI 对齐。
