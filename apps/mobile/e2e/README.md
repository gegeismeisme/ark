# Mobile E2E Smoke Plan

This directory captures the cross-platform smoke scenarios we must keep green before promoting mobile builds. Each flow mirrors the classroom workflow the product now supports: sign in, recover the remembered organization, publish an assignment, and execute/complete that assignment while handling attachments.

## Test Matrix

| Tool | Target | Purpose |
| ---- | ------ | ------- |
| Maestro | Android/iOS simulators or real devices | High-level regression that stitches UI flows in a declarative YAML file. |
| Detox | iOS simulator (default) | Low-level UI automation with richer assertions and screenshots for release candidates. |

## Environment Variables

Both runners rely on the same secrets so that CI and local engineers can share credentials:

- `MAESTRO_APP_ID` / `DETOX_APP_ID` – bundle identifier (defaults to `com.projectark.dev`).
- `MAESTRO_USER_EMAIL` / `DETOX_USER_EMAIL` – test educator account.
- `MAESTRO_USER_PASSWORD` / `DETOX_USER_PASSWORD` – matching password.
- `MAESTRO_ORG_NAME` – human-readable organization to assert in the switcher.
- `MAESTRO_ASSIGNEE` – member name to target during publish.

Store these values in a `.env.e2e` file (not committed) and export them before running the scripts below.

## Maestro Flow

```
pnpm --filter mobile e2e:maestro
```

The `maestro/smoke.yaml` file walks through:

1. Launch → sign in with provided credentials.
2. Retry/skip the organization banner until the expected org name appears.
3. Jump into the Publish tab, pick the “Class feedback” template, and send a lightweight task.
4. Return to the Tasks tab, open the first row, upload an audio note (simulated), and complete the task.

## Detox Flow

```
pnpm --filter mobile e2e:detox
```

- Build the binary first via `expo run:ios --configuration Debug` (or wire up Android in `detox.config.ts`).
- The Jest-based `detox/smoke.test.ts` mirrors the Maestro steps but adds expectations for badges, offline toast states, and attachment gating.

## Adding Scenarios

1. Extend the Maestro YAML with another `flow` section or split into multiple files and `runFlow` them from `smoke.yaml`.
2. For Detox, create another spec (e.g., `org-switch.test.ts`) and register it inside `jest.config.js`.
3. Update CI to call `pnpm test:e2e` once the runners are wired into your build agents.
