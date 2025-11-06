# Web Dashboard Enhancement Worklog

## 2025-11-06 – Scope Kickoff

- **Participants:** Engineering copilots + product owner
- **Goals:**
  - Document existing dashboard task management UX gaps.
  - Plan enhancements for scheduling, recurring templates, and scoped display names.
  - Ensure new work stays localized (EN/ZH) and leans on iconography where possible.
- **Decisions:**
  - Track progress in this log for traceability.
  - Execute improvements incrementally while keeping UI parity across locales.

## Task Backlog Snapshot

- Task list currently supports edit/delete and viewing details; missing attachment removal and member reassignment controls.
- Task composer allows publishing without assignees—validation rules TBD.
- Scheduled/recurring task support absent; needs UX + data model exploration.
- Scoped display names per organization/group not defined; requires schema and UI planning.
- Iconography mostly textual; future updates will replace action text with intuitive icons plus accessible labels.

## 2025-11-06 – Task Dashboard Audit

- **Task list findings:** Bulk + per-row delete rely on confirmation dialogs and textual buttons; no icon-only variants yet. Selection state maintained per page; summary copy partially corrupted (Mojibake).
- **Detail panel:** Supports upload/download but lacks removal controls or audit trail for attachments. Member table offers assignment review only; no UX for adding/removing assignees post-publish.
- **Composer:** No validation enforcing assignee selection. Attachments modal exists; scheduling limited to due date/time field without constrained windows.
- **Localization:** Many strings remain hard-coded Chinese with encoding glitches. No `t()` wrappers present in these components.

## 2025-11-06 – Composer Enhancements Plan

- **Assignee requirement:** Publishing a new task should fail fast when zero assignees are selected. We will surface a localized error and disable the submit button accordingly.
- **Scheduling modes:** Introduce a `scheduleType` toggle with two options:
  - `deadline` (existing due date field)
  - `window` (new start/end datetime inputs enabling punctual tasks like duty check-ins).
  - Persist window values via new `schedule_window_start` / `schedule_window_end` columns (Supabase migration pending).
- **UI updates:** Expand composer overview to show schedule summary, add inline validation for incomplete windows, and ensure all labels use translation keys.
- **Follow-up:** Refresh task list/detail rendering to display selected schedule mode once backend wiring lands.

## 2025-11-06 – MVP Refocus

- **Decision:** Freeze recurring/scheduled task initiatives until after launch. Prioritize polishing existing flows (composer, task list, detail panel).
- **Immediate objectives:**
  - Enforce assignee validation and attachment lifecycle controls.
  - Replace textual action labels with icons + tooltips.
  - Localize every new/updated string during fixes.
- **Deferred backlog:** scheduled windows, recurring templates, scoped display names (tracked for post-launch).
