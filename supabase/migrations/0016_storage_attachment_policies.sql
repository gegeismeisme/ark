-- 0016_storage_attachment_policies.sql
-- Enforce RLS for attachments bucket based on organization membership.

begin;

create or replace function attachment_object_org_id(p_name text)
returns uuid
language plpgsql
stable
as $$
declare
  org_id_text text;
  org_id uuid;
begin
  if p_name is null then
    return null;
  end if;

  -- Expected pattern: org/<org_id>/task/...
  if position('org/' in p_name) <> 1 then
    return null;
  end if;

  org_id_text := split_part(p_name, '/', 2);

  begin
    org_id := org_id_text::uuid;
  exception when others then
    return null;
  end;

  return org_id;
end;
$$;

drop policy if exists attachments_select_members on storage.objects;
create policy attachments_select_members
on storage.objects
for select
using (
  bucket_id = 'attachments'
  and (
    auth.role() = 'service_role'
    or (
      attachment_object_org_id(name) is not null
      and is_active_org_member(attachment_object_org_id(name), auth.uid())
    )
  )
);

drop policy if exists attachments_insert_members on storage.objects;
create policy attachments_insert_members
on storage.objects
for insert
with check (
  bucket_id = 'attachments'
  and (
    auth.role() = 'service_role'
    or (
      attachment_object_org_id(name) is not null
      and is_active_org_member(attachment_object_org_id(name), auth.uid())
    )
  )
);

drop policy if exists attachments_delete_members on storage.objects;
create policy attachments_delete_members
on storage.objects
for delete
using (
  bucket_id = 'attachments'
  and (
    auth.role() = 'service_role'
    or (
      attachment_object_org_id(name) is not null
      and is_active_org_member(attachment_object_org_id(name), auth.uid())
    )
  )
);

commit;
