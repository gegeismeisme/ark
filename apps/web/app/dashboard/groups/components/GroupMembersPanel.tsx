'use client';

import { useMemo } from 'react';

import { useLocale, useTranslations } from '@/lib/i18n/client';

import {
  PaginationControls,
  usePagination,
} from '../../components/pagination';
import type {
  Group,
  GroupMember,
  GroupRole,
  OrgMember,
} from '../hooks/use-groups-dashboard';

type MemberFormState = {
  userId: string;
  setUserId: (value: string) => void;
  role: GroupRole;
  setRole: (value: GroupRole) => void;
  saving: boolean;
  error: string | null;
  add: () => void;
};

type GroupMembersPanelProps = {
  selectedGroup: Group | null;
  availableOrgMembers: OrgMember[];
  orgMembersLoading: boolean;
  orgMembersError: string | null;
  groupMembers: GroupMember[];
  groupMembersLoading: boolean;
  groupMembersError: string | null;
  memberForm: MemberFormState;
  onUpdateMemberRole: (memberId: string, role: GroupRole) => void;
  onRemoveMember: (memberId: string) => void;
};

const GROUP_ROLE_ORDER: GroupRole[] = ['member', 'publisher', 'admin'];
const ORG_ROLE_ORDER = ['owner', 'admin', 'member'] as const;

export function GroupMembersPanel({
  selectedGroup,
  availableOrgMembers,
  orgMembersLoading,
  orgMembersError,
  groupMembers,
  groupMembersLoading,
  groupMembersError,
  memberForm,
  onUpdateMemberRole,
  onRemoveMember,
}: GroupMembersPanelProps) {
  const t = useTranslations();
  const locale = useLocale();

  const pagination = usePagination(groupMembers, { pageSize: 10 });

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

  const groupRoleOptions = useMemo(
    () =>
      GROUP_ROLE_ORDER.map((role) => ({
        value: role,
        label: t(`dashboard.groups.members.roles.${role}`),
      })),
    [t]
  );

  const orgRoleLabels = useMemo(
    () =>
      ORG_ROLE_ORDER.reduce<Record<string, string>>((acc, role) => {
        acc[role] = t(`dashboard.groups.members.orgRoles.${role}`);
        return acc;
      }, {}),
    [t]
  );

  if (!selectedGroup) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        {t('dashboard.groups.members.noSelection')}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedGroup.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('dashboard.groups.members.header.description')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-10 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              value={memberForm.userId}
              onChange={(event) => memberForm.setUserId(event.target.value)}
              disabled={
                memberForm.saving ||
                orgMembersLoading ||
                availableOrgMembers.length === 0
              }
            >
              <option value="">{t('dashboard.groups.members.form.selectMember')}</option>
              {availableOrgMembers.length === 0 ? (
                <option value="" disabled>
                  {t('dashboard.groups.members.form.noAvailable')}
                </option>
              ) : null}
              {availableOrgMembers.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.fullName ?? member.userId.slice(0, 8)}
                  {member.role ? ` · ${t(`dashboard.groups.members.orgRoles.${member.role}`)}` : ''}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              value={memberForm.role}
              onChange={(event) => memberForm.setRole(event.target.value as GroupRole)}
              disabled={memberForm.saving}
            >
              {groupRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              onClick={memberForm.add}
              disabled={
                memberForm.saving ||
                !memberForm.userId ||
                availableOrgMembers.length === 0 ||
                orgMembersLoading
              }
            >
              {memberForm.saving
                ? t('dashboard.groups.members.form.submit.loading')
                : t('dashboard.groups.members.form.submit.label')}
            </button>
          </div>
        </div>
        {orgMembersError ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            {t('dashboard.groups.members.orgError', { error: orgMembersError })}
          </div>
        ) : null}
        {memberForm.error ? (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {memberForm.error}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
          <span>{t('dashboard.groups.members.table.title')}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('dashboard.groups.members.table.total', {
              count: numberFormatter.format(groupMembers.length),
            })}
          </span>
        </div>
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-2 text-left">
                {t('dashboard.groups.members.table.columns.member')}
              </th>
              <th className="px-4 py-2 text-left">
                {t('dashboard.groups.members.table.columns.orgRole')}
              </th>
              <th className="px-4 py-2 text-left">
                {t('dashboard.groups.members.table.columns.groupRole')}
              </th>
              <th className="px-4 py-2 text-left">
                {t('dashboard.groups.members.table.columns.joinedAt')}
              </th>
              <th className="px-4 py-2 text-right">
                {t('dashboard.groups.members.table.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {groupMembersLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {t('dashboard.groups.members.table.loading')}
                </td>
              </tr>
            ) : groupMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {t('dashboard.groups.members.table.empty')}
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map((member) => (
                <tr key={member.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName ?? member.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {member.userId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                    {member.orgRole
                      ? orgRoleLabels[member.orgRole] ?? member.orgRole
                      : t('dashboard.groups.members.table.orgRoleUnset')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                      value={member.role}
                      onChange={(event) =>
                        onUpdateMemberRole(member.id, event.target.value as GroupRole)
                      }
                    >
                      {groupRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {member.addedAt
                      ? dateFormatter.format(new Date(member.addedAt))
                      : t('common.notSet')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-md px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      onClick={() => onRemoveMember(member.id)}
                    >
                      {t('dashboard.groups.members.table.remove')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {groupMembersError ? (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {t('dashboard.groups.members.table.loadError', { error: groupMembersError })}
          </div>
        ) : null}
      </div>

      {groupMembers.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.setPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.setPageSize}
            label={t('dashboard.groups.members.table.paginationLabel')}
          />
        </div>
      ) : null}
    </section>
  );
}
