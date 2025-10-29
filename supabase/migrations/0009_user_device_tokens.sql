-- 0009_user_device_tokens.sql
-- Track Expo push tokens per user with RLS for self-management.

begin;

create table if not exists user_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table user_device_tokens enable row level security;

drop policy if exists user_device_tokens_select_self on user_device_tokens;
create policy user_device_tokens_select_self on user_device_tokens
for select
using (auth.uid() = user_id);

drop policy if exists user_device_tokens_insert_self on user_device_tokens;
create policy user_device_tokens_insert_self on user_device_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists user_device_tokens_update_self on user_device_tokens;
create policy user_device_tokens_update_self on user_device_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_device_tokens_delete_self on user_device_tokens;
create policy user_device_tokens_delete_self on user_device_tokens
for delete
using (auth.uid() = user_id);

create index if not exists idx_user_device_tokens_user_id on user_device_tokens (user_id);
create index if not exists idx_user_device_tokens_token on user_device_tokens (token);

drop trigger if exists trg_user_device_tokens_set_updated_at on user_device_tokens;
create trigger trg_user_device_tokens_set_updated_at
before update on user_device_tokens
for each row
execute function set_updated_at();

commit;
