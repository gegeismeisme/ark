'use client';

import { GroupMembersPanel } from './components/GroupMembersPanel';
import { GroupSidebar } from './components/GroupSidebar';
import { useGroupsDashboard } from './hooks/use-groups-dashboard';

export default function GroupsPage() {
  const {
    organizationsLoading,
    orgId,
    groups,
    orgMembers,
    groupMembers,
    memberForm,
    availableOrgMembers,
    selectedGroup,
  } = useGroupsDashboard();

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">小组管理</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织信息...
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">小组管理</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未选择组织，请在顶部导航中选择或创建组织后再管理小组。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">小组管理</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          通过小组维度拆分职责范围，实现精细的成员权限控制与通知分发。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <GroupSidebar
          groups={groups.list}
          loading={groups.loading}
          error={groups.error}
          selectedGroupId={groups.selectedId}
          onSelect={groups.select}
          newGroupName={groups.newGroupName}
          onNewGroupNameChange={groups.setNewGroupName}
          creatingGroup={groups.creating}
          onCreateGroup={groups.create}
          onRefresh={groups.refresh}
        />
        <GroupMembersPanel
          selectedGroup={selectedGroup}
          availableOrgMembers={availableOrgMembers}
          orgMembersLoading={orgMembers.loading}
          orgMembersError={orgMembers.error}
          groupMembers={groupMembers.list}
          groupMembersLoading={groupMembers.loading}
          groupMembersError={groupMembers.error}
          memberForm={memberForm}
          onUpdateMemberRole={groupMembers.updateRole}
          onRemoveMember={groupMembers.remove}
        />
      </div>
    </div>
  );
}
