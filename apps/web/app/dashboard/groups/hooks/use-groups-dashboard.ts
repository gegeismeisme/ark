'use client';

import { useTranslations } from '@/lib/i18n/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PostgrestError } from '@supabase/supabase-js';

import { readCacheSnapshot, writeCacheSnapshot } from '@/lib/cache/local-db';
import { supabase } from '../../../../lib/supabaseClient';
import { useOrgContext } from '../../org-provider';

export type GroupRole = 'member' | 'publisher' | 'admin';
export type OrgRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export type Group = {
  id: string;
  name: string;
  createdAt: string;
};

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
};

export type OrgMember = {
  id: string;
  userId: string;
  role: OrgRole;
  status: MemberStatus;
  fullName: string | null;
};

type OrgMemberDetailRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  status: MemberStatus;
  full_name: string | null;
};



export type GroupMember = {
  id: string;
  userId: string;
  role: GroupRole;
  status: MemberStatus;
  addedAt: string | null;
  fullName: string | null;
  orgRole: OrgRole | null;
};

type GroupMemberDetailRow = {
  id: string;
  group_id: string;
  organization_id: string;
  user_id: string;
  role: GroupRole;
  status: MemberStatus;
  added_at: string | null;
  full_name: string | null;
  organization_role: OrgRole | null;
};

