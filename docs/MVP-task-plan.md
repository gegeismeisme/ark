# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace and shared Supabase environment.
- [x] Web (`apps/web`) and mobile (`apps/mobile`) development environments verified locally.
- [x] Supabase project provisioned; schema synced via migrations.
- [x] Organization bootstrap flow seeds owner membership, default group, and admin entry.
- [x] Supabase membership views (`organization_member_details`, `group_member_details`) adopted by dashboards.
- [ ] Invitation workflow (carried over to align with Sprint 2 delivery).

## Sprint 1 - Auth & Org Foundations (Week 1)
- [x] Connect Supabase client across web and mobile shells.
- [x] Implement email/password auth flows with shared hooks from `@project-ark/shared`.
- [x] Create organization bootstrapping flow for first-time users.
- [ ] Build invitation flow (to be shipped alongside notification strategy).
- [x] Establish shared types and utilities in `packages/shared`.
- [x] Design GDPR-ready lifecycle data model and audit logging plan.

## Sprint 2 - Admin Dashboard (Week 3)
- [x] Next.js admin shell (sidebar, top bar, organization switcher with persistence).
- [x] Member management: role changes, status toggles, removals with Supabase view + RLS feedback.
- [x] Group management: create groups, add/remove members, adjust roles, enforce at least one admin.
- [x] Task center: create group tasks, assign members, set deadlines.
- [ ] Invitation flow (shared requirement with Sprint 1, pending notification/email delivery).
- [ ] Turbo pipeline updates: add mobile/shared lint & test skeletons.

## Sprint 3 - Mobile Task Experience (Week 5)
- [ ] Home task list (TanStack Query + Supabase real-time sync).
- [ ] Task detail view (receipt and completion actions).
- [ ] Local optimistic state (Zustand store).
- [ ] Attachment upload (Expo ImagePicker / DocumentPicker).
- [ ] In-app notification banner for new tasks.

## Sprint 4 - Closed-Loop Validation (Week 7)
- [ ] Edge Function to fan out task assignments and push notifications.
- [ ] Expo push notifications and device token management.
- [ ] Deadline reminder job (Edge Scheduler / cron).
- [ ] Admin analytics snapshot (assignment counts, completion, overdue).
- [ ] End-to-end rehearsal: create -> assign -> complete -> archive.

## Cross-Cutting Requirements
- [ ] Storybook or UI catalog for shared components.
- [ ] Automated testing: unit (shared), component (web), end-to-end smoke.
- [ ] Observability: document and validate Supabase RLS policies.
- [ ] Security review checklist before onboarding pilot users.

## Backlog - Tagging System & Assignment Priorities
- [ ] Member tagging
  - Organization admins maintain global tags (for example “班主任”, “年级负责人”).
  - Group admins can add group-specific tags.
  - Members may request self-tags (approval workflow TBD).
  - Task dispatch supports filtering and bulk assignment by tag.
- [ ] Tag permission strategy: visibility, RLS constraints, audit requirements.

## Manual Validation - Sprint 2
- [ ] Log in and confirm automatic redirect to `/dashboard`; verify organization switcher persists selection.
- [ ] In “成员管理” adjust roles and statuses, remove non-owner members, and confirm friendly RLS errors.
- [ ] In “小组管理” create a group, check automatic admin membership, add/remove members, and ensure admin minimum enforcement.
- [ ] In “任务管理” create a task with deadline and multiple assignees; inspect `tasks` and `task_assignments`.
- [ ] Refresh the dashboard to confirm task and member updates appear immediately.

## Upcoming Focus
1. Finalize invitation and notification flow (Edge Functions + mail service).
2. Kick off the mobile task experience (Sprint 3 scope).
3. Design tagging and permission strategy ahead of Sprint 4 rollout.
