-- Adds explicit scheduling support for tasks

alter table public.tasks
  add column if not exists schedule_type text not null default 'deadline',
  add column if not exists schedule_window_start timestamptz,
  add column if not exists schedule_window_end timestamptz;

alter table public.tasks
  add constraint tasks_schedule_type_check
  check (
    schedule_type in ('deadline', 'window')
    and (
      (schedule_type = 'deadline' and schedule_window_start is null and schedule_window_end is null)
      or
      (schedule_type = 'window' and schedule_window_start is not null and schedule_window_end is not null and schedule_window_start < schedule_window_end)
    )
  );

create index if not exists tasks_schedule_window_idx
  on public.tasks (schedule_type, schedule_window_start, schedule_window_end);

comment on column public.tasks.schedule_type is 'Determines whether the task uses a single deadline or a time window.';
comment on column public.tasks.schedule_window_start is 'Start timestamp for windowed tasks.';
comment on column public.tasks.schedule_window_end is 'End timestamp for windowed tasks.';
