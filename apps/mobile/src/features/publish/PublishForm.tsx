import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';
import { styles } from '../../styles/appStyles';
import type { ActiveOrganization } from '../organizations/useActiveOrganization';
import { useOrganizationMembers } from '../organizations/useOrganizationMembers';
import { useUserMemberships } from '../organizations/useUserMemberships';
import { useAttachmentActions, type AttachmentSource } from '../tasks/useAttachmentActions';
import { formatFileSize } from './formatFileSize';
import { PUBLISH_TEMPLATES, type PublishTemplate } from './templates';
import { PublishHeader } from './components/PublishHeader';
import { PublishFooter } from './components/PublishFooter';
import { TagFilterDrawer } from './components/TagFilterDrawer';
import { useMemberTagFilters } from '../tags/useMemberTagFilters';
import { PublishBasicsStep } from './components/steps/PublishBasicsStep';
import { PublishAssigneesStep } from './components/steps/PublishAssigneesStep';
import { PublishScheduleStep } from './components/steps/PublishScheduleStep';
import { PublishRequirementsStep } from './components/steps/PublishRequirementsStep';
import type { AttachmentDraft, PublishStep } from './types';
import {
  DATE_PATTERN,
  DAY_IN_MS,
  INDEX_TO_WEEKDAY,
  TIME_PATTERN,
  WEEKDAY_OPTIONS,
  type WeekdayKey,
  parseDateUtc,
} from './scheduleUtils';

type PublishFormProps = {
  session: Session | null;
  organization: ActiveOrganization | null;
  onSuccess?: () => void;
  onClose?: () => void;
};

type ScheduleOccurrence = {
  due_at: string | null;
  schedule_type: 'deadline' | 'window';
  schedule_window_start: string | null;
  schedule_window_end: string | null;
};

type ScheduleBuildResult =
  | {
      ok: true;
      occurrences: ScheduleOccurrence[];
    }
  | {
      ok: false;
      error: string;
    };

