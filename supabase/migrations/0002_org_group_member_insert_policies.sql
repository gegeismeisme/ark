-- 0002_org_group_member_insert_policies.sql
-- Allow owners to self-insert into organization_members and group_members

begin;

drop policy if exists organization_members_insert_self_owner on organization_members;
create policy organization_members_insert_self_owner on organization_members
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from organizations o
    where o.id = organization_id and o.owner_id = auth.uid()
  )
);

-- Allow org owner to add themselves as the first admin member of a group
drop policy if exists group_members_insert_self_owner on group_members;
create policy group_members_insert_self_owner on group_members
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from groups g
    join organizations o on o.id = g.organization_id
    where g.id = group_id and o.owner_id = auth.uid()
  )
);

commit;
