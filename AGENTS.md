# Repository Guidelines

This monorepo uses pnpm and Turborepo. It contains a Next.js web app, an Expo mobile app, and a shared TypeScript package, plus Supabase configuration and docs.

## Project Structure & Module Organization
- `apps/web` – Next.js 16 app. Source in `app/` and `lib/`; static assets in `public/`.
- `apps/mobile` – Expo/React Native. Entry `App.tsx`, config `app.config.ts`, assets in `assets/`.
- `packages/shared` – Shared TS utilities (auth helpers) exported from `src/index.ts`.
- `supabase` – Project config and SQL migrations in `migrations/*.sql`.
- `docs` – Onboarding and architecture notes.

Prefer importing shared code via the workspace package name (`@project-ark/shared`) rather than deep relative paths.

## Build, Test, and Development Commands
- Install: `pnpm install`
- Dev (monorepo): `pnpm dev` (runs all `dev` tasks; starts web).
- Web only: `pnpm --filter web dev`
- Mobile (Expo): `pnpm --filter mobile start` (or `android`/`ios`/`web`).
- Build all: `pnpm build` (Turbo runs package builds).
- Lint: `pnpm lint` (ESLint in `apps/web`).

## Coding Style & Naming Conventions
- TypeScript, 2‑space indentation, semicolons required.
- File names: kebab-case (e.g., `auth-gate.tsx`).
- React components: PascalCase exports; functions/variables: camelCase; types/interfaces: PascalCase.
- No deep cross-app imports; share via `@project-ark/shared`.
- Use ESLint autofix where available (`apps/web/eslint.config.mjs`).

## Testing Guidelines
Testing isn’t configured yet in this repo. Add co-located tests as `*.test.ts`/`*.test.tsx`. Prefer Vitest or Jest with Testing Library. Expose a `test` script per package so `turbo test` can orchestrate. Target ≥80% coverage for changed lines.

## Commit & Pull Request Guidelines
- Use Conventional Commits with scopes: `web`, `mobile`, `shared`, `supabase`, `docs`.
  - Example: `feat(web): add auth gate for protected routes`.
- PRs: include a clear description, linked issues (`Closes #123`), screenshots for UI changes, and notes on env/migration impacts. Ensure `pnpm build` and `pnpm lint` pass.

## Security & Configuration Tips
- Environment: follow `docs/environment-setup.md`. Never commit secrets.
- Web: `apps/web/.env.local` uses `NEXT_PUBLIC_*` for client-safe values; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Mobile: `apps/mobile/.env` uses `EXPO_PUBLIC_*` keys only.
- Database: add migrations under `supabase/migrations/` (e.g., `0002_add_table.sql`) and document breaking changes in PRs.

