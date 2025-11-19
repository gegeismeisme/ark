begin;

alter table public.tasks
  add column if not exists require_text boolean not null default false,
  add column if not exists camera_only boolean not null default false,
  add column if not exists time_window_enforced boolean not null default false;

comment on column public.tasks.require_text is 'Whether assignees must submit a text note to complete the task.';
comment on column public.tasks.camera_only is 'When true, assignees must capture attachments directly from the device camera.';
comment on column public.tasks.time_window_enforced is 'When true, task completion is only accepted inside the configured schedule window.';

commit;
