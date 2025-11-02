# MVP Roadmap（2025-11-02 更新）

## 1. 当前状态

- ✅ Monorepo（pnpm + Turborepo）联通 Supabase，Web / Mobile 共享认证能力。
- ✅ 首次登录自动引导创建组织、默认小组与 owner 成员；`heal_orphan_organizations()` 已上线并在 `docs/org-heal-guide.md` 留存记录。
- ✅ Web 后台模块化：组织成员、邀请链接、加入申请、标签管理、任务面板与数据分析均已成型。
- ✅ 任务闭环打通：派发 → 执行 → 验收 → 通知 → 指标；附件上传 / 下载在 Web & Mobile 两端统一。
- ✅ Tag 系统支持类别配置、成员自我贴标签、审批流程；`task-notifier` + Edge Scheduler 提供邮件提醒（推送待接入 FCM）。
- ✅ Turbo pipeline 至少覆盖 lint；移动端 Zustand & 提示 Banner 已完成重构。
- ✅ `/organizations` 目录页改为分页列表，支持模糊搜索、申请状态展示；`bootstrap_organization` RPC 已上线，前端接入进行中。
- ✅ 移动端已支持任务列表、执行明细与附件操作，底部导航与状态筛选一并完成；Expo 推送 Token 采集提示已接入。
- 🚧 Sprint 4 剩余工作：SES 模板完善、Edge Scheduler 上线、指标看板细化、通知链路监控。
- 🚧 待办：组件 Storybook、FCM 推送、移动端 UI 系统化测试等。

## 2. Sprint 交付

### Sprint 1 · Auth & Org Foundations

- ✅ Supabase 通用客户端（Web / Mobile）登录注册。
- ✅ 组织初始化（组织 + 默认小组 + Owner 成员）。
- ✅ 核心 RLS 及视图/存储过程。

### Sprint 2 · Admin Dashboard

- ✅ Next.js 通用布局、导航与组织切换。
- ✅ 成员管理：角色 / 状态切换、邀请与加入申请、可见性设置。
- ✅ 小组管理：列表、分页、成员维护与快速创建。
- ✅ 任务中心：弹窗派发、标签筛选、附件要求、执行明细（分页）。
- ✅ 标签管理：类别分页、标签增删、成员贴标签面板。
- ✅ Turbo pipeline 覆盖 lint，数据层接口统一。

### Sprint 3 · Mobile Task Experience

- ✅ 任务列表 / 详情、状态流转与附件上传下载。
- ✅ 状态提示（Zustand）、任务完成弹窗、附件预览面板与底部导航重构。
- 🚧 后续：任务发布入口占位 & 组件化 QA 方案。

### Sprint 4 · Closed-Loop Validation

- 🚧 `task-notifier` 邮件通道（SES 模板、监控）。
- 🚧 Edge Scheduler 部署验证。
- 🚧 `/dashboard/analytics` 指标细化与可视化。
- 🚧 `task-reminder` backfill、FCM 推送准备。

## 3. 风险与待解决项

1. **通知链路**SES 域名认证、模板多语言、监控与重试策略需落地。FCM 项目创建、Server Key 管理、端侧容错仍在排期。
2. **附件体验**大文件上传、离线缓存与失败重试尚未覆盖。需要考虑附件版本、删除、敏感信息审计。
3. **Bootstrapping**Web 前端需全面接入 `bootstrap_organization` RPC；定期执行 `heal_orphan_organizations()` 并记录审计。
4. **离线与缓存**依据 `docs/caching-offline-plan.md` 构建离线策略、同步回放与冲突处理。
5. **任务体验升级**是否强制附件、验收退回、重新排期等高级流程设计。支持周期性任务、任务模板与快速派发。
6. **运维监控**
   Edge Functions / Scheduler 接入 Sentry 或 Logflare。
   持续完善 QA checklist 与自动化测试。

## 4. 即将推进重点

1. **标签 & 成员看板本地化**

   - 已完成小组 / 成员页面中文化与分页提示，本周继续处理标签页文案和交互提示。

2. **移动端任务中心后续**

   - 规划任务发布占位交互与组织入口整理。
   - 完成移动端附件/弹窗流程的 QA 清单与回归用例。

3. **通知通道梳理**

   - SES 模板 + Edge Scheduler 正式部署。
   - 明确 FCM 集成计划与凭据存储策略。

4. **文档 & QA**

   - 附件流程、邀请策略更新文档。
   - 补充移动端重构后的手动测试清单。

## 5. Backlog / Idea Pool

- 附件版本管理、敏感审批流程。
- 历史任务归档与搜索。
- 任务模板 / 常用派发快捷操作。
- 推送策略统一：邮件 + FCM 聚合。
- 移动端仪表盘（发布概览 / 数据统计）。
- 全链路离线与冲突回放机制。

## 6. 参考文档

- `docs/integration-setup-notifications-storage.md`
- `docs/manual-test-notifications-storage.md`
- `docs/qa-checklist.md`
- `docs/org-heal-guide.md`
- `docs/caching-offline-plan.md`
