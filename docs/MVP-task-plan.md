# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace
- [x] Web (`apps/web`) and mobile (`apps/mobile`) dev environments verified locally
- [x] Supabase project provisioned; schema synced via migrations

## Sprint 1 · Auth & Org Foundations (Week 1)
- [x] Connect Supabase client across web and mobile shells
  - Shared client singletons in `apps/web/lib/supabaseClient.ts` and `apps/mobile/src/lib/supabaseClient.ts`
- [x] Implement email/password auth flows (sign up, sign in, reset)
  - Shared auth actions/hooks from `@project-ark/shared`
  - Web `AuthGate` and mobile `App.tsx` consume shared state and feedback patterns
- [x] Create organization bootstrapping flow for first-time users
  - Web bootstrap component at `apps/web/app/components/org-bootstrap.tsx` integrated into the signed-in `AuthGate`
  - Supabase migrations: `0003_adjust_org_visibility.sql` (owner visibility pre-membership) and `0004_harden_membership_predicates.sql` (helper predicates run as definer to avoid recursive RLS)
  - Flow seeds owner membership and default `General` group with admin membership
- [ ] Build invitation flow (pending member records + email invite trigger)
- [x] Establish shared types and helpers in `packages/shared`
- [x] Design GDPR-ready user lifecycle data model and audit logging plan

## Sprint 2 · Admin Dashboard (Week 3)
- [x] Lay out Next.js admin shell（Sidebar + Topbar + 组织切换）
  - [x] `OrgProvider` + `OrgSwitcher` 实现组织上下文持久化（localStorage）并在仪表盘中公用
- [x] Member 目录支持角色 & 状态管理
  - [x] 管理员可升/降级、停用、移除成员，保留 RLS 错误提示
  - [ ] 邀请流程（待 Sprint 1 的“邀请 Flow”一起完成）
- [x] 小组管理支持 CRUD
  - [x] 管理员可创建小组、添加/移除成员、调整小组角色
- [x] 任务中心：面向小组的任务创建与指派，写入 `tasks`/`task_assignments`
- [ ] Turbo pipeline updates：补齐 mobile/shared 的 lint/test/build 脚本

## Sprint 3 · Mobile Task Experience (Week 5)
- [ ] Home task list via Supabase (TanStack Query)
- [ ] Task detail view with receipt and completion actions
- [ ] Local task state sync (Zustand) for optimistic updates
- [ ] Attachment upload flow (Expo ImagePicker / DocumentPicker)
- [ ] Basic in-app notifications banner for new tasks

## Sprint 4 · Closed-Loop Validation (Week 7)
- [ ] Edge Function to fan out task assignments and push notifications
- [ ] Expo push notification wiring and device token management
- [ ] Deadline reminder job (cron/Edge Scheduler)
- [ ] Admin analytics snapshot (task counts, completion, overdue)
- [ ] End-to-end rehearsal covering task lifecycle from creation to archive

## Cross-Cutting Requirements
- [ ] Storybook or UI catalog for shared components
- [ ] Automated testing: unit (shared), component (web), end-to-end smoke
- [ ] Observability: Supabase RLS policies validated and documented
- [ ] Security review checklist before inviting pilot users

## Backlog · 标签体系与派发优化
- [ ] 成员标签系统
  - 组织管理员维护公共标签（如“班主任”“年级负责人”）
  - 小组管理员可追加小组特有标签
  - 成员可为自己添加个人标签（需审批机制待定）
  - 任务派发时支持按标签筛选/批量指派
- [ ] 标签与权限策略评估（标签可见性、RLS 约束、标签更新审计）

## Manual Validation (Sprint 1 scope)
- [ ] Sign up a new user, verify email, and log in via web `AuthGate`.
- [ ] Confirm the organization bootstrap card renders only when the user lacks memberships.
- [ ] Create an organization; ensure the form handles duplicate slug errors gracefully.
- [ ] Verify Supabase tables: new organization row, matching owner membership, seeded `General` group, and creator added as group admin.
- [ ] Check dashboard groups list for the seeded `General` entry and create an additional group to confirm membership auto-assignment.

## Manual Validation (Sprint 2 scope)
- [ ] 登录后自动跳转/按钮进入 `/dashboard`，确认组织切换器持久化当前选择。
- [ ] 在 “成员管理” 中尝试升降级角色、切换状态、移除非拥有者成员，验证 RLS 错误友好提示。
- [ ] 创建额外小组，添加/移除成员并调整小组角色，确保管理员数量限制生效。
- [ ] 在 “任务中心” 选择小组，创建任务，设置截止时间并指派多名成员；检查 Supabase 中 `tasks`、`task_assignments` 记录。
- [ ] 刷新仪表盘列表，确认任务与成员统计实时更新。
