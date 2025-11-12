'use client';

import { Share } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';
import { getExtraString } from '../../lib/runtimeConfig';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { useOrganizationMembers } from '../organizations/useOrganizationMembers';
import { PUBLISH_TEMPLATES, type PublishTemplate } from './templates';
import {
  useAttachmentActions,
  type AttachmentSource,
  type PickedAttachment,
} from '../tasks/useAttachmentActions';
import {
  ATTACHMENT_SOURCE_META,
  DEFAULT_ATTACHMENT_SOURCES,
} from '../tasks/attachmentSources';

type PublishFormProps = {
  session: Session | null;
  organization: ActiveOrganization | null;
  onSuccess?: () => void;
};

type AttachmentDraft = {
  id: string;
  source: AttachmentSource;
  file: PickedAttachment;
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }
  const value = bytes / (1024 * 1024);
  return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
};

export function PublishForm({ session, organization, onSuccess }: PublishFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    session?.user?.id ? [session.user.id] : [],
  );
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [attachmentPicking, setAttachmentPicking] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const shareBaseUrl =
    getExtraString('shareBaseUrl') ||
    getExtraString('webBaseUrl') ||
    process.env.EXPO_PUBLIC_SHARE_BASE_URL ||
    process.env.EXPO_PUBLIC_WEB_BASE_URL ||
    '';

  const subtitle = useMemo(() => {
    if (organization) {
      return t('app.publish.form.orgLabel', { name: organization.name });
    }
    return t('app.publish.form.orgMissing');
  }, [organization]);

  const selectedTemplate = useMemo(
    () => PUBLISH_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId],
  );

  const selectedChecklistLabels = useMemo(() => {
    if (!selectedTemplate?.defaultChecklistKeys?.length) return [];
    return selectedTemplate.defaultChecklistKeys.map((key) => t(key));
  }, [selectedTemplate]);

  const {
    members,
    loading: membersLoading,
    error: membersError,
    refresh: refreshMembers,
  } = useOrganizationMembers(organization?.id ?? null);
  const { pickAttachment, uploadAttachment, maxAttachmentSize } = useAttachmentActions();
  const maxAttachmentSizeLabel = useMemo(
    () => formatFileSize(maxAttachmentSize),
    [maxAttachmentSize],
  );

  useEffect(() => {
    if (!session?.user?.id) {
      setAssigneeIds([]);
      return;
    }
    setAssigneeIds([session.user.id]);
  }, [session?.user?.id, organization?.id]);

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0];

  const buildChecklistMarkdown = (template: PublishTemplate) => {
    if (!template.defaultChecklistKeys?.length) return '';
    return template.defaultChecklistKeys.map((key) => `- [ ] ${t(key)}`).join('\n');
  };

  const buildShareLink = (template?: PublishTemplate | null) => {
    if (!shareBaseUrl) return null;
    const trimmedBase = shareBaseUrl.endsWith('/') ? shareBaseUrl.slice(0, -1) : shareBaseUrl;
    if (template?.sharePath) {
      return `${trimmedBase}${template.sharePath}`;
    }
    return `${trimmedBase}/tasks`;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueAt('');
    setRequireAttachment(false);
    setSelectedTemplateId(null);
    setAssigneeIds(session?.user?.id ? [session.user.id] : []);
    setAttachmentDrafts([]);
    setAttachmentError(null);
  };

  const applyTemplate = (template: PublishTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(t(template.defaultTitleKey));
    const baseDescription = t(template.defaultDescriptionKey);
    const checklist = buildChecklistMarkdown(template);
    setDescription(checklist ? `${baseDescription}\n\n${checklist}` : baseDescription);
    if (template.dueInHours) {
      const dueDate = new Date(Date.now() + template.dueInHours * 60 * 60 * 1000);
      setDueAt(formatDateInput(dueDate));
    } else {
      setDueAt('');
    }
    setRequireAttachment(Boolean(template.requireAttachment));
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.auth'));
      return;
    }
    if (!organization) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.orgMissing'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.title'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        organization_id: organization.id,
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        require_attachment: requireAttachment,
        created_by: session.user.id,
        group_id: null,
      };

      const { data: taskRows, error: taskError } = await supabase
        .from('tasks')
        .insert(payload)
        .select('id')
        .limit(1);

      if (taskError) {
        throw taskError;
      }

      const taskId = taskRows?.[0]?.id;
      if (!taskId) {
        throw new Error('Task creation failed');
      }

      const targets =
        assigneeIds.length > 0 ? assigneeIds : session.user?.id ? [session.user.id] : [];

      if (targets.length === 0) {
        throw new Error(t('app.publish.errors.assignees'));
      }

      const assignmentPayload = targets.map((assigneeId) => ({
        task_id: taskId,
        assignee_id: assigneeId,
        status: 'sent',
      }));

      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert(assignmentPayload);

      if (assignmentError) {
        throw assignmentError;
      }

      if (attachmentDrafts.length > 0) {
        for (const draft of attachmentDrafts) {
          await uploadAttachment(taskId, draft.file);
        }
      }

      Alert.alert(t('app.publish.alertTitle'), t('app.publish.success'));
      resetForm();
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('app.publish.errors.generic');
      setError(message);
      Alert.alert(t('app.publish.alertTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleShareWorkspace = async () => {
    if (!shareBaseUrl) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.shareUnavailable'));
      return;
    }
    const link = buildShareLink();
    if (!link) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.shareUnavailable'));
      return;
    }
    await Share.share({
      message: t('app.publish.shareMessage', { link }),
    });
  };

  const randomId = () => `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const handleAddAttachment = async (source: AttachmentSource) => {
    setAttachmentError(null);
    setAttachmentPicking(true);
    try {
      const picked = await pickAttachment(source);
      if (!picked) return;
      setAttachmentDrafts((prev) => [
        {
          id: randomId(),
          source,
          file: picked,
        },
        ...prev,
      ]);
    } catch (err) {
      const fallback = t('app.publish.attachments.addErrorFallback');
      const friendly = err instanceof Error ? err.message : fallback;
      const message = t('app.publish.attachments.addError', { error: friendly });
      setAttachmentError(message);
      Alert.alert(t('app.publish.alertTitle'), message);
    } finally {
      setAttachmentPicking(false);
    }
  };

  const handleRemoveAttachment = (draftId: string) => {
    setAttachmentDrafts((prev) => prev.filter((item) => item.id !== draftId));
  };

  const handleShareTemplate = async () => {
    if (!selectedTemplate) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.shareTemplateMissing'));
      return;
    }
    const link = buildShareLink(selectedTemplate);
    if (!link) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.shareUnavailable'));
      return;
    }
    await Share.share({
      message: t(
        selectedTemplate.shareMessageKey ?? 'app.publish.shareTemplateMessage',
        {
          title: title || t(selectedTemplate.defaultTitleKey),
          link,
        },
      ),
    });
  };

  const templateShareDisabled = !selectedTemplate || !shareBaseUrl || submitting;

  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.sectionTitle}>{t('app.publish.form.title')}</Text>
        <Text style={styles.sectionHint}>{subtitle}</Text>
      </View>
      <View style={styles.chipRow}>
        {PUBLISH_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.chip,
              selectedTemplateId === template.id && styles.chipActive,
            ]}
            onPress={() => applyTemplate(template)}
            disabled={submitting}
          >
            <Text
              style={[
                styles.chipLabel,
                selectedTemplateId === template.id && styles.chipLabelActive,
              ]}
            >
              {template.icon} {t(template.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.helperText}>{t('app.publish.templates.hint')}</Text>

      {selectedTemplate ? (
        <View style={styles.publishTemplateCard}>
          <Text style={styles.publishTemplateTitle}>
            {selectedTemplate.icon} {t(selectedTemplate.labelKey)}
          </Text>
          <Text style={styles.publishTemplateDescription}>
            {t(selectedTemplate.descriptionKey)}
          </Text>
          {selectedTemplate.dueInHours ? (
            <Text style={styles.helperText}>
              {t('app.publish.templates.dueHint', { hours: selectedTemplate.dueInHours })}
            </Text>
          ) : null}
          {selectedChecklistLabels.length ? (
            <View style={styles.publishTemplateChecklist}>
              {selectedChecklistLabels.map((label, index) => (
                <View
                  key={`${selectedTemplate.id}-${index}`}
                  style={styles.publishTemplateChecklistItem}
                >
                  <Text style={styles.publishTemplateChecklistIcon}>☑️</Text>
                  <Text style={styles.publishTemplateChecklistLabel}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.helperText}>{t('app.publish.templates.placeholder')}</Text>
      )}

      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.form.field.title')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('app.publish.form.field.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          editable={!submitting}
          testID="publish-title-input"
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.assignees.title')}</Text>
        <Text style={styles.helperText}>
          {organization
            ? t('app.publish.assignees.subtitle', { name: organization.name })
            : t('app.publish.assignees.subtitleFallback')}
        </Text>
        {membersError ? (
          <View style={styles.reminderActionRow}>
            <Text style={styles.errorText}>
              {t('app.publish.assignees.error', { error: membersError })}
            </Text>
            <Pressable
              style={[styles.reminderActionButton, styles.chip]}
              onPress={() => void refreshMembers()}
            >
              <Text style={styles.reminderActionButtonText}>
                {t('app.publish.assignees.retry')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {membersLoading ? (
          <Text style={styles.helperText}>{t('app.publish.assignees.loading')}</Text>
        ) : members.length === 0 ? (
          <Text style={styles.helperText}>{t('app.publish.assignees.empty')}</Text>
        ) : (
          <View style={styles.chipRow}>
            {members.map((member) => {
              const active = assigneeIds.includes(member.userId);
              return (
                <Pressable
                  key={member.userId}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleAssignee(member.userId)}
                >
                  <Text
                    style={[styles.chipLabel, active && styles.chipLabelActive]}
                    numberOfLines={1}
                  >
                    {member.fullName ?? member.userId.slice(0, 6)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.form.field.description')}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder={t('app.publish.form.field.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          editable={!submitting}
          testID="publish-description-input"
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>{t('app.publish.form.field.dueAt')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t('app.publish.form.field.dueAtPlaceholder')}
          value={dueAt}
          onChangeText={setDueAt}
          editable={!submitting}
        />
        <Text style={styles.helperText}>{t('app.publish.form.field.dueAtHint')}</Text>
      </View>

      <View style={[styles.formField, styles.switchRow]}>
        <View>
          <Text style={styles.formLabel}>{t('app.publish.form.field.requireAttachment')}</Text>
          <Text style={styles.helperText}>
            {t('app.publish.form.field.requireAttachmentHint')}
          </Text>
        </View>
        <Switch
          value={requireAttachment}
          onValueChange={setRequireAttachment}
          disabled={!organization || submitting}
        />
      </View>

      <View style={styles.formField}>
        <View style={styles.attachmentHeaderRow}>
          <View style={styles.attachmentTitleRow}>
            <Text style={styles.formLabel}>{t('app.publish.attachments.title')}</Text>
            {requireAttachment ? (
              <Text style={styles.attachmentRequiredBadge}>
                {t('task.attachments.required')}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.helperText}>{t('app.publish.attachments.subtitle')}</Text>

        {attachmentDrafts.length === 0 ? (
          <Text style={styles.helperText}>{t('app.publish.attachments.empty')}</Text>
        ) : (
          <View style={styles.attachmentPendingSection}>
            {attachmentDrafts.map((draft) => (
              <View key={draft.id} style={styles.attachmentPendingItem}>
                <View style={styles.attachmentPendingInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {draft.file.name}
                  </Text>
                  <Text style={styles.attachmentPendingMeta}>
                    {ATTACHMENT_SOURCE_META[draft.source].icon}{' '}
                    {t(ATTACHMENT_SOURCE_META[draft.source].labelKey)} ·{' '}
                    {formatFileSize(draft.file.size)}
                  </Text>
                </View>
                <View style={styles.attachmentPendingActions}>
                  <Pressable
                    style={styles.attachmentPendingRemove}
                    onPress={() => handleRemoveAttachment(draft.id)}
                  >
                    <Text style={styles.attachmentPendingRemoveText}>
                      {t('app.publish.attachments.remove')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.helperText}>{t('app.publish.attachments.sourcesTitle')}</Text>
        <View style={styles.attachmentSourceRow}>
          {DEFAULT_ATTACHMENT_SOURCES.map((source) => {
            const meta = ATTACHMENT_SOURCE_META[source];
            return (
              <Pressable
                key={source}
                style={[
                  styles.attachmentSourceButton,
                  (attachmentPicking || submitting) && styles.buttonDisabled,
                ]}
                disabled={attachmentPicking || submitting}
                onPress={() => void handleAddAttachment(source)}
              >
                <Text style={styles.attachmentSourceIcon}>{meta.icon}</Text>
                <Text style={styles.attachmentSourceLabel}>
                  {t(meta.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helperText}>
          {t('app.publish.attachments.limit', { size: maxAttachmentSizeLabel })}
        </Text>
        {attachmentError ? <Text style={styles.errorText}>{attachmentError}</Text> : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.primaryButton,
          (!organization || submitting) && styles.buttonDisabled,
        ]}
        disabled={!organization || submitting}
        onPress={() => void handleSubmit()}
        testID="publish-submit-button"
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? t('common.processing') : t('app.publish.form.submit')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.secondaryButton,
          templateShareDisabled && styles.buttonDisabled,
        ]}
        disabled={templateShareDisabled}
        onPress={() => void handleShareTemplate()}
      >
        <Text style={styles.secondaryButtonText}>
          {t('app.publish.shareTemplateButton')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.secondaryButton}
        onPress={() => void handleShareWorkspace()}
      >
        <Text style={styles.secondaryButtonText}>{t('app.publish.shareButton')}</Text>
      </TouchableOpacity>
    </View>
  );
}
