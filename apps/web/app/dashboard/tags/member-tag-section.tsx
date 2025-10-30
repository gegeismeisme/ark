'use client';

import type { ChangeEvent } from 'react';

import type {
  Member,
  MemberTagState,
  SelectionType,
  TagCategory,
} from './use-tag-management';

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
  onMemberSingleChange: (memberId: string, category: TagCategory, event: ChangeEvent<HTMLSelectElement>) => void;
  onMemberMultiToggle: (
    memberId: string,
    category: TagCategory,
    tagId: string,
    event: ChangeEvent<HTMLInputElement>
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
  const canEditAnyCategory = isOrgAdmin || manageableCategoryIds.size > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">成员标签分布</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          了解每位成员当前拥有的标签。具备权限的管理员可直接在此调整标签，以便在任务指派时按标签进行筛选。
        </p>
      </div>

      {membersLoading || memberTagsLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载成员与标签数据...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          当前组织暂无成员。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-2">成员</th>
                {categories.map((category) => (
                  <th key={category.id} className="px-4 py-2">
                    <div className="flex flex-col">
                      <span>{category.name}</span>
                      <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                        {selectionTypeLabels[category.selectionType]}
                        {category.isRequired ? ' · 必选' : ''}
                        {category.groupName ? ` · ${category.groupName}` : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName ?? member.userId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{member.userId}</div>
                  </td>
                  {categories.map((category) => {
                    const assignedIds = memberTags[member.id]?.[category.id] ?? [];
                    const cellKey = `${member.id}:${category.id}`;
                    const busy = Boolean(memberTagUpdating[cellKey]);
                    const missingRequired = category.isRequired && assignedIds.length === 0;
                    const canManageCategory = manageableCategoryIds.has(category.id);

                    if (!canManageCategory) {
                      const names = memberTagNames[member.id]?.[category.id] ?? [];
                      return (
                        <td
                          key={category.id}
                          className={`px-4 py-3 align-top text-xs ${
                            missingRequired
                              ? 'text-amber-600 dark:text-amber-300'
                              : 'text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          {names.length ? names.join('、') : <span className="text-zinc-400">未设置</span>}
                        </td>
                      );
                    }

                    return (
                      <td key={category.id} className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-300">
                        {category.selectionType === 'single' ? (
                          <div className="space-y-2">
                            <select
                              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                              value={assignedIds[0] ?? ''}
                              onChange={(event) => onMemberSingleChange(member.id, category, event)}
                              disabled={busy || category.tags.length === 0}
                            >
                              <option value="">未设置</option>
                              {category.tags.map((tag) => (
                                <option
                                  key={tag.id}
                                  value={tag.id}
                                  disabled={!tag.isActive && assignedIds[0] !== tag.id}
                                >
                                  {tag.name}
                                  {!tag.isActive ? '（停用）' : ''}
                                </option>
                              ))}
                            </select>
                            {busy ? (
                              <div className="text-[11px] text-emerald-600">更新中…</div>
                            ) : missingRequired ? (
                              <div className="text-[11px] text-amber-600">此类别为必选，请选择标签。</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {category.tags.length === 0 ? (
                                <span className="text-zinc-400">暂无标签</span>
                              ) : (
                                category.tags.map((tag) => {
                                  const checked = assignedIds.includes(tag.id);
                                  const disabled = busy || (!tag.isActive && !checked);
                                  return (
                                    <label key={tag.id} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                                        checked={checked}
                                        onChange={(event) =>
                                          onMemberMultiToggle(member.id, category, tag.id, event)
                                        }
                                        disabled={disabled}
                                      />
                                      <span
                                        className={`${
                                          tag.isActive ? 'text-zinc-600 dark:text-zinc-200' : 'text-zinc-400'
                                        }`}
                                      >
                                        {tag.name}
                                        {!tag.isActive ? '（停用）' : ''}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              {missingRequired ? (
                                <span className="text-[11px] text-amber-600">此类别为必选，请至少选择一个标签。</span>
                              ) : (
                                <span className="text-[11px] text-zinc-400">可多选</span>
                              )}
                              <button
                                type="button"
                                className="text-[11px] font-medium text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:text-emerald-400"
                                onClick={() => onClearMemberTags(member.id, category)}
                                disabled={busy || assignedIds.length === 0}
                              >
                                清除
                              </button>
                            </div>
                            {busy ? <div className="text-[11px] text-emerald-600">更新中…</div> : null}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canEditAnyCategory ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          您当前仅有查看权限，无法直接编辑成员标签。如需调整，请联系组织管理员或所属小组管理员。
        </div>
      ) : null}
    </section>
  );
}
