-- 0005_extend_admin_member_policies.sql
-- Allow organization and group administrators to manage memberships.

begin;

drop policy if exists organization_members_admin_manage on organization_members;
create policy organization_members_admin_manage on organization_members
for all
using (is_org_admin(organization_id, auth.uid()))
with check (is_org_admin(organization_id, auth.uid()));

drop policy if exists group_members_admin_manage on group_members;
create policy group_members_admin_manage on group_members
for all
using (
  is_group_admin(group_id, auth.uid())
  or exists (
    select 1
    from groups g
    where g.id = group_members.group_id
      and is_org_admin(g.organization_id, auth.uid())
  )
)
with check (
  is_group_admin(group_id, auth.uid())
  or exists (
    select 1
    from groups g
    where g.id = group_members.group_id
      and is_org_admin(g.organization_id, auth.uid())
  )
);

commit;
