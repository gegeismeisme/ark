## Mobile 状态总览（2025-11-12）

### 1. 架构与基础设施

- Expo + React Native 0.81，使用 `app.config.ts` 注入 Supabase、Web Base URL、附件大小和 EAS 项目 ID，移动端与 Web 共用 @project-ark/shared。
- `App.tsx` 统一管理 Supabase 会话、i18n、四个底部 Tab（任务/发布/洞察/账户）以及 ScrollView 刷新；SafeArea + StatusBar 包装。

### 2. 任务执行流

- `useAssignments` + `zustand` 负责任务拉取/缓存/错误状态，存储在 `taskStore` 并复用于多组件。
- `TaskList` 内含状态筛选、提醒、模态、Checklist、Review、到期过滤；挂载 `useTaskAttachments` 以获取附件状态。
- 附件：`useTaskAttachments` + `useAttachmentActions` 结合本地缓存、pending-upload 队列与 API 签名上传，支持离线读取/上传/下载/重试。
- 离线：`useOfflineQueue` + `offlineQueue.ts` 维护任务状态更新的 outbox，`usePendingAttachmentSummary` 将附件草稿数量显示为底部导航徽章。

### 3. 发布与组织协作

- `PublishForm` 通过模板、Checklist、附件要求和分享链接创建任务；成功后刷新任务和组织数据。
- `useActiveOrganization`、`useOrganizationMembers` 提供当前组织与成员列表，支撑任务页提示与发布指派。
- `useInvites` + `InvitePanel` 处理邀请码兑换、请求列表展示，以及账号页的手动刷新。

### 4. 洞察与通知

- `InsightsPanel` 基于任务缓存计算 KPI、状态/Review breakdown、模板排行榜、附件统计、7 日趋势。
- `usePushToken` 注册 Expo/native Token 写入 `user_device_tokens`，失败时在 App 中 Alert。
- `StatusToast` + 任务页提醒卡显示离线队列/附件错误，保持同步状态可视。

### 5. 工程与测试

- `pnpm --filter mobile` 任务：Expo dev/start、`tsc --noEmit` lint、Vitest 单测、Maestro/Detox e2e。Vitest 使用 jsdom + RN stub。
- `e2e/README.md` 规定 Maestro/Detox 流程与 env；核心烟囱覆盖“登录 → 发布 → 完成”。
- `.env` 需要配置 `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`、`EXPO_PUBLIC_WEB_BASE_URL`、`EXPO_PUBLIC_SHARE_BASE_URL` 等，缺失将导致附件上传/分享失败。

### 6. 风险与后续关注

- 附件上传高度依赖 `webBaseUrl`/shareBaseUrl，环境变量缺失会直接阻断功能，需要在上线前验证。
- Pending 附件草稿目前只在用户手动重试时上传，缺少离线队列那样的自动 flush 策略，弱网场景可能长期堆积。
- 若后续将离线能力扩展到发布/附件等，需要抽象 job schema，避免 offline queue 只支持 assignmentStatus 的现状。

### 7. 待修复清单（前后端协同）

1. **环境配置回收**：前端确认 `.env` / `app.config.ts` 中的 `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`、`EXPO_PUBLIC_WEB_BASE_URL`、`EXPO_PUBLIC_SHARE_BASE_URL` 等变量齐备，并在后端验证 `/api/storage/*`、`/api/tasks/*` 签名接口在新域名下可达，防止附件/分享入口继续报错。
2. **附件草稿自动同步**：改造 `pendingAttachmentUploads` 管道，让前端在恢复联网或进入任务页时触发自动重试；后端补充可返回冲突/鉴权错误码，供前端在 UI 中区分“需用户处理”与“可后台重传”。
3. **离线队列抽象**：把 `useOfflineQueue` 及 `offlineQueue.ts` 从仅支持 `assignmentStatus` 升级为通用 job schema，允许后端新增任务（如附件提交、发布草稿）时共享同一 outbox，并统一 StatusToast 告警。
4. **发布流程验收**：前端在 `PublishForm` 中落实 share link 缺失时的 fallback（禁用前给出具体原因），后端同步检查 `redeem_org_invite` 和发布 API 的权限/速率限制，避免用户在组织切换或网络波动下出现未知错误。