const RECENT_ORGS_KEY = 'publish_recent_orgs';
const SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const SIZE_LIMIT_LABEL = '20 MB';
const DEFAULT_DEADLINE_TIME = '23:59';
const MAX_SCHEDULE_OCCURRENCES = 20;

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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [attachmentPicking, setAttachmentPicking] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [scheduleType, setScheduleType] = useState<'one-time' | 'daily' | 'weekly'>('one-time');
  const [onceWindowStart, setOnceWindowStart] = useState('');
  const [onceWindowEnd, setOnceWindowEnd] = useState('');
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailyWindowStart, setDailyWindowStart] = useState('');
  const [dailyWindowEnd, setDailyWindowEnd] = useState('');
  const [weeklyStartDate, setWeeklyStartDate] = useState('');
  const [weeklyEndDate, setWeeklyEndDate] = useState('');
  const [weeklyWindowStart, setWeeklyWindowStart] = useState('');
  const [weeklyWindowEnd, setWeeklyWindowEnd] = useState('');
  const [weeklyDays, setWeeklyDays] = useState<WeekdayKey[]>(['mon']);
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
  const {
    categories: tagCategories,
    filters: tagFilters,
    loading: tagFiltersLoading,
    error: tagFiltersError,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    matchesMember,
    memberTagIndex,
  } = useMemberTagFilters(effectiveOrgId ?? null);
  const filteredMembers = useMemo(
    () => (hasActiveFilters ? members.filter((member) => matchesMember(member.id)) : members),
    [members, hasActiveFilters, matchesMember],
  );
  const membershipToUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      map.set(member.id, member.userId);
    });
    return map;
  }, [members]);
  const memberSummaries = useMemo(
    () =>
      members.map((member) => ({
        membershipId: member.id,
        userId: member.userId,
        name: member.displayName ?? member.fullName ?? member.userId.slice(0, 6),
      })),
    [members],
  );

  const scheduleResult = useMemo<ScheduleBuildResult>(() => {
    const combineDateTime = (date: Date, time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      const timestamp = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hour,
        minute,
        0,
        0,
      );
      return new Date(timestamp);
    };

    const resolveWindow = (start?: string, end?: string) => {
      const startTrimmed = start?.trim() ?? '';
      const endTrimmed = end?.trim() ?? '';
      if (!startTrimmed && !endTrimmed) {
        return { kind: 'none' } as const;
      }
      if (!startTrimmed || !endTrimmed) {
        return { kind: 'error', message: t('app.publish.schedule.errors.windowPair') } as const;
      }
      if (!TIME_PATTERN.test(startTrimmed) || !TIME_PATTERN.test(endTrimmed)) {
        return { kind: 'error', message: t('app.publish.schedule.errors.timeFormat') } as const;
      }
      if (startTrimmed >= endTrimmed) {
        return { kind: 'error', message: t('app.publish.schedule.errors.windowOrder') } as const;
      }
      return { kind: 'window', start: startTrimmed, end: endTrimmed } as const;
    };

    const createOccurrence = (date: Date, windowInfo: { start: string; end: string } | null): ScheduleOccurrence => {
      if (windowInfo) {
        const start = combineDateTime(date, windowInfo.start);
        const end = combineDateTime(date, windowInfo.end);
        return {
          schedule_type: 'window',
          due_at: end.toISOString(),
          schedule_window_start: start.toISOString(),
          schedule_window_end: end.toISOString(),
        };
      }
      const deadline = combineDateTime(date, DEFAULT_DEADLINE_TIME);
      return {
        schedule_type: 'deadline',
        due_at: deadline.toISOString(),
        schedule_window_start: null,
        schedule_window_end: null,
      };
    };

    if (scheduleType === 'one-time') {
      const trimmedDate = dueAt.trim();
      if (!trimmedDate) {
        return { ok: false, error: t('app.publish.schedule.errors.dateRequired') };
      }
      const parsedDate = parseDateUtc(trimmedDate.trim());
      if (!parsedDate) {
        return { ok: false, error: t('app.publish.schedule.errors.dateFormat') };
      }
      const windowInfo = resolveWindow(onceWindowStart, onceWindowEnd);
      if (windowInfo.kind === 'error') {
        return { ok: false, error: windowInfo.message };
      }
      const occurrence = createOccurrence(parsedDate, windowInfo.kind === 'window' ? windowInfo : null);
      return { ok: true, occurrences: [occurrence] };
    }

    if (scheduleType === 'daily') {
      const trimmedStart = dailyStartDate.trim();
      if (!trimmedStart) {
        return { ok: false, error: t('app.publish.schedule.errors.dateRequired') };
      }
      const startDate = parseDateUtc(trimmedStart);
      if (!startDate) {
        return { ok: false, error: t('app.publish.schedule.errors.dateFormat') };
      }
      const trimmedEnd = dailyEndDate.trim();
      const endDate = trimmedEnd ? parseDateUtc(trimmedEnd) : startDate;
      if (!endDate) {
        return { ok: false, error: t('app.publish.schedule.errors.dateFormat') };
      }
      if (endDate.getTime() < startDate.getTime()) {
        return { ok: false, error: t('app.publish.schedule.errors.range') };
      }
      const windowInfo = resolveWindow(dailyWindowStart, dailyWindowEnd);
      if (windowInfo.kind === 'error') {
        return { ok: false, error: windowInfo.message };
      }
      const occurrences: ScheduleOccurrence[] = [];
      for (
        let cursor = new Date(startDate.getTime());
        cursor.getTime() <= endDate.getTime();
        cursor = new Date(cursor.getTime() + DAY_IN_MS)
      ) {
        if (occurrences.length >= MAX_SCHEDULE_OCCURRENCES) {
          return {
            ok: false,
            error: t('app.publish.schedule.errors.maxOccurrences', { max: MAX_SCHEDULE_OCCURRENCES }),
          };
        }
        occurrences.push(createOccurrence(cursor, windowInfo.kind === 'window' ? windowInfo : null));
      }
      return { ok: true, occurrences };
    }

    const trimmedStart = weeklyStartDate.trim();
    if (!trimmedStart) {
      return { ok: false, error: t('app.publish.schedule.errors.dateRequired') };
    }
    const startDate = parseDateUtc(trimmedStart);
    if (!startDate) {
      return { ok: false, error: t('app.publish.schedule.errors.dateFormat') };
    }
    if (weeklyDays.length === 0) {
      return { ok: false, error: t('app.publish.schedule.errors.weekdayRequired') };
    }
    const trimmedEnd = weeklyEndDate.trim();
    const defaultEnd = new Date(startDate.getTime() + 6 * DAY_IN_MS);
    const endDate = trimmedEnd ? parseDateUtc(trimmedEnd) : defaultEnd;
    if (!endDate) {
      return { ok: false, error: t('app.publish.schedule.errors.dateFormat') };
    }
    if (endDate.getTime() < startDate.getTime()) {
      return { ok: false, error: t('app.publish.schedule.errors.range') };
    }
    const windowInfo = resolveWindow(weeklyWindowStart, weeklyWindowEnd);
    if (windowInfo.kind === 'error') {
      return { ok: false, error: windowInfo.message };
    }
    const weeklySet = new Set(weeklyDays);
    const occurrences: ScheduleOccurrence[] = [];
    for (
      let cursor = new Date(startDate.getTime());
      cursor.getTime() <= endDate.getTime();
      cursor = new Date(cursor.getTime() + DAY_IN_MS)
    ) {
      const dayKey = INDEX_TO_WEEKDAY[cursor.getUTCDay()];
      if (weeklySet.has(dayKey)) {
        if (occurrences.length >= MAX_SCHEDULE_OCCURRENCES) {
          return {
            ok: false,
            error: t('app.publish.schedule.errors.maxOccurrences', { max: MAX_SCHEDULE_OCCURRENCES }),
          };
        }
        occurrences.push(createOccurrence(cursor, windowInfo.kind === 'window' ? windowInfo : null));
      }
    }
    if (occurrences.length === 0) {
      return { ok: false, error: t('app.publish.schedule.errors.noOccurrences') };
    }
    return { ok: true, occurrences };
  }, [
    scheduleType,
    dueAt,
    onceWindowStart,
    onceWindowEnd,
    dailyStartDate,
    dailyEndDate,
    dailyWindowStart,
    dailyWindowEnd,
    weeklyStartDate,
    weeklyEndDate,
    weeklyWindowStart,
    weeklyWindowEnd,
    weeklyDays,
  ]);
  const scheduleValid = scheduleResult.ok;
  const schedulePreviewCount = scheduleResult.ok ? scheduleResult.occurrences.length : 0;

  useEffect(() => {
    setAssigneeIds([]);
  }, [effectiveOrgId]);

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

  const handleAppendMembers = (membershipIds: string[]) => {
    if (membershipIds.length === 0) return;
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      membershipIds.forEach((membershipId) => {
        const userId = membershipToUserId.get(membershipId);
        if (userId) {
          next.add(userId);
        }
      });
      return Array.from(next);
    });
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
    if (!scheduleResult.ok) {
      Alert.alert(t('app.publish.alertTitle'), scheduleResult.error);
      setStep(2);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const basePayload = {
        organization_id: effectiveOrgId,
        title: title.trim(),
        description: description.trim() || null,
        require_attachment: requireAttachment,
        created_by: session.user.id,
        group_id: null,
        auto_accept: autoAccept,
        auto_archive: autoArchive,
      };

      const taskPayloads = scheduleResult.occurrences.map((occurrence) => ({
        ...basePayload,
        due_at: occurrence.due_at,
        schedule_type: occurrence.schedule_type,
        schedule_window_start: occurrence.schedule_window_start,
        schedule_window_end: occurrence.schedule_window_end,
      }));

      const { data: taskRows, error: taskError } = await supabase.from('tasks').insert(taskPayloads).select('id');
      if (taskError) throw taskError;
      const taskIds = taskRows?.map((row) => row.id).filter((id): id is string => Boolean(id)) ?? [];
      if (taskIds.length !== taskPayloads.length) {
        throw new Error('Task creation failed');
      }

      const assignmentPayload = taskIds.flatMap((taskId) =>
        assigneeIds.map((assigneeId) => ({
          task_id: taskId,
          assignee_id: assigneeId,
          status: 'sent',
        })),
      );
      const { error: assignmentError } = await supabase.from('task_assignments').insert(assignmentPayload);
      if (assignmentError) throw assignmentError;

      if (attachmentDrafts.length > 0) {
        for (const taskId of taskIds) {
          for (const draft of attachmentDrafts) {
            await uploadAttachment(taskId, draft.file);
          }
        }
      }

      Alert.alert(t('app.publish.alertTitle'), t('app.publish.success'));
      onSuccess?.();
      setStep(0);
      setAssigneeIds([]);
      setAttachmentDrafts([]);
      setDueAt('');
      setOnceWindowStart('');
      setOnceWindowEnd('');
      setDailyStartDate('');
      setDailyEndDate('');
      setDailyWindowStart('');
      setDailyWindowEnd('');
      setWeeklyStartDate('');
      setWeeklyEndDate('');
      setWeeklyWindowStart('');
      setWeeklyWindowEnd('');
      setWeeklyDays(['mon']);
      setScheduleType('one-time');
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
          <PublishBasicsStep
            showTemplates={showTemplates}
            onToggleTemplates={() => setShowTemplates((prev) => !prev)}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleTemplateSelect}
            submitting={submitting}
            title={title}
            onChangeTitle={setTitle}
            description={description}
            onChangeDescription={setDescription}
            attachmentDrafts={attachmentDrafts}
            requireAttachment={requireAttachment}
            attachmentPicking={attachmentPicking}
            maxAttachmentSizeLabel={`${maxAttachmentSizeLabel} / ${SIZE_LIMIT_LABEL}`}
            attachmentError={attachmentError}
            onAddAttachment={(source: AttachmentSource) => void handleAddAttachment(source)}
            onRemoveAttachment={handleRemoveAttachment}
          />
        );
      case 1:
        return (
          <PublishAssigneesStep
            availableOrgs={availableOrgs}
            effectiveOrgId={effectiveOrgId}
            onSelectOrg={handleSelectOrg}
            organizationName={effectiveOrgName}
            onOpenFilters={() => setFilterDrawerVisible(true)}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            assigneeIds={assigneeIds}
            members={members}
            filteredMembers={filteredMembers}
            membershipToUserId={membershipToUserId}
            onAppendMembers={handleAppendMembers}
            onClearAssignees={handleClearAssignees}
            onToggleAssignee={toggleAssignee}
            membersLoading={membersLoading}
            membersError={membersError}
            refreshMembers={refreshMembers}
            hasFilterMatches={filteredMembers.length > 0}
            tagFiltersLoading={tagFiltersLoading}
          />
        );
      case 2:
        return (
          <PublishScheduleStep
            scheduleType={scheduleType}
            onChangeScheduleType={setScheduleType}
            dueAt={dueAt}
            onChangeDueAt={setDueAt}
            onceWindowStart={onceWindowStart}
            onChangeOnceWindowStart={setOnceWindowStart}
            onceWindowEnd={onceWindowEnd}
            onChangeOnceWindowEnd={setOnceWindowEnd}
            dailyStartDate={dailyStartDate}
            onChangeDailyStartDate={setDailyStartDate}
            dailyEndDate={dailyEndDate}
            onChangeDailyEndDate={setDailyEndDate}
            dailyWindowStart={dailyWindowStart}
            onChangeDailyWindowStart={setDailyWindowStart}
            dailyWindowEnd={dailyWindowEnd}
            onChangeDailyWindowEnd={setDailyWindowEnd}
            weeklyStartDate={weeklyStartDate}
            onChangeWeeklyStartDate={setWeeklyStartDate}
            weeklyEndDate={weeklyEndDate}
            onChangeWeeklyEndDate={setWeeklyEndDate}
            weeklyWindowStart={weeklyWindowStart}
            onChangeWeeklyWindowStart={setWeeklyWindowStart}
            weeklyWindowEnd={weeklyWindowEnd}
            onChangeWeeklyWindowEnd={setWeeklyWindowEnd}
            weeklyDays={weeklyDays}
            onToggleWeekday={(day) =>
              setWeeklyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
            }
            scheduleValid={scheduleValid}
            scheduleError={scheduleValid ? null : scheduleResult.error}
            schedulePreviewCount={schedulePreviewCount}
            maxOccurrences={MAX_SCHEDULE_OCCURRENCES}
          />
        );
      case 3:
        return (
          <PublishRequirementsStep
            requireAttachment={requireAttachment}
            onChangeRequireAttachment={setRequireAttachment}
            autoAccept={autoAccept}
            onChangeAutoAccept={setAutoAccept}
            autoArchive={autoArchive}
            onChangeAutoArchive={setAutoArchive}
            submitting={submitting}
          />
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

  const nextDisabled =
    submitting ||
    (step === 0 && !title.trim()) ||
    (step === 1 && assigneeIds.length === 0) ||
    (step === 2 && !scheduleValid);

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
          } else if (step === 2 && !scheduleResult.ok) {
            Alert.alert(t('app.publish.alertTitle'), scheduleResult.error);
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
      <TagFilterDrawer
        visible={filterDrawerVisible}
        categories={tagCategories}
        filters={tagFilters}
        loading={tagFiltersLoading}
        error={tagFiltersError}
        onApply={applyFilters}
        onClear={() => clearFilters()}
        onClose={() => setFilterDrawerVisible(false)}
        memberSummaries={memberSummaries}
        memberTagIndex={memberTagIndex}
        onAppendMatches={handleAppendMembers}
      />
    </View>
  );
}
