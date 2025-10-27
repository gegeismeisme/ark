# MVP Task Plan

## Current Status
- [x] Monorepo bootstrapped with pnpm workspace
- [x] Web (`apps/web`) and mobile (`apps/mobile`) dev environments verified locally
- [ ] Supabase project provisioned and environment variables committed to `.env` templates

## Sprint 1 · Auth & Org Foundations (Week 1–2)
- [ ] Connect Supabase client across web and mobile shells
- [ ] Implement email/password auth flows (sign up, sign in, reset)
- [ ] Create organization bootstrapping flow for first-time users
- [ ] Build invitation flow (pending member records + email invite trigger)
- [ ] Establish shared types and Supabase helpers in `packages/shared`

## Sprint 2 · Admin Dashboard (Week 3–4)
- [ ] Lay out Next.js admin shell (sidebar, topbar, organization switcher)
- [ ] Member directory with role/status management
- [ ] Group (blind channel) creation + membership management UI
- [ ] Task composer for group-scoped tasks, persisting to Supabase
- [ ] Turbo pipeline updates: lint/test/build per app and shared package

## Sprint 3 · Mobile Task Experience (Week 5–6)
- [ ] Home task list fed by Supabase queries (TanStack Query)
- [ ] Task detail view with receipt and completion actions
- [ ] Local task state syncing (Zustand) for optimistic updates
- [ ] Attachment upload flow (Expo ImagePicker / DocumentPicker)
- [ ] Basic in-app notifications banner for new tasks

## Sprint 4 · Closed-Loop Validation (Week 7–8)
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