export function useGroupsDashboard() {
  const t = useTranslations();
  const { activeOrg, user, organizationsLoading } = useOrgContext();

  const orgId = activeOrg?.id ?? null;
  const orgIdRef = useRef<string | null>(orgId);

  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  const resolveMemberActionError = useCallback(
    (error: PostgrestError | null) => {
      if (!error) {
        return t('dashboard.groups.errors.memberAction');
      }
      switch (error.code) {
        case '23505':
          return t('dashboard.groups.errors.memberExists');
        case '42501':
          return t('dashboard.groups.errors.notAuthorized');
        default:
          return error.message ?? t('dashboard.groups.errors.memberAction');
      }
    },
    [t]
  );



  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [orgMembersLoading, setOrgMembersLoading] = useState(false);
  const [orgMembersError, setOrgMembersError] = useState<string | null>(null);

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [memberFormUserId, setMemberFormUserId] = useState('');
  const [memberFormRole, setMemberFormRole] = useState<GroupRole>('member');
  const [savingMember, setSavingMember] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);

  const ensureSelectedGroup = useCallback((nextGroups: Group[]) => {
    setSelectedGroupId((previous) => {
      if (previous && nextGroups.some((group) => group.id === previous)) {
        return previous;
      }
      return nextGroups[0]?.id ?? null;
    });
  }, []);

  const refreshGroups = useCallback(async () => {
    if (!orgId) {
      setGroups([]);
      setSelectedGroupId(null);
      return;
    }

    setGroupsLoading(true);
    setGroupsError(null);

    const targetOrgId = orgId;
    void readCacheSnapshot<Group[]>('groupList', targetOrgId).then((cached) => {
      if (cached && orgIdRef.current === targetOrgId) {
        setGroups(cached);
        ensureSelectedGroup(cached);
      }
    });

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (orgIdRef.current !== targetOrgId) {
      return;
    }

    if (error) {
      setGroups([]);
      setSelectedGroupId(null);
      setGroupsError(error.message);
      setGroupsLoading(false);
      return;
    }

    const mapped = ((data ?? []) as GroupRow[]).map(({ id, name, created_at }) => ({
      id,
      name,
      createdAt: created_at,
    }));

    setGroups(mapped);
    setGroupsLoading(false);
    ensureSelectedGroup(mapped);
    void writeCacheSnapshot('groupList', mapped, targetOrgId);
  }, [ensureSelectedGroup, orgId]);

  const refreshOrgMembers = useCallback(async () => {
    if (!orgId) {
      setOrgMembers([]);
      return;
    }

    setOrgMembersLoading(true);
    setOrgMembersError(null);

    const targetOrgId = orgId;
    void readCacheSnapshot<OrgMember[]>('groupOrgMembers', targetOrgId).then((cached) => {
      if (cached && orgIdRef.current === targetOrgId) {
        setOrgMembers(cached);
      }
    });

    const { data, error } = await supabase
      .from('organization_member_details')
      .select('id, organization_id, user_id, role, status, full_name')
      .eq('organization_id', orgId)
      .order('full_name', { ascending: true });

    if (orgIdRef.current !== targetOrgId) {
      return;
    }

    if (error) {
      setOrgMembers([]);
      setOrgMembersError(error.message);
      setOrgMembersLoading(false);
      return;
    }

    const mapped = ((data ?? []) as OrgMemberDetailRow[]).map(
      ({ id, user_id, role, status, full_name }) => ({
        id,
        userId: user_id,
        role,
        status,
        fullName: full_name,
      }),
    );

    setOrgMembers(mapped);
    setOrgMembersLoading(false);
    void writeCacheSnapshot('groupOrgMembers', mapped, targetOrgId);
  }, [orgId]);

  const refreshGroupMembers = useCallback(
    async (groupId: string | null = selectedGroupId) => {
      if (!groupId || !orgId) {
        setGroupMembers([]);
        return;
      }

      setGroupMembersLoading(true);
      setGroupMembersError(null);

      const targetOrgId = orgId;
      void readCacheSnapshot<Record<string, GroupMember[]>>('groupMembers', targetOrgId).then(
        (cached) => {
          const cachedList = cached?.[groupId];
          if (cachedList && orgIdRef.current === targetOrgId) {
            setGroupMembers(cachedList);
          }
        },
      );

      const { data, error } = await supabase
        .from('group_member_details')
        .select(
          'id, group_id, organization_id, user_id, role, status, added_at, full_name, organization_role',
        )
        .eq('group_id', groupId)
        .order('added_at', { ascending: true });

      if (orgIdRef.current !== targetOrgId) {
        return;
      }

      if (error) {
        setGroupMembers([]);
        setGroupMembersError(error.message);
        setGroupMembersLoading(false);
        return;
      }

      const mapped = ((data ?? []) as GroupMemberDetailRow[]).map(
        ({ id, user_id, role, status, added_at, full_name, organization_role }) => ({
          id,
          userId: user_id,
          role,
          status,
          addedAt: added_at,
          fullName: full_name,
          orgRole: organization_role,
        }),
      );

      setGroupMembers(mapped);
      setGroupMembersLoading(false);
      void (async () => {
        const existing =
          (await readCacheSnapshot<Record<string, GroupMember[]>>('groupMembers', targetOrgId)) ??
          {};
        existing[groupId] = mapped;
        await writeCacheSnapshot('groupMembers', existing, targetOrgId);
      })();
    },
    [orgId, selectedGroupId],
  );

  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  useEffect(() => {
    void refreshOrgMembers();
  }, [refreshOrgMembers]);

  useEffect(() => {
    void refreshGroupMembers(selectedGroupId);
  }, [refreshGroupMembers, selectedGroupId]);

  useEffect(() => {
    setMemberFormUserId('');
    setMemberFormRole('member');
    setMemberActionError(null);
  }, [selectedGroupId]);

  const orgMemberMap = useMemo(() => {
    const map = new Map<string, OrgMember>();
    orgMembers.forEach((member) => {
      map.set(member.userId, member);
    });
    return map;
  }, [orgMembers]);

  const availableOrgMembers = useMemo(() => {
    const existingIds = new Set(groupMembers.map((member) => member.userId));
    return orgMembers.filter((member) => !existingIds.has(member.userId));
  }, [groupMembers, orgMembers]);

  const handleCreateGroup = useCallback(async () => {
    if (!orgId || !user || !newGroupName.trim()) return;

    setCreatingGroup(true);
    setGroupsError(null);

    const { data, error } = await supabase
      .from('groups')
      .insert({
        organization_id: orgId,
        name: newGroupName.trim(),
        created_by: user.id,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      setGroupsError(error.message);
      setCreatingGroup(false);
      return;
    }

    const createdId = data?.id ?? null;
    setNewGroupName('');
    setCreatingGroup(false);
    await refreshGroups();
    if (createdId) {
      setSelectedGroupId(createdId);
      await refreshGroupMembers(createdId);
    }
  }, [newGroupName, orgId, refreshGroupMembers, refreshGroups, user]);

  const handleAddMember = useCallback(async () => {
    if (!selectedGroupId || !user || !memberFormUserId) return;

    setSavingMember(true);
    setMemberActionError(null);

    const existingMember = groupMembers.find((member) => member.userId === memberFormUserId);
    if (existingMember) {
      const { error } = await supabase
        .from('group_members')
        .update({
          role: memberFormRole,
          status: 'active',
          removed_at: null,
        })
        .eq('id', existingMember.id);

      if (error) {
        setMemberActionError(resolveMemberActionError(error));
        setSavingMember(false);
        return;
      }
    } else {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroupId,
        user_id: memberFormUserId,
        role: memberFormRole,
        status: 'active',
        added_by: user.id,
      });

      if (error) {
        setMemberActionError(resolveMemberActionError(error));
        setSavingMember(false);
        return;
      }
    }

    await refreshGroupMembers(selectedGroupId);
    setSavingMember(false);

    const nextMember = availableOrgMembers.find(
      (member) => member.userId !== memberFormUserId,
    );
    setMemberFormUserId(nextMember?.userId ?? '');
  }, [
    availableOrgMembers,
    groupMembers,
    memberFormRole,
    memberFormUserId,
    refreshGroupMembers,
    resolveMemberActionError,
    selectedGroupId,
    user,
  ]);

  const handleUpdateMemberRole = useCallback(
    async (groupMemberId: string, nextRole: GroupRole) => {
      const current = groupMembers.find((member) => member.id === groupMemberId);
      if (!current || current.role === nextRole) return;

      const { error } = await supabase
        .from('group_members')
        .update({ role: nextRole })
        .eq('id', groupMemberId);

      if (error) {
        setMemberActionError(resolveMemberActionError(error));
        return;
      }

      setGroupMembers((prev) =>
        prev.map((member) =>
          member.id === groupMemberId ? { ...member, role: nextRole } : member,
        ),
      );
    },
    [groupMembers, resolveMemberActionError],
  );

  const handleRemoveMember = useCallback(
    async (groupMemberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
        })
        .eq('id', groupMemberId);

      if (error) {
        setMemberActionError(error.message ?? t('dashboard.groups.errors.memberAction'));
        return;
      }

      setGroupMembers((prev) => prev.filter((member) => member.id !== groupMemberId));
    },
    [t],
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const activeOrgRole = activeOrg?.role ?? null;

  return {
    organizationsLoading,
    activeOrgRole,
    orgId,
    user,
    groups: {
      list: groups,
      loading: groupsLoading,
      error: groupsError,
      selectedId: selectedGroupId,
      select: setSelectedGroupId,
      creating: creatingGroup,
      newGroupName,
      setNewGroupName,
      create: handleCreateGroup,
      refresh: refreshGroups,
    },
    orgMembers: {
      list: orgMembers,
      loading: orgMembersLoading,
      error: orgMembersError,
      map: orgMemberMap,
    },
    groupMembers: {
      list: groupMembers,
      loading: groupMembersLoading,
      error: groupMembersError,
      refresh: refreshGroupMembers,
      updateRole: handleUpdateMemberRole,
      remove: handleRemoveMember,
    },
    memberForm: {
      userId: memberFormUserId,
      setUserId: setMemberFormUserId,
      role: memberFormRole,
      setRole: setMemberFormRole,
      saving: savingMember,
      error: memberActionError,
      add: handleAddMember,
    },
    availableOrgMembers,
    selectedGroup,
  };
}
