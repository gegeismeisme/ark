'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from '@/lib/i18n/client';

import type { GroupMember } from '../types';

type TaskComposerAssigneeSelectorProps = {
  loading: boolean;
  totalMembers: number;
  members: GroupMember[];
  selectedAssignees: string[];
  onToggle: (userId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
};

export function TaskComposerAssigneeSelector({
  loading,
  totalMembers,
  members,
  selectedAssignees,
  onToggle,
  onSelectAll,
  onClear,
  disabled = false,
}: TaskComposerAssigneeSelectorProps) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);

  const groupRoleLabels = useMemo(
    () => ({
      admin: t('dashboard.tasks.assignees.roles.admin'),
      publisher: t('dashboard.tasks.assignees.roles.publisher'),
      member: t('dashboard.tasks.assignees.roles.member'),
    }),
    [t]
  );

  const orgRoleLabels = useMemo(
    () => ({
      owner: t('dashboard.tasks.assignees.orgRoles.owner'),
      admin: t('dashboard.tasks.assignees.orgRoles.admin'),
      member: t('dashboard.tasks.assignees.orgRoles.member'),
    }),
    [t]
  );

  const summary = useMemo(() => {
    if (loading) {
      return t('dashboard.tasks.assignees.summary.loading');
    }
    if (totalMembers === 0) {
      return t('dashboard.tasks.assignees.summary.groupEmpty');
    }
    if (members.length === 0) {
      return t('dashboard.tasks.assignees.summary.filteredEmpty');
    }
    if (selectedAssignees.length === 0) {
      return t('dashboard.tasks.assignees.summary.available', { count: members.length });
    }
    return t('dashboard.tasks.assignees.summary.selected', {
      selected: selectedAssignees.length,
      total: members.length,
    });
  }, [loading, members.length, selectedAssignees.length, t, totalMembers]);

  const renderOrgRole = (role?: GroupMember['orgRole']) => {
    if (!role) return null;
    return orgRoleLabels[role] ?? role;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {t('dashboard.tasks.assignees.title')}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{summary}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onSelectAll}
            disabled={disabled || loading || members.length === 0}
          >
            {t('dashboard.tasks.assignees.actions.selectAll')}
          </button>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onClear}
            disabled={disabled || selectedAssignees.length === 0}
          >
            {t('dashboard.tasks.assignees.actions.clear')}
          </button>
          <button
            type="button"
            className="ml-2 inline-flex items-center rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded
              ? t('dashboard.tasks.assignees.actions.collapse')
              : t('dashboard.tasks.assignees.actions.expand')}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          {loading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.assignees.summary.loading')}
            </p>
          ) : totalMembers === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.assignees.emptyGroupDescription')}
            </p>
          ) : members.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('dashboard.tasks.assignees.filteredEmptyDescription')}
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {members.map((member) => {
                const checked = selectedAssignees.includes(member.userId);
                return (
                  <label
                    key={member.userId}
                    className="flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-sm text-zinc-600 hover:border-zinc-200 dark:text-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
                        checked={checked}
                        onChange={() => onToggle(member.userId)}
                        disabled={disabled}
                      />
                      <span>
                        {member.fullName ?? member.userId.slice(0, 8)}
                        {groupRoleLabels[member.role]
                          ? ` · ${groupRoleLabels[member.role]}`
                          : ''}
                      </span>
                    </div>
                    {member.orgRole ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {t('dashboard.tasks.assignees.orgRoleLabel', {
                          role: renderOrgRole(member.orgRole),
                        })}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
