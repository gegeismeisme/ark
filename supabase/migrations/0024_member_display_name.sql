-- 0024_member_display_name.sql
-- Add per-organization display names for members and refresh dependent views.

begin;

alter table organization_members
  add column if not exists display_name text;

update organization_members om
set display_name = p.full_name
from profiles p
where om.display_name is null
  and p.id = om.user_id;

create or replace view organization_member_details
with (security_barrier) as
select
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.status,
  om.joined_at,
  om.invited_at,
  om.invited_by,
  om.created_at,
  om.updated_at,
  om.removed_at,
  coalesce(om.display_name, p.full_name) as full_name
from organization_members om
left join profiles p on p.id = om.user_id;

create or replace view group_member_details
with (security_barrier) as
select
  gm.id,
  gm.group_id,
  g.organization_id,
  gm.user_id,
  gm.role,
  gm.status,
  gm.added_at,
  gm.added_by,
  gm.removed_at,
  gm.created_at,
  gm.updated_at,
  coalesce(om.display_name, p.full_name) as full_name,
  om.role as organization_role
from group_members gm
join groups g on g.id = gm.group_id
left join organization_members om
  on om.organization_id = g.organization_id
  and om.user_id = gm.user_id
left join profiles p on p.id = gm.user_id;

commit;
