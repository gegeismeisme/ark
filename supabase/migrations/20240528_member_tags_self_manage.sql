-- Allow organization members to manage their own tags
create policy member_tags_self_manage on member_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from organization_members om
      where om.id = member_tags.member_id
        and om.organization_id = member_tags.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy member_tags_self_manage_delete on member_tags
  for delete
  to authenticated
  using (
    exists (
      select 1
      from organization_members om
      where om.id = member_tags.member_id
        and om.organization_id = member_tags.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy member_tags_self_manage_update on member_tags
  for update
  to authenticated
  using (
    exists (
      select 1
      from organization_members om
      where om.id = member_tags.member_id
        and om.organization_id = member_tags.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.id = member_tags.member_id
        and om.organization_id = member_tags.organization_id
        and om.user_id = auth.uid()
    )
  );
