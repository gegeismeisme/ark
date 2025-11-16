-- 20251116_member_lock_and_role.sql
-- Add display_name_locked flag and refine self-update policy so members cannot edit when locked.

begin;

alter table organization_members
  add column if not exists display_name_locked boolean not null default false;

-- Self can update display_name only when not locked; cannot change role/status/lock.
drop policy if exists organization_members_self_display_name on organization_members;
create policy organization_members_self_display_name
  on organization_members
  for update
  using (
    user_id = auth.uid()
    and display_name_locked = false
  )
  with check (
    user_id = auth.uid()
    and display_name_locked = false
    and row (organization_id, role, status, display_name_locked) = row (organization_id, role, status, display_name_locked)
  );

-- Admin/Owner management policy already exists (organization_members_admin_manage), covers role/lock changes.
-- No change required there.

commit;
