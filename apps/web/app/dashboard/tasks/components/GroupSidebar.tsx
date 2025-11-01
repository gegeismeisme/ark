'use client';

import type { AdminGroup } from '../types';

type GroupSidebarProps = {
  groups: AdminGroup[];
  loading: boolean;
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
};

export function GroupSidebar({ groups, loading, selectedGroupId, onSelect }: GroupSidebarProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">我管理的小组</h2>
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            正在加载小组...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            当前账号尚未成为任何小组的管理员，请联系组织管理员授权。
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                group.id === selectedGroupId
                  ? 'border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-200 dark:bg-zinc-100/10 dark:text-zinc-100'
                  : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
              }`}
              onClick={() => onSelect(group.id)}
            >
              <div className="font-medium">{group.name}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
