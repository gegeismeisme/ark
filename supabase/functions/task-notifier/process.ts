import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import { createTransport } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const smtpHost = Deno.env.get('NOTIFY_SMTP_HOST') ?? '';
const smtpUser = Deno.env.get('NOTIFY_SMTP_USER') ?? '';
const smtpPass = Deno.env.get('NOTIFY_SMTP_PASS') ?? '';
const notifyFrom = Deno.env.get('NOTIFY_FROM_EMAIL') ?? '';
const dashboardUrl = (Deno.env.get('TASK_PORTAL_URL') ?? '').trim();

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

type AssignmentEventPayload = {
  assignee_id?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  old_review_status?: string | null;
  new_review_status?: string | null;
};

type AssignmentDetail = {
  id: string;
  assignee_id: string;
  status: string | null;
  review_status: 'pending' | 'accepted' | 'changes_requested';
  completion_note: string | null;
  review_note: string | null;
  tasks: { title: string | null; due_at: string | null } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

type DeviceTokenRow = {
  token: string;
  last_seen_at: string | null;
};

const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

const reviewStatusLabelMap: Record<string, string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  changes_requested: 'Changes requested',
};

function createEmailTransport() {
  if (!smtpHost || !smtpUser || !smtpPass || !notifyFrom) return null;
  return createTransport({
    hostname: smtpHost,
    port: 587,
    username: smtpUser,
    password: smtpPass,
    secure: false,
  });
}

const emailTransport = createEmailTransport();

async function fetchDeviceTokens(userId: string) {
  const { data, error } = await supabase
    .from('user_device_tokens')
    .select('token, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('[task-notifier] fetch device tokens error:', error);
    return [];
  }

  return (data ?? []) as DeviceTokenRow[];
}

async function sendPushNotifications(tokens: string[], payload: Record<string, unknown>) {
  if (!tokens.length) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          sound: 'default',
          title: payload.title ?? 'Task update',
          body: payload.body ?? 'A task has been updated.',
          data: payload.data ?? {},
        }))
      ),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.error('[task-notifier] push dispatch failed:', response.status, bodyText);
    } else {
      const json = await response.json();
      console.log('[task-notifier] push dispatch response:', json);
    }
  } catch (err) {
    console.error('[task-notifier] push dispatch exception:', err);
  }
}

async function fetchAssignmentDetail(assignmentId: string) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(
      'id, assignee_id, status, review_status, completion_note, review_note, tasks(title, due_at), profiles(email, full_name)'
    )
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    console.error('[task-notifier] fetch assignment detail error:', error);
    return null;
  }

  return data as AssignmentDetail | null;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleString('en-GB', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function buildTaskLink(taskId: string | null) {
  if (!dashboardUrl || !taskId) return '';
  const base = dashboardUrl.replace(/\/$/, '');
  return `${base}/tasks/${taskId}`;
}

async function dispatch(row: QueueRow) {
  if (!row.assignment_id) {
    console.log(`[task-notifier] assignment_id missing for event=${row.event_type}`);
    return;
  }

  const detail = await fetchAssignmentDetail(row.assignment_id);
  if (!detail) return;

  const email = detail.profiles?.email;
  const payload = row.payload as AssignmentEventPayload;
  const assigneeId = payload.assignee_id ?? detail.assignee_id;
  const fullName = detail.profiles?.full_name ?? email ?? detail.assignee_id;
  const taskTitle = detail.tasks?.title ?? 'Task update';
  const dueAt = formatDateTime(detail.tasks?.due_at ?? null);
  const newStatus =
    typeof payload.new_status === 'string' ? payload.new_status : detail.status ?? undefined;
  const newReviewStatus =
    typeof payload.new_review_status === 'string'
      ? payload.new_review_status
      : detail.review_status ?? undefined;

  let subject = `[Task Center] ${taskTitle}`;
  let body = `Hello ${fullName},\n\nThe task "${taskTitle}" has a new update.\n`;
  let pushMessage = 'A task has new activity.';

  switch (row.event_type) {
    case 'assignment_created': {
      subject = `[Task Assigned] ${taskTitle}`;
      body += 'You have been assigned to this task.';
      pushMessage = 'You received a new task assignment.';
      if (detail.completion_note) {
        body += `\nTask note: ${detail.completion_note}`;
      }
      break;
    }
    case 'status_changed': {
      if (newStatus) {
        const label = statusLabelMap[newStatus] ?? newStatus;
        body += `Task status is now: ${label}.`;
        pushMessage = `Task status updated to ${label}.`;
      }
      if (newStatus === 'completed' && detail.completion_note) {
        body += `\nCompletion note: ${detail.completion_note}`;
      }
      break;
    }
    case 'review_updated': {
      subject = `[Task Review] ${taskTitle}`;
      if (newReviewStatus) {
        const reviewLabel = reviewStatusLabelMap[newReviewStatus] ?? newReviewStatus;
        body += `Review status is now: ${reviewLabel}.`;
        pushMessage = `Task review status updated to ${reviewLabel}.`;
      }
      if (detail.review_note) {
        body += `\nReviewer note: ${detail.review_note}`;
      }
      break;
    }
    case 'due_reminder': {
      subject = `[Task Reminder] ${taskTitle}`;
      body += 'This task is approaching its deadline. Please complete it or provide an update.';
      pushMessage = 'Task deadline is coming up soon.';
      break;
    }
    case 'overdue_reminder': {
      subject = `[Task Overdue] ${taskTitle}`;
      body += 'The task is overdue. Please follow up and submit an update as soon as possible.';
      pushMessage = 'Task is overdue. Please review it now.';
      break;
    }
    default: {
      body += `Event: ${row.event_type}.`;
    }
  }

  body += `\nDeadline: ${dueAt}`;

  const link = buildTaskLink(row.task_id);
  if (link) {
    body += `\nTask link: ${link}`;
  }

  body += '\n\nPlease sign in to Project Ark for details.';

  const pushPayload: {
    title: string;
    body: string;
    data: Record<string, unknown>;
  } = {
    title: subject,
    body: pushMessage,
    data: {
      event: row.event_type,
      taskId: row.task_id,
      assignmentId: row.assignment_id,
    },
  };

  if (link) {
    pushPayload.data.link = link;
  }

  if (email) {
    if (emailTransport) {
      try {
        await emailTransport.send({
          from: notifyFrom,
          to: email,
          subject,
          content: body,
        });
        console.log(`[task-notifier] email dispatched to ${email} (${row.event_type})`);
      } catch (err) {
        console.error('[task-notifier] email dispatch error:', err);
      }
    } else {
      console.log('[task-notifier] SMTP transport missing, skip email dispatch');
    }
  } else {
    console.log('[task-notifier] assignee email missing, skip email dispatch');
  }

  if (assigneeId) {
    const tokens = await fetchDeviceTokens(assigneeId);
    const validTokens = tokens
      .map((tokenRow) => tokenRow.token)
      .filter((token) => typeof token === 'string' && token.startsWith('ExponentPushToken'));
    if (validTokens.length) {
      await sendPushNotifications(validTokens, pushPayload);
    }
  }
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
