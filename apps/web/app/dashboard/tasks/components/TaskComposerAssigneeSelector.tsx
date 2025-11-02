'use client';

import { useMemo, useState } from 'react';

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
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    if (loading) return '正在加载成员...';
    if (totalMembers === 0) return '当前小组暂无成员';
    if (members.length === 0) return '筛选条件下暂无可选成员';
    if (selectedAssignees.length === 0) return `共有 ${members.length} 名可选成员`;
    return `已选择 ${selectedAssignees.length} / ${members.length} 名成员`;
  }, [loading, members.length, selectedAssignees.length, totalMembers]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">选择执行成员</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{summary}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onSelectAll}
            disabled={disabled || loading || members.length === 0}
          >
            全选
          </button>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onClear}
            disabled={disabled || selectedAssignees.length === 0}
          >
            清空
          </button>
          <button
            type="button"
            className="ml-2 inline-flex items-center rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          {loading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">正在加载成员...</p>
          ) : totalMembers === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              当前小组暂无成员，请先在“小组管理”中邀请或添加成员。
            </p>
          ) : members.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              当前筛选条件下没有符合要求的成员。
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
                        {member.role === 'admin'
                          ? ' · 管理员'
                          : member.role === 'publisher'
                          ? ' · 发布人'
                          : ''}
                      </span>
                    </div>
                    {member.orgRole ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        组织角色：{member.orgRole}
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
