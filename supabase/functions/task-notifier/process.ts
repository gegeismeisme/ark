import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import { createTransport } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase credentials for task-notifier process script');
}

const supabase = createClient(supabaseUrl, serviceKey);

const smtpHost = (Deno.env.get('NOTIFY_SMTP_HOST') ?? '').trim();
const smtpPort = Number(Deno.env.get('NOTIFY_SMTP_PORT') ?? '587');
const smtpUser = (Deno.env.get('NOTIFY_SMTP_USER') ?? '').trim();
const smtpPass = (Deno.env.get('NOTIFY_SMTP_PASS') ?? '').trim();
const notifyFrom = (Deno.env.get('NOTIFY_FROM_EMAIL') ?? '').trim();

const expoPushUrl = (Deno.env.get('EXPO_PUSH_URL') ?? 'https://exp.host/--/api/v2/push/send').trim();
const expoAccessToken = (Deno.env.get('EXPO_ACCESS_TOKEN') ?? '').trim();

const fcmApiUrl = (Deno.env.get('FCM_API_URL') ?? 'https://fcm.googleapis.com/fcm/send').trim();
const fcmServerKey = (Deno.env.get('FCM_SERVER_KEY') ?? '').trim();

const dashboardUrl = (Deno.env.get('TASK_PORTAL_URL') ?? '').trim();

type LocaleKey = 'zh-CN' | 'en-US';
type EventType =
  | 'assignment_created'
  | 'status_changed'
  | 'review_updated'
  | 'due_reminder'
  | 'overdue_reminder';

type QueueRow = {
  id: string;
  organization_id: string | null;
  task_id: string | null;
  assignment_id: string | null;
  event_type: EventType | string;
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
  provider: 'expo' | 'fcm' | 'apns';
  last_seen_at: string | null;
};

type TemplateContext = {
  taskTitle: string;
  assigneeName: string;
  dueAt: string;
  rawDueAt: string | null;
  statusLabel?: string | null;
  reviewStatusLabel?: string | null;
  completionNote?: string | null;
  reviewNote?: string | null;
  taskLink?: string | null;
};

type TemplateResult = {
  subject: string;
  bodyLines: string[];
  pushMessage: string;
};

type LocaleTemplate = (ctx: TemplateContext) => TemplateResult;

type LocalePack = {
  locale: LocaleKey;
  formatDate: (value: string | null) => string;
  statusLabel: (status: string | null) => string | null;
  reviewStatusLabel: (status: string | null) => string | null;
  fallbacks: {
    taskTitle: string;
    assigneeName: string;
  };
  templates: Record<EventType | 'default', LocaleTemplate>;
};

const DEFAULT_LOCALE: LocaleKey = 'zh-CN';

