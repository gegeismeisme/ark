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
- [x] Lay out Next.js admin shell (sidebar, topbar, organization switcher shell)
  - [ ] Persist org switcher selection and hydrate active org context
- [x] Member directory with role/status management (read-only)
  - [ ] Add admin promotion/demotion, removals, and invite handling UI
  - [ ] Surface RLS errors and loading states gracefully
- [x] Group creation + membership UI (initial)
  - [ ] Manage group membership CRUD and admin elevation
- [ ] Task composer for group-scoped tasks, persist to Supabase
- [ ] Turbo pipeline updates: lint/test/build per app and shared package

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

## Manual Validation (Sprint 1 scope)
- [ ] Sign up a new user, verify email, and log in via web `AuthGate`.
- [ ] Confirm the organization bootstrap card renders only when the user lacks memberships.
- [ ] Create an organization; ensure the form handles duplicate slug errors gracefully.
- [ ] Verify Supabase tables: new organization row, matching owner membership, seeded `General` group, and creator added as group admin.
- [ ] Check dashboard groups list for the seeded `General` entry and create an additional group to confirm membership auto-assignment.
