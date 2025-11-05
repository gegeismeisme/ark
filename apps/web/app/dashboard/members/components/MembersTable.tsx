"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "@/lib/i18n/client";

import { PaginationControls, usePagination } from "../../components/pagination";
import { ROLE_LABEL_KEYS, STATUS_LABEL_KEYS } from "../constants";
import type { MemberRow, MemberStatus, OrgRole } from "../types";

type MembersTableProps = {
  members: MemberRow[];
  membersLoading: boolean;
  membersError: string | null;
  actionError: string | null;
  updatingId: string | null;
  isAdmin: boolean;
  formatDateTime: (value: string | null) => string;
  disableRoleChange: (member: MemberRow) => boolean;
  disableStatusChange: (member: MemberRow) => boolean;
  onRoleChange: (member: MemberRow, nextRole: OrgRole) => void;
  onStatusChange: (member: MemberRow, nextStatus: MemberStatus) => void;
  onRemoveMember: (member: MemberRow) => void;
  pageSize?: number;
};

export function MembersTable({
  members,
  membersLoading,
  membersError,
  actionError,
  updatingId,
  isAdmin,
  formatDateTime,
  disableRoleChange,
  disableStatusChange,
  onRoleChange,
  onStatusChange,
  onRemoveMember,
  pageSize = 10,
}: MembersTableProps) {
  const t = useTranslations();
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return members;
    const keyword = query.trim().toLowerCase();
    return members.filter((member) => {
      const name = (member.fullName ?? "").toLowerCase();
      return name.includes(keyword) || member.userId.toLowerCase().includes(keyword);
    });
  }, [members, query]);

  const pagination = usePagination(filteredMembers, { pageSize });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t("dashboard.members.table.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("dashboard.members.table.description")}
          </p>
        </div>
        <input
          className="h-9 w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
          placeholder={t("dashboard.members.table.searchPlaceholder")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            pagination.setPage(1);
          }}
        />
      </div>

      {membersLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t("dashboard.members.table.loading")}
        </div>
      ) : null}

      {membersError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {membersError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {actionError}
        </div>
      ) : null}

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t("dashboard.members.table.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">
                  {t("dashboard.members.table.columns.profile")}
                </th>
                <th className="px-4 py-3 text-left">
                  {t("dashboard.members.table.columns.role")}
                </th>
                <th className="px-4 py-3 text-left">
                  {t("dashboard.members.table.columns.status")}
                </th>
                <th className="px-4 py-3 text-left">
                  {t("dashboard.members.table.columns.joinedAt")}
                </th>
                {isAdmin ? (
                  <th className="px-4 py-3 text-right">
                    {t("dashboard.members.table.columns.actions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700 dark:divide-zinc-800 dark:text-zinc-200">
              {pagination.paginatedItems.map((member) => {
                const disabledRole = disableRoleChange(member);
                const disabledStatus = disableStatusChange(member);
                const isProcessing = updatingId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {member.fullName ?? t("dashboard.members.table.noName")}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t("dashboard.members.table.userId", { id: member.userId })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <select
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
                          value={member.role}
                          onChange={(event) => onRoleChange(member, event.target.value as OrgRole)}
                          disabled={!isAdmin || disabledRole || isProcessing}
                        >
                          {(Object.entries(ROLE_LABEL_KEYS) as Array<[OrgRole, string]>).map(
                            ([value, labelKey]) => (
                              <option key={value} value={value}>
                                {t(labelKey)}
                              </option>
                            ),
                          )}
                        </select>
                        {!isAdmin || disabledRole ? (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {t(ROLE_LABEL_KEYS[member.role])}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <select
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
                          value={member.status}
                          onChange={(event) =>
                            onStatusChange(member, event.target.value as MemberStatus)
                          }
                          disabled={!isAdmin || disabledStatus || isProcessing}
                        >
                          {(Object.entries(STATUS_LABEL_KEYS) as Array<[MemberStatus, string]>).map(
                            ([value, labelKey]) => (
                              <option key={value} value={value}>
                                {t(labelKey)}
                              </option>
                            ),
                          )}
                        </select>
                        {!isAdmin || disabledStatus ? (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {t(STATUS_LABEL_KEYS[member.status])}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(member.joinedAt)}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                          onClick={() => onRemoveMember(member)}
                          disabled={isProcessing}
                        >
                          {isProcessing
                            ? t("dashboard.members.table.removing")
                            : t("dashboard.members.table.remove")}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="px-4 py-3">
            <PaginationControls
              page={pagination.page}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setPage}
              pageSize={pagination.pageSize}
              onPageSizeChange={pagination.setPageSize}
              label={t("dashboard.members.table.paginationLabel")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
