-- 20251119_member_tag_reviews.sql
-- Track admin confirmation state for each member's tag categories.

begin;

create table if not exists member_tag_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,
  category_id uuid not null references organization_tag_categories(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz not null default now()
);

create unique index if not exists member_tag_reviews_member_category_unique on member_tag_reviews (member_id, category_id);

alter table member_tag_reviews enable row level security;

drop policy if exists member_tag_reviews_select on member_tag_reviews;
create policy member_tag_reviews_select on member_tag_reviews
for select
using (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1 from organization_members om
    where om.id = member_tag_reviews.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
);

drop policy if exists member_tag_reviews_manage on member_tag_reviews;
create policy member_tag_reviews_manage on member_tag_reviews
for all
using (is_org_admin(organization_id, auth.uid()))
with check (is_org_admin(organization_id, auth.uid()));

commit;