const localeCatalog: Record<LocaleKey, LocalePack> = {
  'zh-CN': {
    locale: 'zh-CN',
    formatDate(value) {
      if (!value) return '未设置';
      try {
        return new Date(value).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } catch {
        return value ?? '未设置';
      }
    },
    statusLabel(status) {
      const map: Record<string, string> = {
        sent: '待开始',
        received: '执行中',
        completed: '已完成',
        archived: '已归档',
        pending: '待处理',
        in_progress: '进行中',
      };
      return status ? map[status] ?? status : null;
    },
    reviewStatusLabel(status) {
      const map: Record<string, string> = {
        pending: '等待验收',
        accepted: '验收通过',
        changes_requested: '需要调整后再提交',
      };
      return status ? map[status] ?? status : null;
    },
    fallbacks: {
      taskTitle: '未命名任务',
      assigneeName: '成员',
    },
    templates: {
      assignment_created(ctx) {
        return {
          subject: `[新任务] ${ctx.taskTitle}`,
          bodyLines: [
            `尊敬的 ${ctx.assigneeName}：`,
            '',
            `您收到了新的任务「${ctx.taskTitle}」，请尽快查看并安排执行。`,
            `截止时间：${ctx.dueAt}`,
          ],
          pushMessage: `新任务：${ctx.taskTitle}`,
        };
      },
      status_changed(ctx) {
        const detail = ctx.statusLabel ? `任务状态已更新为「${ctx.statusLabel}」。` : '任务状态已更新。';
        const lines = [
          `尊敬的 ${ctx.assigneeName}：`,
          '',
          detail,
          `截止时间：${ctx.dueAt}`,
        ];
        if (ctx.completionNote) {
          lines.push(`执行说明：${ctx.completionNote}`);
        }
        return {
          subject: `[任务状态] ${ctx.taskTitle}`,
          bodyLines: lines,
          pushMessage: ctx.statusLabel
            ? `任务状态更新：${ctx.statusLabel}`
            : `任务状态更新：${ctx.taskTitle}`,
        };
      },
      review_updated(ctx) {
        const detail = ctx.reviewStatusLabel
          ? `任务验收状态更新为「${ctx.reviewStatusLabel}」。`
          : '任务验收状态已更新。';
        const lines = [
          `尊敬的 ${ctx.assigneeName}：`,
          '',
          detail,
          `截止时间：${ctx.dueAt}`,
        ];
        if (ctx.reviewNote) {
          lines.push(`验收备注：${ctx.reviewNote}`);
        }
        return {
          subject: `[任务验收] ${ctx.taskTitle}`,
          bodyLines: lines,
          pushMessage: ctx.reviewStatusLabel
            ? `验收状态：${ctx.reviewStatusLabel}`
            : `验收状态更新：${ctx.taskTitle}`,
        };
      },
      due_reminder(ctx) {
        return {
          subject: `[到期提醒] ${ctx.taskTitle}`,
          bodyLines: [
            `尊敬的 ${ctx.assigneeName}：`,
            '',
            '任务即将到期，请及时完成并提交说明或附件。',
            `截止时间：${ctx.dueAt}`,
          ],
          pushMessage: `任务即将到期：${ctx.taskTitle}`,
        };
      },
      overdue_reminder(ctx) {
        return {
          subject: `[逾期提醒] ${ctx.taskTitle}`,
          bodyLines: [
            `尊敬的 ${ctx.assigneeName}：`,
            '',
            '任务已逾期，请尽快跟进并反馈最新进度。',
            `截止时间：${ctx.dueAt}`,
          ],
          pushMessage: `任务已逾期：${ctx.taskTitle}`,
        };
      },
      default(ctx) {
        return {
          subject: `[任务通知] ${ctx.taskTitle}`,
          bodyLines: [
            `尊敬的 ${ctx.assigneeName}：`,
            '',
            '任务有新的动态，请登录控制台查看详情。',
            `截止时间：${ctx.dueAt}`,
          ],
          pushMessage: `任务提醒：${ctx.taskTitle}`,
        };
      },
    },
  },
  'en-US': {
    locale: 'en-US',
    formatDate(value) {
      if (!value) return 'Not set';
      try {
        return new Date(value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return value ?? 'Not set';
      }
    },
    statusLabel(status) {
      const map: Record<string, string> = {
        sent: 'Not started',
        received: 'In progress',
        completed: 'Completed',
        archived: 'Archived',
        pending: 'Pending',
        in_progress: 'In progress',
      };
      return status ? map[status] ?? status : null;
    },
    reviewStatusLabel(status) {
      const map: Record<string, string> = {
        pending: 'Pending review',
        accepted: 'Accepted',
        changes_requested: 'Changes requested',
      };
      return status ? map[status] ?? status : null;
    },
    fallbacks: {
      taskTitle: 'Untitled task',
      assigneeName: 'Member',
    },
    templates: {
      assignment_created(ctx) {
        return {
          subject: `[New Task] ${ctx.taskTitle}`,
          bodyLines: [
            `Hi ${ctx.assigneeName},`,
            '',
            `You have a new assignment "${ctx.taskTitle}". Please review the details and get started.`,
            `Due date: ${ctx.dueAt}`,
          ],
          pushMessage: `New task: ${ctx.taskTitle}`,
        };
      },
      status_changed(ctx) {
        const detail = ctx.statusLabel
          ? `The task status is now "${ctx.statusLabel}".`
          : 'The task status has been updated.';
        const lines = [`Hi ${ctx.assigneeName},`, '', detail, `Due date: ${ctx.dueAt}`];
        if (ctx.completionNote) {
          lines.push(`Completion note: ${ctx.completionNote}`);
        }
        return {
          subject: `[Task Status] ${ctx.taskTitle}`,
          bodyLines: lines,
          pushMessage: ctx.statusLabel
            ? `Status updated: ${ctx.statusLabel}`
            : `Task status updated`,
        };
      },
      review_updated(ctx) {
        const detail = ctx.reviewStatusLabel
          ? `Review status is now "${ctx.reviewStatusLabel}".`
          : 'The review status has been updated.';
        const lines = [`Hi ${ctx.assigneeName},`, '', detail, `Due date: ${ctx.dueAt}`];
        if (ctx.reviewNote) {
          lines.push(`Reviewer note: ${ctx.reviewNote}`);
        }
        return {
          subject: `[Task Review] ${ctx.taskTitle}`,
          bodyLines: lines,
          pushMessage: ctx.reviewStatusLabel
            ? `Review status: ${ctx.reviewStatusLabel}`
            : `Review updated`,
        };
      },
      due_reminder(ctx) {
        return {
          subject: `[Due Soon] ${ctx.taskTitle}`,
          bodyLines: [
            `Hi ${ctx.assigneeName},`,
            '',
            'This task is approaching its deadline. Please complete it or provide an update.',
            `Due date: ${ctx.dueAt}`,
          ],
          pushMessage: `Task due soon: ${ctx.taskTitle}`,
        };
      },
      overdue_reminder(ctx) {
        return {
          subject: `[Overdue] ${ctx.taskTitle}`,
          bodyLines: [
            `Hi ${ctx.assigneeName},`,
            '',
            'The task is now overdue. Please follow up and submit progress as soon as possible.',
            `Due date: ${ctx.dueAt}`,
          ],
          pushMessage: `Task overdue: ${ctx.taskTitle}`,
        };
      },
      default(ctx) {
        return {
          subject: `[Task Update] ${ctx.taskTitle}`,
          bodyLines: [
            `Hi ${ctx.assigneeName},`,
            '',
            'A task you are assigned to has been updated. Please review the dashboard for details.',
            `Due date: ${ctx.dueAt}`,
          ],
          pushMessage: `Task update: ${ctx.taskTitle}`,
        };
      },
    },
  },
};

const DEFAULT_EMAIL_FOOTER: Record<LocaleKey, string> = {
  'zh-CN': '请登录 Project Ark 查看任务详情。',
  'en-US': 'Please sign in to Project Ark for more details.',
};

const FALLBACK_FROM = `Project Ark <no-reply@${supabaseUrl ? new URL(supabaseUrl).hostname : 'notifications.local'}>`;

function getLocale(): LocaleKey {
  const raw = (Deno.env.get('TASK_NOTIFY_LOCALE') ?? '').trim() as LocaleKey;
  if (raw && raw in localeCatalog) {
    return raw;
  }
  return DEFAULT_LOCALE;
}

function buildTaskLink(taskId: string | null) {
  if (!taskId || !dashboardUrl) return null;
  const normalized = dashboardUrl.replace(/\/$/, '');
  return `${normalized}/dashboard/tasks/${taskId}`;
}

let warnedMissingSmtp = false;

function createEmailTransport() {
  if (!smtpHost || !smtpUser || !smtpPass || !notifyFrom) {
    if (!warnedMissingSmtp) {
      console.log('[task-notifier] SMTP configuration incomplete, email notifications disabled');
      warnedMissingSmtp = true;
    }
    return null;
  }
  return createTransport({
    hostname: smtpHost,
    port: smtpPort,
    username: smtpUser,
    password: smtpPass,
    secure: smtpPort === 465,
  });
}

const emailTransport = createEmailTransport();

function chunkTokens(tokens: string[], size: number) {
  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += size) {
    batches.push(tokens.slice(i, i + size));
  }
  return batches;
}

