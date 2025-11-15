begin;

drop policy if exists org_join_requests_cancel_self on organization_join_requests;

create policy org_join_requests_cancel_self
on organization_join_requests
for delete
using (
  user_id = auth.uid()
  and status = 'pending'
);

commit;
