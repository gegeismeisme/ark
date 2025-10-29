import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase credentials for task-reminder function');
}

const supabase = createClient(supabaseUrl, serviceKey);

type AssignmentWithTask = {
  id: string;
  task_id: string;
  assignee_id: string;
  status: string | null;
  review_status: string | null;
  tasks: {
    id: string;
    organization_id: string | null;
    due_at: string | null;
  } | null;
};

function nowIso() {
  return new Date().toISOString();
}

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

async function fetchAssignments(options: {
  from: string;
  to?: string;
  overdue?: boolean;
  column: 'due_reminder_sent_at' | 'overdue_reminder_sent_at';
}) {
  const query = supabase
    .from('task_assignments')
    .select(
      `
        id,
        task_id,
        assignee_id,
        status,
        review_status,
        tasks!inner (
          id,
          organization_id,
          due_at
        )
      `
    )
    .neq('status', 'completed')
    .neq('review_status', 'accepted')
    .is(options.column, null);

  if (options.overdue) {
    query.lt('tasks.due_at', options.from);
  } else {
    query.gte('tasks.due_at', options.from);
    if (options.to) {
      query.lte('tasks.due_at', options.to);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[task-reminder] fetch assignments error:', error);
    return [];
  }

  return (data ?? []) as AssignmentWithTask[];
}

async function queueReminders(
  assignments: AssignmentWithTask[],
  event: 'due_reminder' | 'overdue_reminder',
  column: 'due_reminder_sent_at' | 'overdue_reminder_sent_at'
) {
  if (!assignments.length) return 0;

  const now = nowIso();

  const rows = assignments.map((assignment) => ({
    organization_id: assignment.tasks?.organization_id ?? null,
    task_id: assignment.task_id,
    assignment_id: assignment.id,
    event_type: event,
    payload: {
      assignee_id: assignment.assignee_id,
    },
  }));

  const { error: insertError } = await supabase.from('task_notification_queue').insert(rows);
  if (insertError) {
    console.error(`[task-reminder] queue insert error for ${event}:`, insertError);
    return 0;
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const updatePayload: Record<string, string> = {
    [column]: now,
  };

  const { error: updateError } = await supabase
    .from('task_assignments')
    .update(updatePayload)
    .in('id', assignmentIds);

  if (updateError) {
    console.error(`[task-reminder] update assignments error for ${event}:`, updateError);
  }

  return assignments.length;
}

async function runReminderJob() {
  const now = new Date();
  const nextDayIso = addHours(now, 24).toISOString();
  const nowIsoString = now.toISOString();

  const dueSoon = await fetchAssignments({
    from: nowIsoString,
    to: nextDayIso,
    column: 'due_reminder_sent_at',
  });

  const overdue = await fetchAssignments({
    from: nowIsoString,
    overdue: true,
    column: 'overdue_reminder_sent_at',
  });

  const dueQueued = await queueReminders(dueSoon, 'due_reminder', 'due_reminder_sent_at');
  const overdueQueued = await queueReminders(
    overdue,
    'overdue_reminder',
    'overdue_reminder_sent_at'
  );

  return { dueQueued, overdueQueued };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await runReminderJob();
    return new Response(JSON.stringify({ status: 'ok', ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[task-reminder] execution failed:', err);
    return new Response(JSON.stringify({ error: 'Reminder job failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
