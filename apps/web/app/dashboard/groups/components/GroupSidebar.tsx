'use client';

import type { Group } from '../hooks/use-groups-dashboard';

type GroupSidebarProps = {
  groups: Group[];
  loading: boolean;
  error: string | null;
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
  newGroupName: string;
  onNewGroupNameChange: (value: string) => void;
  creatingGroup: boolean;
  onCreateGroup: () => void;
  onRefresh: () => void;
};

export function GroupSidebar({
  groups,
  loading,
  error,
  selectedGroupId,
  onSelect,
  newGroupName,
  onNewGroupNameChange,
  creatingGroup,
  onCreateGroup,
  onRefresh,
}: GroupSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">新建小组</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          为组织拆分业务单元，支持精细化的成员权限控制。
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            placeholder="输入小组名称，如：教学组 / 第三市场组"
            value={newGroupName}
            onChange={(event) => onNewGroupNameChange(event.target.value)}
            disabled={creatingGroup}
          />
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            onClick={onCreateGroup}
            disabled={creatingGroup || !newGroupName.trim()}
          >
            {creatingGroup ? '创建中...' : '创建小组'}
          </button>
        </div>
        <button
          type="button"
          className="mt-3 text-xs text-zinc-500 underline transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新列表'}
        </button>
        {error ? (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
          小组列表
        </div>
        {loading ? (
          <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">正在加载小组...</div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            暂无小组。请先创建一支小组以便管理成员。
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {groups.map((group) => {
              const isActive = group.id === selectedGroupId;
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(group.id)}
                    className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <span className="font-medium">{group.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      创建于 {new Date(group.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
