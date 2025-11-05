'use client';

import { useTranslations } from '@/lib/i18n/client';

import { GroupMembersPanel } from './components/GroupMembersPanel';
import { GroupSidebar } from './components/GroupSidebar';
import { useGroupsDashboard } from './hooks/use-groups-dashboard';

export default function GroupsPage() {
  const t = useTranslations();
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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.groups.title')}
        </h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.groups.loading')}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.groups.title')}
        </h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {t('dashboard.groups.noOrg')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.groups.title')}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('dashboard.groups.subtitle')}
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
