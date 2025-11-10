'use client';

import { Share } from 'react-native';
import { useMemo, useState } from 'react';
import { Alert, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';
import { getExtraString } from '../../lib/runtimeConfig';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { PUBLISH_TEMPLATES, type PublishTemplate } from './templates';

type PublishFormProps = {
  session: Session | null;
  organization: ActiveOrganization | null;
  onSuccess?: () => void;
};

export function PublishForm({ session, organization, onSuccess }: PublishFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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

      const { error: assignmentError } = await supabase.from('task_assignments').insert({
        task_id: taskId,
        assignee_id: session.user.id,
        status: 'sent',
      });

      if (assignmentError) {
        throw assignmentError;
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
        />
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.primaryButton,
          (!organization || submitting) && styles.buttonDisabled,
        ]}
        disabled={!organization || submitting}
        onPress={() => void handleSubmit()}
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
