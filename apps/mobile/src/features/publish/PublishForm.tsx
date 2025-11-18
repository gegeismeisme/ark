import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { useOrganizationMembers } from '../organizations/useOrganizationMembers';
import { useUserMemberships } from '../organizations/useUserMemberships';
import {
  useAttachmentActions,
  type AttachmentSource,
  type PickedAttachment,
} from '../tasks/useAttachmentActions';
import { formatFileSize } from './formatFileSize';
import { PUBLISH_TEMPLATES, type PublishTemplate } from './templates';
import { PublishHeader } from './components/PublishHeader';
import { AttachmentPicker } from './components/AttachmentPicker';
import { TemplateList } from './components/TemplateList';
import { AssigneeSelector } from './components/AssigneeSelector';
import { PublishFooter } from './components/PublishFooter';

type PublishFormProps = {
  session: Session | null;
  organization: ActiveOrganization | null;
  onSuccess?: () => void;
  onClose?: () => void;
};

type AttachmentDraft = {
  id: string;
  source: AttachmentSource;
  file: PickedAttachment;
};

type PublishStep = 0 | 1 | 2 | 3;

const RECENT_ORGS_KEY = 'publish_recent_orgs';
const SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const SIZE_LIMIT_LABEL = '20 MB';

export function PublishForm({ session, organization, onSuccess, onClose }: PublishFormProps) {
  const [step, setStep] = useState<PublishStep>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [autoArchive, setAutoArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(session?.user?.id ? [session.user.id] : []);
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [attachmentPicking, setAttachmentPicking] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const { pickAttachment, uploadAttachment, maxAttachmentSize } = useAttachmentActions();
  const maxAttachmentSizeLabel = useMemo(() => formatFileSize(maxAttachmentSize), [maxAttachmentSize]);

  const { memberships: userMemberships } = useUserMemberships(session?.user.id ?? null);
  const adminOrganizations = useMemo(() => {
    const admins =
      (userMemberships ?? [])
        .filter((membership) => membership.role && ['owner', 'admin'].includes(membership.role))
        .map((membership) => ({
          id: membership.organizationId,
          name: membership.organizationName ?? membership.organizationId.slice(0, 6),
        })) ?? [];
    if (admins.length === 0 && organization) {
      return [{ id: organization.id, name: organization.name ?? organization.id.slice(0, 6) }];
    }
    return admins;
  }, [userMemberships, organization]);

  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(organization?.id ?? null);

  useEffect(() => {
    const loadPreferredOrgs = async () => {
      let ordered = adminOrganizations;
      try {
        const stored = await AsyncStorage.getItem(RECENT_ORGS_KEY);
        if (stored) {
          const recentIds: string[] = JSON.parse(stored);
          const recentSet = new Set(recentIds);
          ordered = [
            ...recentIds
              .filter((id) => adminOrganizations.some((org) => org.id === id))
              .map((id) => adminOrganizations.find((org) => org.id === id)!),
            ...adminOrganizations.filter((org) => !recentSet.has(org.id)),
          ];
        }
      } catch {
        ordered = adminOrganizations;
      }
      setAvailableOrgs(ordered);
      if (!selectedOrgId && ordered.length > 0) {
        setSelectedOrgId(ordered[0].id);
      }
    };
    void loadPreferredOrgs();
  }, [adminOrganizations, selectedOrgId]);

  const effectiveOrgId = selectedOrgId ?? organization?.id ?? availableOrgs[0]?.id ?? null;
  const effectiveOrgName =
    availableOrgs.find((orgItem) => orgItem.id === effectiveOrgId)?.name ?? organization?.name ?? null;

  const { members, loading: membersLoading, error: membersError, refresh: refreshMembers } =
    useOrganizationMembers(effectiveOrgId ?? null);

  useEffect(() => {
    if (!session?.user?.id) {
      setAssigneeIds([]);
      return;
    }
    setAssigneeIds([session.user.id]);
  }, [session?.user?.id, effectiveOrgId]);

  const handleTemplateSelect = (template: PublishTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(t(template.defaultTitleKey));
    const baseDescription = t(template.defaultDescriptionKey);
    const checklist = template.defaultChecklistKeys?.length
      ? template.defaultChecklistKeys.map((key) => `- [ ] ${t(key)}`).join('\n')
      : '';
    setDescription(checklist ? `${baseDescription}\n\n${checklist}` : baseDescription);
    if (template.dueInHours) {
      const dueDate = new Date(Date.now() + template.dueInHours * 3600 * 1000);
      setDueAt(dueDate.toISOString().split('T')[0]);
    } else {
      setDueAt('');
    }
    setRequireAttachment(Boolean(template.requireAttachment));
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const randomId = () => `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const handleAddAttachment = async (source: AttachmentSource) => {
    setAttachmentError(null);
    setAttachmentPicking(true);
    try {
      const picked = await pickAttachment(source);
      if (!picked) return;
      if (picked.size > SIZE_LIMIT_BYTES) {
        const message = t('app.publish.attachments.tooLarge', { size: SIZE_LIMIT_LABEL });
        setAttachmentError(message);
        Alert.alert(t('app.publish.alertTitle'), message);
        return;
      }
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

  const handleClearAssignees = () => {
    setAssigneeIds(session?.user?.id ? [session.user.id] : []);
  };

  const handleSelectOrg = async (orgId: string) => {
    if (orgId === effectiveOrgId) return;
    setSelectedOrgId(orgId);
    try {
      const stored = await AsyncStorage.getItem(RECENT_ORGS_KEY);
      const recentIds: string[] = stored ? JSON.parse(stored) : [];
      const next = [orgId, ...recentIds.filter((id) => id !== orgId)].slice(0, 5);
      await AsyncStorage.setItem(RECENT_ORGS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.auth'));
      return;
    }
    if (!effectiveOrgId) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.orgMissing'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.title'));
      return;
    }
    if (assigneeIds.length === 0) {
      Alert.alert(t('app.publish.alertTitle'), t('app.publish.errors.assignees'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        organization_id: effectiveOrgId,
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        require_attachment: requireAttachment,
        created_by: session.user.id,
        group_id: null,
        auto_accept: autoAccept,
        auto_archive: autoArchive,
      };

      const { data: taskRows, error: taskError } = await supabase
        .from('tasks')
        .insert(payload)
        .select('id')
        .limit(1);
      if (taskError) throw taskError;
      const taskId = taskRows?.[0]?.id;
      if (!taskId) throw new Error('Task creation failed');

      const assignmentPayload = assigneeIds.map((assigneeId) => ({
        task_id: taskId,
        assignee_id: assigneeId,
        status: 'sent',
      }));
      const { error: assignmentError } = await supabase.from('task_assignments').insert(assignmentPayload);
      if (assignmentError) throw assignmentError;

      if (attachmentDrafts.length > 0) {
        for (const draft of attachmentDrafts) {
          await uploadAttachment(taskId, draft.file);
        }
      }

      Alert.alert(t('app.publish.alertTitle'), t('app.publish.success'));
      onSuccess?.();
      setStep(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('app.publish.errors.generic');
      setError(message);
      Alert.alert(t('app.publish.alertTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.publishStepCard}>
            <View style={styles.formField}>
              <Pressable style={styles.publishTemplateToggle} onPress={() => setShowTemplates((prev) => !prev)}>
                <Text style={styles.publishTemplateToggleText}>
                  {showTemplates ? t('app.publish.templates.hide') : t('app.publish.templates.show')}
                </Text>
              </Pressable>
              {showTemplates ? (
                <TemplateList
                  selectedId={selectedTemplateId}
                  onSelect={handleTemplateSelect}
                  disabled={submitting}
                />
              ) : null}
            </View>
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
            <AttachmentPicker
              drafts={attachmentDrafts}
              requireAttachment={requireAttachment}
              picking={attachmentPicking}
              submitting={submitting}
              maxSizeLabel={`${maxAttachmentSizeLabel} / ${SIZE_LIMIT_LABEL}`}
              error={attachmentError}
              onAdd={(source) => void handleAddAttachment(source)}
              onRemove={handleRemoveAttachment}
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.publishStepCard}>
            <View style={styles.publishOrgSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableOrgs.map((orgItem) => {
                  const active = orgItem.id === effectiveOrgId;
                  return (
                    <Pressable
                      key={orgItem.id}
                      style={[styles.publishOrgPill, active && styles.publishOrgPillActive]}
                      onPress={() => handleSelectOrg(orgItem.id)}
                    >
                      <Text
                        style={[styles.publishOrgPillText, active && styles.publishOrgPillTextActive]}
                        numberOfLines={1}
                      >
                        {orgItem.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.publishFilterHeader}>
              <View>
                <Text style={styles.formLabel}>{t('app.publish.filters.title')}</Text>
                <Text style={styles.helperText}>{t('app.publish.filters.subtitle')}</Text>
              </View>
              <Pressable
                style={styles.publishFilterButton}
                onPress={() => Alert.alert(t('app.alert.noticeTitle'), t('app.publish.filters.comingSoon'))}
              >
                <Text style={styles.publishFilterButtonText}>{t('app.publish.filters.open')}</Text>
              </Pressable>
            </View>
            <View style={styles.publishFilterSummary}>
              <Text style={styles.publishFilterSummaryLabel}>
                {t('app.publish.assignees.count', { count: assigneeIds.length })}
              </Text>
              <Pressable
                onPress={handleClearAssignees}
                style={[styles.publishFilterButton, assigneeIds.length === 0 && styles.buttonDisabled]}
                disabled={assigneeIds.length === 0}
              >
                <Text style={styles.publishFilterButtonText}>{t('common.clear')}</Text>
              </Pressable>
            </View>
            <AssigneeSelector
              organizationName={effectiveOrgName}
              members={members}
              loading={membersLoading}
              error={membersError}
              selectedIds={assigneeIds}
              onToggle={toggleAssignee}
              onRefresh={refreshMembers}
            />
          </View>
        );
      case 2:
        return <View style={styles.publishStepCard}>{/* TODO: recurring task configuration */}</View>;
      case 3:
        return (
          <View style={styles.publishStepCard}>
            <View style={[styles.formField, styles.switchRow]}>
              <View>
                <Text style={styles.formLabel}>{t('app.publish.form.field.requireAttachment')}</Text>
                <Text style={styles.helperText}>{t('app.publish.form.field.requireAttachmentHint')}</Text>
              </View>
              <Switch value={requireAttachment} onValueChange={setRequireAttachment} disabled={submitting} />
            </View>
            <View style={[styles.formField, styles.switchRow]}>
              <View>
                <Text style={styles.formLabel}>{t('app.publish.form.field.autoAccept')}</Text>
                <Text style={styles.helperText}>{t('app.publish.form.field.autoAcceptHint')}</Text>
              </View>
              <Switch value={autoAccept} onValueChange={setAutoAccept} disabled={submitting} />
            </View>
            <View style={[styles.formField, styles.switchRow]}>
              <View>
                <Text style={styles.formLabel}>{t('app.publish.form.field.autoArchive')}</Text>
                <Text style={styles.helperText}>{t('app.publish.form.field.autoArchiveHint')}</Text>
              </View>
              <Switch value={autoArchive} onValueChange={setAutoArchive} disabled={submitting} />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const stepHeaders = [
    { title: t('app.publish.step.title'), subtitle: t('app.publish.step.subtitle') },
    { title: t('app.publish.step.assigneesTitle'), subtitle: t('app.publish.step.assigneesSubtitle') },
    { title: t('app.publish.step.scheduleTitle'), subtitle: t('app.publish.step.scheduleSubtitle') },
    { title: t('app.publish.step.requirementsTitle'), subtitle: t('app.publish.step.requirementsSubtitle') },
  ];

  const footerNextLabels = [
    t('common.next'),
    t('common.next'),
    t('common.next'),
    submitting ? t('common.processing') : t('app.publish.form.submit'),
  ];

  const nextDisabled = submitting || (step === 1 && assigneeIds.length === 0);

  return (
    <View style={styles.publishModalCard}>
      <PublishHeader
        title={stepHeaders[step]?.title}
        subtitle={stepHeaders[step]?.subtitle}
        stepLabel={`${step + 1}/4`}
        onClose={onClose}
      />
      <View style={styles.publishStepContent}>{renderStep()}</View>
      <PublishFooter
        onBack={step > 0 ? () => setStep((prev) => (prev - 1) as PublishStep) : undefined}
        backLabel={t('common.back')}
        onNext={() => {
          if (step === 3) {
            void handleSubmit();
          } else {
            setStep((prev) => (prev + 1) as PublishStep);
          }
        }}
        nextLabel={footerNextLabels[step]}
        disabled={nextDisabled}
      />
      {error ? (
        <View style={styles.publishErrorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
