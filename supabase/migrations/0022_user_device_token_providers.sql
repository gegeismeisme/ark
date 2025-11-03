-- 0022_user_device_token_providers.sql
-- Extend device token table to differentiate Expo, FCM and APNs providers.

begin;

alter table user_device_tokens
  add column if not exists provider text not null default 'expo'
    check (provider in ('expo', 'fcm', 'apns'));

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'user_device_tokens'
      and indexname = 'user_device_tokens_user_id_token_key'
  ) then
    execute 'alter table user_device_tokens drop constraint user_device_tokens_user_id_token_key';
  end if;
end
$$;

alter table user_device_tokens
  add constraint user_device_tokens_user_provider_token_key unique (user_id, provider, token);

update user_device_tokens
set provider = case
  when token like 'ExponentPushToken%' then 'expo'
  when platform = 'ios' then 'apns'
  else 'fcm'
end;

commit;