### 8. 登录/组织体验重构计划
- **登录 UI 重构**：重写 `AuthPanel` 及首屏结构，按“工作系”深浅配色呈现注册/登录切换，并保留第三方登录按钮占位，交互只保留邮箱登录；删除“登录即强制建组织”的分支，成功后直接进入主 Tab。
- **账户入口与姓名编辑**：主界面顶部展示用户姓名（取自 `profiles.full_name`），点击进入账户页；账户页支持双击姓名进入编辑态，提交后调用 API 更新 `profiles.full_name`。
- **组织创建入口迁移**：在账户页新增“创建组织”区块，包含组织名称/描述以及“我在该组织的姓名”字段；登录成功不再弹出组织创建引导。
- **数据库&API 调整**：
  - `profiles` 表已有 `full_name` 字段，用于全局显示名；新增前端表单与 API 以支持修改。
  - `organization_members` 表新增 `display_name text`（默认 null），存储组织级别的个人别名；更新相关视图（如 `organization_member_details`、`join_request_details`）与 RPC，让返回结果可携带此字段。
  - 组织创建、邀请码兑换等流程在写入成员关系时同步写入 `display_name`，并扩展 `@project-ark/shared` 中的类型定义供前端消费。

### 9. 进展记录（Step 1）
- App 登录路由：`App.tsx` 在未登录时渲染全屏双调色块，包含暗色 hero 区（`app.login.hero*` 文案）与浅色表单区，统一了进入态的视觉语言，并移除旧的“Panel+标题”结构。
- 表单组件：`AuthPanel` 新增表单标题/副标题、社交登录占位（Google/Microsoft/Apple）与说明文案，第三方按钮仅做 UI 占位，保留 SSO 点位；提交/找回密码仍复用原逻辑。
- 样式：`layoutStyles.ts` 引入 `WORK_DARK/WORK_LIGHT` 等配色常量，补充 `authHeroSection`、`authFormCard`、`authSocial*` 等样式，确保所有按钮、图标只使用深/浅两种基色。
- 文案：`en.json`、`zh.json` 添加 hero 与社交相关翻译（共 16 条），保持中英视觉一致；编译通过 `pnpm --filter mobile lint`。
- 补充：根据最新稿件将 hero 改为“单词占位”形式，并把社交登录改成横向三个小图标；对应移除了冗余文案、更新 `layoutStyles` 中的 hero/social 样式，lint 仍通过。
- 二次微调（Step 1 持续）：登录页改为蓝色主色，hero 文案随登录/注册模式切换；注册模式新增“确认密码”输入及前端校验（含多语言提示）；未登录时改用独立 SafeArea 布局避免下拉空白。相关代码：`App.tsx`（confirm password、双分支布局）、`AuthPanel.tsx`（新增输入行+图标行）、`layoutStyles.ts`（蓝色基调）、`en/zh.json`（新增提示），并通过 `pnpm --filter mobile lint`。
- 三次微调：为避免切换登录/注册时 hero 块抖动，将 `authScreen`/`authShell` 设置为 `flex:1 + space-between`，使 hero 固定在顶部、表单贴底；登录态仍禁用滚动区域。涉及 `layoutStyles.ts` 调整，lint 已通过。
- 组件拆分：新增 `AuthHero`、`AuthFormCard`、`AuthModeToggle`、`AuthSocialProviders`，`AuthPanel` 仅负责字段/按钮逻辑，`App.tsx` 的未登录视图改为 hero + 表单卡片 + 社交组件三段式布局，易于后续维护与扩展。卡片高度固定 (`minHeight`)，表单字段/按钮堆叠在 `authFieldsBlock` 与 `authActionsBlock` 中，切换登录/注册时不再拉伸 hero；第三方登录区域包裹在独立圆角容器内。
- 继续调平：`authFormCard` 改成固定高度并在 `AuthFormSections` / `authPanelStack` 中使用 `justifyContent: 'space-between'`，字段区+按钮区按照剩余空间自动均分；同步把第三方登录 view 改成有标题的圆角容器，间距更一致。
- 主页/账户首版：`HomeHeader`、`HomeSummaryCards`、`HomeTaskList` 组合出仪表盘（问候语、4 块 Summary、当日任务），`App.tsx` 任务 Tab 直接加载新布局，并保留原 TaskList 作为“全部任务”；账户 Tab 切换为 `AccountScreen`，支持双击编辑用户名、展示菜单列表、可发起组织创建（`CreateOrganizationCard` 使用 Supabase `bootstrap_organization` RPC）。新增 `useProfile` hook 维护 `profiles.full_name`，配套 i18n（`home.*`、`account.*`）与样式（`home*`、`account*` 系）。`pnpm --filter mobile lint` 已通过。
