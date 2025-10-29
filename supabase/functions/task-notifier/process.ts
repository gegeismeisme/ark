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

const statusLabelMap: Record<string, string> = {
  pending: '\u5f85\u5904\u7406',
  in_progress: '\u8fdb\u884c\u4e2d',
  completed: '\u5df2\u5b8c\u6210',
  archived: '\u5df2\u5f52\u6863',
};

const reviewStatusLabelMap: Record<string, string> = {
  pending: '\u5f85\u5ba1\u6838',
  accepted: '\u5df2\u901a\u8fc7',
  changes_requested: '\u9700\u8c03\u6574',
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
  if (!value) return '\u672a\u8bbe\u7f6e';
  try {
    return new Date(value).toLocaleString('zh-CN', {
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
  if (!emailTransport) {
    console.log('[task-notifier] transport not configured, skipping email dispatch');
    return;
  }

  if (!row.assignment_id) {
    console.log(`[task-notifier] assignment_id missing for event=${row.event_type}`);
    return;
  }

  const detail = await fetchAssignmentDetail(row.assignment_id);
  if (!detail) return;

  const email = detail.profiles?.email;
  if (!email) {
    console.log('[task-notifier] assignee email missing, skip notification');
    return;
  }

  const payload = row.payload as AssignmentEventPayload;
  const fullName = detail.profiles?.full_name ?? email;
  const taskTitle = detail.tasks?.title ?? '\u4efb\u52a1\u63d0\u9192';
  const dueAt = formatDateTime(detail.tasks?.due_at ?? null);
  const newStatus =
    typeof payload.new_status === 'string' ? payload.new_status : detail.status ?? undefined;
  const newReviewStatus =
    typeof payload.new_review_status === 'string'
      ? payload.new_review_status
      : detail.review_status ?? undefined;

  let subject = `[\u4efb\u52a1\u4e2d\u5fc3] ${taskTitle}`;
  let body = `\u4f60\u597d ${fullName},\n\n\u4efb\u52a1\u300a${taskTitle}\u300b\u6709\u65b0\u7684\u52a8\u6001\u3002\n`;

  switch (row.event_type) {
    case 'assignment_created':
      subject = `[\u4efb\u52a1\u6307\u6d3e] ${taskTitle}`;
      body += '\u4f60\u5df2\u88ab\u6307\u6d3e\u5230\u6b64\u4efb\u52a1\u3002';
      break;
    case 'status_changed':
      if (newStatus) {
        const label = statusLabelMap[newStatus] ?? newStatus;
        body += `\u4efb\u52a1\u72b6\u6001\u66f4\u65b0\u4e3a\uff1a${label}\u3002`;
      }
      if (newStatus === 'completed' && detail.completion_note) {
        body += `\n\u63d0\u4ea4\u8bf4\u660e\uff1a${detail.completion_note}`;
      }
      break;
    case 'review_updated':
      subject = `[\u4efb\u52a1\u5ba1\u6838] ${taskTitle}`;
      if (newReviewStatus) {
        const reviewLabel = reviewStatusLabelMap[newReviewStatus] ?? newReviewStatus;
        body += `\u7ba1\u7406\u5458\u66f4\u65b0\u4e86\u9a8c\u6536\u72b6\u6001\uff1a${reviewLabel}\u3002`;
      }
      if (detail.review_note) {
        body += `\n\u5ba1\u6838\u5907\u6ce8\uff1a${detail.review_note}`;
      }
      break;
    default:
      body += `\u4e8b\u4ef6\uff1a${row.event_type}\u3002`;
  }

  body += `\n\u622a\u6b62\u65f6\u95f4\uff1a${dueAt}`;

  const link = buildTaskLink(row.task_id);
  if (link) {
    body += `\n\u4efb\u52a1\u94fe\u63a5\uff1a${link}`;
  }

  body += '\n\n\u8bf7\u767b\u5f55\u7cfb\u7edf\u67e5\u770b\u8be6\u60c5\u3002';

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