async function fetchDeviceTokens(userId: string): Promise<DeviceTokenRow[]> {
  const { data, error } = await supabase
    .from('user_device_tokens')
    .select('token, provider, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('[task-notifier] fetch device tokens error:', error);
    return [];
  }

  return (data ?? []) as DeviceTokenRow[];
}

let warnedMissingExpoCredentials = false;

async function sendExpoNotifications(
  tokens: string[],
  payload: { title: string; body: string; data: Record<string, unknown> },
) {
  if (!tokens.length) return;
  if (!expoAccessToken) {
    if (!warnedMissingExpoCredentials) {
      console.log('[task-notifier] EXPO_ACCESS_TOKEN missing, skip Expo push dispatch');
      warnedMissingExpoCredentials = true;
    }
    return;
  }

  const batches = chunkTokens(tokens, 90);
  for (const batch of batches) {
    try {
      const response = await fetch(expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expoAccessToken}`,
        },
        body: JSON.stringify({
          to: batch,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('[task-notifier] Expo push failed', response.status, text);
      }
    } catch (err) {
      console.error('[task-notifier] Expo push exception', err);
    }
  }
}

let warnedMissingFcmCredentials = false;

async function sendFcmNotifications(
  tokens: string[],
  payload: { title: string; body: string; data: Record<string, unknown> },
) {
  if (!tokens.length) return;
  if (!fcmServerKey) {
    if (!warnedMissingFcmCredentials) {
      console.log('[task-notifier] FCM_SERVER_KEY missing, skip FCM push dispatch');
      warnedMissingFcmCredentials = true;
    }
    return;
  }

  const batches = chunkTokens(tokens, 500);
  for (const batch of batches) {
    try {
      const response = await fetch(fcmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('[task-notifier] FCM push failed', response.status, text);
      }
    } catch (err) {
      console.error('[task-notifier] FCM push exception', err);
    }
  }
}

async function fetchAssignmentDetail(assignmentId: string | null): Promise<AssignmentDetail | null> {
  if (!assignmentId) return null;

  const { data, error } = await supabase
    .from('task_assignments')
    .select(
      `
        id,
        assignee_id,
        status,
        review_status,
        completion_note,
        review_note,
        tasks:tasks!inner (
          title,
          due_at
        ),
        profiles:profiles!inner (
          email,
          full_name
        )
      `,
    )
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    console.error('[task-notifier] fetch assignment detail error:', error);
    return null;
  }

  return (data ?? null) as AssignmentDetail | null;
}

function resolveTemplate(pack: LocalePack, event: EventType | string): LocaleTemplate {
  if (event in pack.templates) {
    return pack.templates[event as EventType];
  }
  return pack.templates.default;
}

async function dispatch(row: QueueRow) {
  const detail = await fetchAssignmentDetail(row.assignment_id);
  if (!detail) {
    console.log(`[task-notifier] assignment_id missing for event=${row.event_type}`);
    return;
  }

  const locale = getLocale();
  const pack = localeCatalog[locale] ?? localeCatalog[DEFAULT_LOCALE];
  const footer = DEFAULT_EMAIL_FOOTER[locale] ?? DEFAULT_EMAIL_FOOTER[DEFAULT_LOCALE];

  const payload = (row.payload ?? {}) as AssignmentEventPayload;
  const assigneeId = payload.assignee_id ?? detail.assignee_id;
  const email = detail.profiles?.email ?? '';
  const assigneeName =
    detail.profiles?.full_name?.trim() || pack.fallbacks.assigneeName;
  const rawDue = detail.tasks?.due_at ?? null;
  const dueAt = pack.formatDate(rawDue);
  const taskTitle =
    detail.tasks?.title?.trim() || pack.fallbacks.taskTitle;
  const statusLabel = pack.statusLabel(payload.new_status ?? detail.status ?? null);
  const reviewStatusLabel = pack.reviewStatusLabel(
    payload.new_review_status ?? detail.review_status ?? null,
  );

  const template = resolveTemplate(pack, row.event_type);
  const ctx: TemplateContext = {
    assigneeName,
    taskTitle,
    dueAt,
    rawDueAt: rawDue,
    statusLabel,
    reviewStatusLabel,
    completionNote: detail.completion_note ?? undefined,
    reviewNote: detail.review_note ?? undefined,
    taskLink: buildTaskLink(row.task_id),
  };

  const rendered = template(ctx);
  const bodyLines = [...rendered.bodyLines];

  if (ctx.taskLink) {
    bodyLines.push('', locale === 'zh-CN' ? `任务链接：${ctx.taskLink}` : `Task link: ${ctx.taskLink}`);
  }

  bodyLines.push('', footer);

  if (email && emailTransport) {
    try {
      await emailTransport.send({
        from: notifyFrom || FALLBACK_FROM,
        to: email,
        subject: rendered.subject,
        content: bodyLines.join('\n'),
      });
      console.log(`[task-notifier] email dispatched to ${email} (${row.event_type})`);
    } catch (err) {
      console.error('[task-notifier] email dispatch error:', err);
    }
  } else {
    console.log('[task-notifier] email dispatch skipped (missing recipient or SMTP config)');
  }

  if (!assigneeId) {
    return;
  }

  const tokens = await fetchDeviceTokens(assigneeId);
  if (!tokens.length) {
    return;
  }

  const pushPayload = {
    title: rendered.subject,
    body: rendered.pushMessage,
    data: {
      event: row.event_type,
      taskId: row.task_id,
      assignmentId: row.assignment_id,
      dueAt: ctx.rawDueAt,
    },
  };
  if (ctx.taskLink) {
    pushPayload.data.link = ctx.taskLink;
  }

  const expoTokens = tokens
    .filter((item) => item.provider === 'expo' && item.token.startsWith('ExponentPushToken'))
    .map((item) => item.token);
  const fcmTokens = tokens.filter((item) => item.provider === 'fcm').map((item) => item.token);
  const apnsTokens = tokens.filter((item) => item.provider === 'apns').map((item) => item.token);

  if (expoTokens.length) {
    await sendExpoNotifications(expoTokens, pushPayload);
  }
  if (fcmTokens.length) {
    await sendFcmNotifications(fcmTokens, pushPayload);
  }
  if (apnsTokens.length) {
    console.log('[task-notifier] APNs delivery not configured, tokens skipped', apnsTokens.length);
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
