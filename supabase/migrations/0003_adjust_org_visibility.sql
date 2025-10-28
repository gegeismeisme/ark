-- 0003_adjust_org_visibility.sql
-- Allow organization owners to access their organizations before membership seeding.

begin;

alter policy organizations_select on organizations
using (
  owner_id = auth.uid()
  or is_active_org_member(id, auth.uid())
);

commit;
