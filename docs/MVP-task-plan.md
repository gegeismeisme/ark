# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace
- [x] Web (`apps/web`) and mobile (`apps/mobile`) dev environments verified locally
- [ ] Supabase project provisioned and environment variables committed to `.env` templates

## Sprint 1 路 Auth & Org Foundations (Week 1鈥?)
- [x] Connect Supabase client across web and mobile shells
  - [x] Add `@supabase/supabase-js` to web & mobile packages (mobile also needs `@react-native-async-storage/async-storage`)
  - [x] Create `apps/web/lib/supabaseClient.ts` with env-driven client singleton
  - [x] Create `apps/mobile/src/lib/supabaseClient.ts` with AsyncStorage-backed client
  - [x] Verify env keys exclude service-role usage in client bundles
- [x] Implement email/password auth flows (sign up, sign in, reset)
  - [x] Web: build `LoginForm` client component and surface session state on `page.tsx`
  - [x] Mobile: render login screen in `App.tsx` with session listener + sign out
  - [x] Handle loading/error feedback and ensure session persistence
- [ ] Create organization bootstrapping flow for first-time users
- [ ] Build invitation flow (pending member records + email invite trigger)
- [x] Establish shared types and Supabase helpers in `packages/shared`
  - [x] Define shared auth/session types (`AuthUser`, `AuthState`, etc.)
  - [x] Implement `useSupabaseAuthState` hook consuming shared client helpers
  - [x] Provide shared auth actions (sign-in, sign-up, reset, sign-out)
  - [x] Refactor web `AuthGate` to use shared auth logic
  - [x] Refactor mobile `App.tsx` auth flow to use shared auth logic
- [x] Design GDPR-ready user lifecycle data model
  - [x] Extend profile/organization tables with `deleted_at`, `erasure_requested_at`
  - [x] Document account erasure workflow (request -> confirm -> purge)
  - [x] Plan audit logging table for consent and deletion records

## Sprint 2 路 Admin Dashboard (Week 3鈥?)
- [ ] Lay out Next.js admin shell (sidebar, topbar, organization switcher)
- [ ] Member directory with role/status management
- [ ] Group (blind channel) creation + membership management UI
- [ ] Task composer for group-scoped tasks, persisting to Supabase
- [ ] Turbo pipeline updates: lint/test/build per app and shared package

## Sprint 3 路 Mobile Task Experience (Week 5鈥?)
- [ ] Home task list fed by Supabase queries (TanStack Query)
- [ ] Task detail view with receipt and completion actions
- [ ] Local task state syncing (Zustand) for optimistic updates
- [ ] Attachment upload flow (Expo ImagePicker / DocumentPicker)
- [ ] Basic in-app notifications banner for new tasks

## Sprint 4 路 Closed-Loop Validation (Week 7鈥?)
- [ ] Edge Function to fan out task assignments + push notifications
- [ ] Expo push notification wiring and device token management
- [ ] Deadline reminder job (cron/Edge Scheduler)
- [ ] Admin analytics snapshot (task counts, completion, overdue)
- [ ] End-to-end rehearsal covering task lifecycle from creation to archive

## Cross-Cutting Requirements
- [ ] Storybook or UI catalog for shared components (optional but recommended)
- [ ] Automated testing: unit (shared package), component (web), end-to-end smoke
- [ ] Observability: Supabase RLS policies validated and documented
- [ ] Security review checklist before inviting pilot users
