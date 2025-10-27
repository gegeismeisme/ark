# Data Model Blueprint

## Core Entities
- **profiles** — One-to-one shadow of `auth.users`, stores plan tier, contact info, and GDPR lifecycle fields (`deletion_requested_at`, `deleted_at`, `deleted_by`).
- **organizations** — Represents a tenant; tracks owning user, current plan tier, soft-delete markers, and timestamps.
- **organization_members** — Junction between users and organizations with role (`owner`, `admin`, `member`) and status (`active`, `invited`, `suspended`).
- **groups** — Blind channels inside organizations. Limited per organization according to plan limits.
- **group_members** — Membership within groups with specific role (`admin`, `publisher`, `member`) and plan-aware enforcement for admin roles.
- **tasks** — Task definitions scoped to groups, including metadata (title, description, due date).
- **task_assignments** — One row per assignee tracking lifecycle (`sent`, `received`, `completed`, `archived`) and timestamps.
- **task_submissions** — Optional payload storage for completion artifacts (JSON metadata, storage references).
- **plan_limits** — Declarative plan configuration used by enforcement triggers.
- **audit_logs** — General ledger for sensitive actions (role changes, deletions, plan changes) to satisfy compliance.

## Plan Tiers (initial defaults)
| Tier        | Max orgs per user | Max groups per org | Max members per org | Max group admin roles per user |
|-------------|------------------:|--------------------:|---------------------:|-------------------------------:|
| `free`      | 1                 | 5                   | 50                   | 10                              |
| `pro`       | 10                | 25                  | 250                  | 50                              |
| `enterprise`| NULL (unlimited)  | NULL (unlimited)    | NULL (unlimited)     | NULL (unlimited)                |

The `NULL` values represent “no hard cap”, letting enforcement functions skip limit checks.

## Enforcement & Automation
- **Profile bootstrap trigger**: Inserts a `profiles` row with tier `free` whenever a new Supabase auth user is created.
- **Organization limit trigger**: Validates `max_orgs_per_user` before inserting an organization and defaults its `plan_tier` to the owner’s tier.
- **Organization group limit trigger**: Prevents creating more groups than allowed for the organization’s plan.
- **Member limit trigger**: Blocks adding members beyond the plan’s `max_members_per_organization`.
- **Group admin cap trigger**: Ensures each user has at most `max_group_admin_roles_per_user` active admin roles across all groups unless their plan allows more.
- **Cascade delete helpers**: Stored procedure `purge_user(uuid)` removes all dependent records (memberships, assignments, organizations they own, audit entries) and is invoked by a trigger on `auth.users` deletion. Similar functions apply to organization removal.

## GDPR & Account Lifecycle
- `profiles` carries `deletion_requested_at`, `deleted_at`, `deleted_by`, and `erasure_reason`.
- Soft-deleted records (`deleted_at` columns) remain queryable only to privileged roles; RLS policies hide them from regular users.
- A dangerous operation (`purge_user`) permanently removes all rows linked to a user, including tasks and messages, to satisfy “right to erasure”.

## Row-Level Security (baseline)
- Users may read/update their own profile.
- Organization members can read organization metadata; only admins/owners can modify.
- Group access restricted to users listed in `group_members`.
- Tasks and assignments visible only to their organization members, with edits constrained by role.

This blueprint underpins the initial migration set. Subsequent migrations will refine task lifecycle tables, notification plumbing, and plan management detail.
