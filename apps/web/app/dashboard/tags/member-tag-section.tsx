'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import type {
  Member,
  MemberTagState,
  SelectionType,
  TagCategory,
} from './use-tag-management';
import { useTranslations } from '@/lib/i18n/client';

type MemberTagSectionProps = {
  isOrgAdmin: boolean;
  manageableCategoryIds: Set<string>;
  categories: TagCategory[];
  members: Member[];
  membersLoading: boolean;
  memberTags: MemberTagState;
  memberTagNames: Record<string, Record<string, string[]>>;
  memberTagsLoading: boolean;
  memberTagUpdating: Record<string, boolean>;
  selectionTypeLabels: Record<SelectionType, string>;
  onMemberSingleChange: (
    memberId: string,
    category: TagCategory,
    event: ChangeEvent<HTMLSelectElement>,
  ) => void;
  onMemberMultiToggle: (
    memberId: string,
    category: TagCategory,
    tagId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onClearMemberTags: (memberId: string, category: TagCategory) => void;
};

export function MemberTagSection({
  isOrgAdmin,
  manageableCategoryIds,
  categories,
  members,
  membersLoading,
  memberTags,
  memberTagNames,
  memberTagsLoading,
  memberTagUpdating,
  selectionTypeLabels,
  onMemberSingleChange,
  onMemberMultiToggle,
  onClearMemberTags,
}: MemberTagSectionProps) {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const t = useTranslations();

  const canEditAnyCategory = isOrgAdmin || manageableCategoryIds.size > 0;

  const memberSummaries = useMemo(() => {
    return members.map((member) => {
      const assigned = memberTags[member.id] ?? {};
      const hasMissingRequired = categories.some(
        (category) => category.isRequired && (assigned[category.id]?.length ?? 0) === 0,
      );
      const displayNames: string[] = [];
      categories.forEach((category) => {
        const names = memberTagNames[member.id]?.[category.id] ?? [];
        names.forEach((name) => displayNames.push(`${category.name}：${name}`));
      });
      return { member, hasMissingRequired, displayNames };
    });
  }, [categories, memberTagNames, memberTags, members]);

  const activeMember = useMemo(
    () => memberSummaries.find(({ member }) => member.id === activeMemberId) ?? null,
    [memberSummaries, activeMemberId],
  );

  const activeAssignments = activeMember
    ? memberTags[activeMember.member.id] ?? {}
    : {};

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.tags.member.sectionTitle')}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t('dashboard.tags.member.sectionSubtitle')}
        </p>
      </header>

      {membersLoading || memberTagsLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.tags.member.loading')}
        </div>
      ) : memberSummaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.tags.member.empty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {memberSummaries.map(({ member, hasMissingRequired, displayNames }) => (
              <li
                key={member.id}
                className="flex cursor-pointer flex-col gap-2 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                onClick={() => setActiveMemberId(member.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName ?? member.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{member.userId}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      hasMissingRequired
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200'
                    }`}
                  >
                    {hasMissingRequired
                      ? t('dashboard.tags.member.status.missing')
                      : t('dashboard.tags.member.status.complete')}
                  </span>
                </div>
                {displayNames.length > 0 ? (
                  <div className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {displayNames.join('；')}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400">
                    {t('dashboard.tags.member.assign.none')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canEditAnyCategory ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          {t('dashboard.tags.readonlyBanner')}
        </div>
      ) : null}

      {activeMember ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="relative w-full max-w-4xl space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeMember.member.fullName ?? activeMember.member.userId}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t('dashboard.tags.member.modalSubtitle')}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  activeMember.hasMissingRequired
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200'
                }`}
              >
                {activeMember.hasMissingRequired ? t('dashboard.tags.member.status.missing') : t('dashboard.tags.member.status.complete')}
              </span>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              {categories.map((category) => {
                const assignedIds = activeAssignments[category.id] ?? [];
                const cellKey = `${activeMember.member.id}:${category.id}`;
                const busy = Boolean(memberTagUpdating[cellKey]);
                const names = memberTagNames[activeMember.member.id]?.[category.id] ?? [];
                const missingRequired = category.isRequired && assignedIds.length === 0;
                const canManageCategory = manageableCategoryIds.has(category.id);

                return (
                  <div
                    key={category.id}
                    className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {category.name}
                          </h4>
                          {category.isRequired ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200">
                              {t('dashboard.tags.member.badge.required')}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {selectionTypeLabels[category.selectionType]}
                          </span>
                          {category.groupName ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {category.groupName}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {category.selectionType === 'single'
                            ? t('dashboard.tags.member.selection.singleHint')
                            : t('dashboard.tags.member.selection.multipleHint')}
                        </p>
                      </div>
                      {missingRequired ? (
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-300">
                          {t('dashboard.tags.member.assign.missing')}
                        </span>
                      ) : null}
                    </div>

                    {canManageCategory ? (
                      <div className="mt-3 space-y-3">
                        {category.selectionType === 'single' ? (
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                            {t('dashboard.tags.member.selectLabel')}
                            <select
                              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                              value={assignedIds[0] ?? ''}
                              onChange={(event) =>
                                onMemberSingleChange(activeMember.member.id, category, event)
                              }
                              disabled={busy}
                            >
                              <option value="">{t('dashboard.tags.member.selectPlaceholder')}</option>
                              {category.tags.map((tag) => (
                                <option
                                  key={tag.id}
                                  value={tag.id}
                                  disabled={!tag.isActive && assignedIds[0] !== tag.id}
                                >
                                  {tag.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {category.tags.length === 0 ? (
                                <span className="text-xs text-zinc-400">{t('dashboard.tags.member.assign.none')}</span>
                              ) : (
                                category.tags.map((tag) => {
                                  const checked = assignedIds.includes(tag.id);
                                  const disabled = busy || (!tag.isActive && !checked);
                                  return (
                                    <label
                                      key={tag.id}
                                      className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-200"
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                                        checked={checked}
                                        onChange={(event) =>
                                          onMemberMultiToggle(
                                            activeMember.member.id,
                                            category,
                                            tag.id,
                                            event,
                                          )
                                        }
                                        disabled={disabled}
                                      />
                                      <span
                                        className={
                                          tag.isActive
                                            ? undefined
                                            : 'text-zinc-400 dark:text-zinc-500'
                                        }
                                      >
                                        {tag.name}
                                        {!tag.isActive ? ` ${t('dashboard.tags.member.assign.inactive')}` : ''}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              {missingRequired ? (
                                <span className="text-red-600 dark:text-red-300">
                                  {t('dashboard.tags.member.assign.requiredHint')}
                                </span>
                              ) : (
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  {t('dashboard.tags.member.assign.tip')}
                                </span>
                              )}
                              <button
                                type="button"
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                                onClick={() => onClearMemberTags(activeMember.member.id, category)}
                                disabled={busy || assignedIds.length === 0}
                              >
                                {t('dashboard.tags.member.clear')}
                              </button>
                            </div>
                          </div>
                        )}
                        {busy ? (
                          <div className="text-xs text-emerald-600 dark:text-emerald-300">{t('dashboard.tags.member.updating')}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        {names.length ? names.join(', ') : t('dashboard.tags.member.assign.none')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                onClick={() => setActiveMemberId(null)}
              >
                {t('dashboard.tags.member.modalClose')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
