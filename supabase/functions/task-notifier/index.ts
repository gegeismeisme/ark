import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables for task-notifier edge function.');
}

const supabase = createClient(supabaseUrl, serviceKey);
const jsonHeaders = { 'Content-Type': 'application/json' };

type NotificationPayload = {
  event_type?: string;
  organization_id?: string;
  task_id?: string;
  assignment_id?: string;
  payload?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  let body: NotificationPayload | null = null;
  try {
    body = (await req.json()) as NotificationPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  if (!body?.event_type) {
    return new Response(JSON.stringify({ error: 'event_type is required' }), {
      status: 422,
      headers: jsonHeaders,
    });
  }

  const { error } = await supabase.from('task_notification_queue').insert({
    organization_id: body.organization_id ?? null,
    task_id: body.task_id ?? null,
    assignment_id: body.assignment_id ?? null,
    event_type: body.event_type,
    payload: body.payload ?? {},
  });

  if (error) {
    console.error('Failed to enqueue notification', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to enqueue notification',
        details: error.message ?? error,
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  return new Response(JSON.stringify({ status: 'queued' }), {
    status: 200,
    headers: jsonHeaders,
  });
});
