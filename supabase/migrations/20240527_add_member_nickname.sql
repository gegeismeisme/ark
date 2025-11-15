begin;

drop policy if exists organization_members_self_display_name on organization_members;

create policy organization_members_self_display_name
  on organization_members
  for update
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
    and row (organization_id, role, status) = row (organization_id, role, status) -- 限制只改部分字段
  );

commit;
