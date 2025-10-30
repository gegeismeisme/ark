# Scheduler Jobs Setup

These commands configure Supabase Edge Scheduler for the notification functions.

## Prerequisites
- Supabase CLI logged in and linked to the target project.
- `task-notifier` and `task-reminder` edge functions deployed:
  ```bash
  pnpm exec supabase functions deploy task-notifier --no-verify-jwt
  pnpm exec supabase functions deploy task-reminder --no-verify-jwt
  ```

## Create Scheduler Jobs

### Task Notifier Queue Processor
Runs every 5 minutes to process pending queue items (assignment created, status changes, review updates, reminders).

```bash
supabase functions schedule create task-notifier-job \
  --function task-notifier \
  --cron "*/5 * * * *"
```

### Task Reminder Producer
Runs hourly to enqueue due-soon and overdue reminders. Adjust the cron frequency as needed.

```bash
supabase functions schedule create task-reminder-job \
  --function task-reminder \
  --cron "0 * * * *"
```

## Verify Jobs
List configured schedules:

```bash
supabase functions schedule list
```

Inspect a job’s details:

```bash
supabase functions schedule get task-notifier-job
supabase functions schedule get task-reminder-job
```

## Update or Delete Jobs
- Update cron expression:
  ```bash
  supabase functions schedule update task-reminder-job --cron "*/30 * * * *"
  ```
- Delete a schedule (if no longer needed):
  ```bash
  supabase functions schedule delete task-notifier-job
  ```

Store these commands in your deployment checklist to ensure staging/production environments configure the schedulers consistently.
