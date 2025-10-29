import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase credentials for task-notifier process script');
}

const supabase = createClient(supabaseUrl, serviceKey);

type QueueRow = {
  id: string;
  organization_id: string | null;
  task_id: string | null;
  assignment_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

async function dispatch(row: QueueRow) {
  // TODO: integrate real notification channels (email, push, etc.)
  console.log(
    `[task-notifier] dispatch event=${row.event_type} assignment=${row.assignment_id} payload=${JSON.stringify(row.payload)}`
  );
}

async function markProcessed(id: string) {
  const { error } = await supabase
    .from('task_notification_queue')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error(`[task-notifier] failed to mark processed for ${id}:`, error);
  }
}

export async function handler() {
  const { data, error } = await supabase
    .from('task_notification_queue')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[task-notifier] fetch error:', error);
    return;
  }

  for (const row of data ?? []) {
    try {
      await dispatch(row as QueueRow);
      await markProcessed(row.id);
    } catch (err) {
      console.error('[task-notifier] dispatch failed:', err);
    }
  }
}
