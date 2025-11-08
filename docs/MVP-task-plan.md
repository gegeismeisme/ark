# MVP Roadmap（2025-11-03 更新）

## 1. 当前状态

- ✅ Monorepo（pnpm + Turborepo）联通 Supabase，Web / Mobile 共享认证能力。
- ✅ 首次登录自动引导创建组织、默认小组与 owner 成员；`heal_orphan_organizations()` 已上线并在 `docs/org-heal-guide.md` 留存记录。
- ✅ Web 后台模块化：组织成员、邀请链接、加入申请、标签管理、任务面板与数据分析均已成型。
- ✅ 任务闭环打通：派发 → 执行 → 验收 → 通知 → 指标；附件上传 / 下载在 Web & Mobile 两端统一。
- ✅ Tag 系统支持类别配置、成员自我贴标签、审批流程；`task-notifier` 打通任务提醒。
- ✅ Turbo pipeline 至少覆盖 lint；移动端 Zustand & 提示 Banner 已完成重构。
- ✅ `/organizations` 目录页改为分页列表，支持模糊搜索、申请状态展示；`bootstrap_organization` RPC 已上线，前端接入进行中。
- ✅ 移动端已支持任务列表、执行明细与附件操作，底部导航与状态筛选一并完成；Expo 推送 Token 采集提示已接入。
- ✅ 通知链路多语言化：邮件模板支持 `zh-CN / en-US`，Edge Scheduler 自动调度 `task-notifier` 与 `task-reminder`。
- ✅ FCM 推送接入：移动端同时注册 Expo / FCM Token，服务端按 provider 分流发送。
- 🚧 Sprint 4 剩余工作：指标看板深度分析、通知链路监控告警。
- 🚧 待办：移动端 UI 系统化测试、组件 Storybook 等。

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
- 🚧 后续：任务发布入口占位、附件流程 QA 清单、移动端组件化测试。

### Sprint 4 · Closed-Loop Validation

- ✅ `task-notifier` 邮件模板本地化，Edge Scheduler 自动运行。
- ✅ FCM 推送通道接入，移动端完成 Expo / FCM 双 Token 注册。
- ✅ `/dashboard/analytics` Summary 卡片展示完成率、验收率、提醒覆盖等指标。
- 🚧 `task-reminder` backfill、通知告警与趋势可视化。

## 3. 风险与待解决项

1. **通知链路**模板多语言与 FCM 已接入，下一步需完善监控、重试策略与告警通道。
2. **附件体验**大文件上传、离线缓存与失败重试尚未覆盖。需要考虑附件版本、删除、敏感信息审计。
3. **Bootstrapping**Web 前端需全面接入 `bootstrap_organization` RPC；定期执行 `heal_orphan_organizations()` 并记录审计。
4. **离线与缓存**依据 `docs/caching-offline-plan.md` 构建离线策略、同步回放与冲突处理。
5. **任务体验升级**是否强制附件、验收退回、重新排期等高级流程设计。支持周期性任务、任务模板与快速派发。
6. **运维监控**
   Edge Functions / Scheduler 接入 Sentry 或 Logflare。
   持续完善 QA checklist 与自动化测试。

## 4. 即将推进重点

1. **通知监控增强**

   - 接入 Sentry / Logflare，沉淀告警策略与告警渠道。
   - 扩展 `task-reminder` backfill，记录历史补发情况。

2. **任务指标迭代**

   - 继续深挖完成率、逾期率在不同小组/时间段的表现。
   - 增加导出、趋势图等辅助分析能力。

3. **移动端体验优化**

   - 规划“任务发布入口”交互，实现底部导航中部的占位功能。
   - 补充附件提交、完成弹窗的 Detox/组件级自动化测试。

4. **文档与 Storybook**

   - 制定组件 Storybook / Playground 清单，完善主题及示例。
   - 更新邀请、通知、附件的排错指南，与验收流程联动。

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

## 7. 数据缓存落地

**计划**
- 引入基于 IndexedDB 的本地轻量数据库（Dexie 实现），统一存放组织级别的快照数据（小组、标签分类、成员、成员标签、标签申请等）。
- 在 Web 端数据 Hook（优先 `useTagManagement`）中，优先从本地缓存渲染，再异步拉取 Supabase 并更新缓存，确保刷新/切换组织时无白屏。
- 为缓存写入添加组织维度 Key 与时间戳，后续可扩展 TTL、离线冲突解决以及其他 Dashboard 模块的读写。

**本次执行（2025-11-08）**
- 新增 `apps/web/lib/cache/local-db.ts`，封装 Dexie 数据库及 `read/write/clear` 操作，所有快照以 `{key}:{orgId}` 命名确保隔离。
- `useTagManagement` 在刷新组织小组、标签分类、成员、成员标签、标签申请时，会立即回显缓存，成功命中远端后同步写回缓存，并在 org 变更时自动规避过期写入。
- 为 web 包补充 `dexie` 依赖并通过 ESLint/TS 校验，下一阶段将沿用同一缓存层推广至成员/任务等 Hook，并补充 TTL/失效与端到端验证。
