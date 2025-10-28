# MVP Task Plan (v2)

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace
- [x] Web (`apps/web`) and mobile (`apps/mobile`) dev environments verified locally
- [x] Supabase project provisioned; schema synced via migrations

## Sprint 1 · Auth & Org Foundations (Week 1)
- [x] Connect Supabase client across web and mobile shells
  - `apps/web/lib/supabaseClient.ts`, `apps/mobile/src/lib/supabaseClient.ts`
- [x] Implement email/password auth flows (sign up, sign in, reset)
  - Web `AuthGate` uses shared actions and auth state
- [x] Create organization bootstrapping flow for first-time users
  - Web prompt when user has no memberships
  - Insert `organizations` (owner_id = auth.uid(), slug), upsert owner into `organization_members`, seed `General` group
  - Files: `apps/web/app/components/org-bootstrap.tsx`, integrated in `auth-gate.tsx`
- [x] Establish shared types and helpers in `packages/shared`
- [x] Data model for GDPR lifecycle and audit logs

## Sprint 2 · Admin Dashboard (Week 3)
- [x] Lay out Next.js admin shell (sidebar, topbar, org switcher)
  - Files: `apps/web/app/dashboard/layout.tsx` (+ links to Overview/Members/Groups)
  - TODO: org switcher with persisted selection
- [x] Member directory with role/status management
  - Read-only list for now: `apps/web/app/dashboard/members/page.tsx`
  - TODO: promote/demote admin, remove member, invite pending; surface RLS errors
- [x] Group creation + membership UI (initial)
  - Create/list groups: `apps/web/app/dashboard/groups/page.tsx`
  - TODO: add/remove member UI and admin elevation
- [ ] Task composer for group-scoped tasks, persist to Supabase
- [ ] Turbo pipeline updates: lint/test/build per app and shared

## Sprint 3 · Mobile Task Experience (Week 5)
- [ ] Home task list via Supabase (TanStack Query)
- [ ] Task detail with receipt/completion actions
- [ ] Local task state sync (Zustand) for optimistic updates
- [ ] Attachment upload flow (Expo ImagePicker / DocumentPicker)
- [ ] Basic in-app notifications banner

## Sprint 4 · Closed-Loop Validation (Week 7)
- [ ] Edge Function: fan out task assignments + push notifications
- [ ] Expo push notifications + device tokens
- [ ] Deadline reminder job (cron/Edge Scheduler)
- [ ] Admin analytics snapshot (task counts, completion, overdue)
- [ ] End-to-end rehearsal: creation → assignment → completion → archive

## Cross-Cutting Requirements
- [ ] Storybook/UI catalog for shared components
- [ ] Automated testing: unit (shared), component (web), e2e smoke
- [ ] Observability: RLS policies validated and documented
- [ ] Security review checklist before pilot users
