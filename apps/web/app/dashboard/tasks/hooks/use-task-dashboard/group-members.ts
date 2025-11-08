'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readCacheSnapshot, writeCacheSnapshot } from '@/lib/cache/local-db';
import type { GroupMember, GroupMemberDetailRow, MemberTagIndex } from '../../types';

type UseGroupMembersArgs = {
  supabase: SupabaseClient;
  orgId: string | null;
  selectedGroupId: string | null;
};

type UseGroupMembersResult = {
  list: GroupMember[];
  loading: boolean;
  error: string | null;
  memberTagIndex: MemberTagIndex;
  refresh: (groupId?: string | null) => Promise<void>;
};

export function useGroupMembersState({
  supabase,
  orgId,
  selectedGroupId,
}: UseGroupMembersArgs): UseGroupMembersResult {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberTagIndex, setMemberTagIndex] = useState<MemberTagIndex>(new Map());
  const orgRef = useRef<string | null>(orgId);
  const groupRef = useRef<string | null>(selectedGroupId);

  useEffect(() => {
    orgRef.current = orgId;
  }, [orgId]);

  useEffect(() => {
    groupRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const refresh = useCallback(
    async (groupIdParam?: string | null) => {
      const groupId = groupIdParam ?? selectedGroupId;

      if (!groupId || !orgId) {
        setMembers([]);
        setMemberTagIndex(new Map());
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const targetOrgId = orgId;
      void readCacheSnapshot<Record<string, GroupMember[]>>('taskGroupMembers', targetOrgId).then(
        (cached) => {
          const cachedList = cached?.[groupId];
          if (cachedList && orgRef.current === targetOrgId && groupRef.current === groupId) {
            setMembers(cachedList);
          }
        },
      );

      const { data, error: queryError } = await supabase
        .from('group_member_details')
        .select(
          'id, group_id, organization_id, user_id, role, status, added_at, full_name, organization_role',
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('removed_at', null)
        .order('role', { ascending: false })
        .order('added_at', { ascending: true });

      if (orgRef.current !== targetOrgId || groupRef.current !== groupId) {
        return;
      }

      if (queryError) {
        setMembers([]);
        setMemberTagIndex(new Map());
        setLoading(false);
        setError(queryError.message);
        return;
      }

      const rows = (data ?? []) as GroupMemberDetailRow[];
      const mapped: GroupMember[] = rows.map(
        ({ id, user_id, role, status, added_at, full_name, organization_role }) => ({
          id,
          userId: user_id,
          role,
          status,
          fullName: full_name ?? null,
          orgRole: organization_role,
          addedAt: added_at,
        }),
      );

      setMembers(mapped);
      setLoading(false);

      if (mapped.length === 0) {
        setMemberTagIndex(new Map());
      } else {
        const userIds = mapped.map((member) => member.userId);
        const { data: membershipRows, error: membershipError } = await supabase
          .from('organization_member_details')
          .select('id, user_id')
          .eq('organization_id', orgId)
          .in('user_id', userIds);

        if (membershipError) {
          console.error('[tasks] fetch membership ids error:', membershipError);
          setMemberTagIndex(new Map());
        } else {
          const membershipReverse = new Map<string, string>();
          (membershipRows ?? []).forEach((row) => {
            const userIdValue = row.user_id as string;
            const membershipId = row.id as string;
            membershipReverse.set(membershipId, userIdValue);
          });

          const membershipIds = Array.from(membershipReverse.keys());
          if (!membershipIds.length) {
            setMemberTagIndex(new Map());
          } else {
            const { data: memberTagsRows, error: tagsError } = await supabase
              .from('member_tags')
              .select('member_id, tag_id')
              .in('member_id', membershipIds)
              .eq('organization_id', orgId);

            if (tagsError) {
              console.error('[tasks] fetch member tags error:', tagsError);
              setMemberTagIndex(new Map());
            } else {
              const index: MemberTagIndex = new Map();
              (memberTagsRows ?? []).forEach((row) => {
                const membershipId = row.member_id as string;
                const tagId = row.tag_id as string;
                const userIdForMember = membershipReverse.get(membershipId);
                if (!userIdForMember) return;
                if (!index.has(userIdForMember)) {
                  index.set(userIdForMember, new Set());
                }
                index.get(userIdForMember)!.add(tagId);
              });

              setMemberTagIndex(index);
            }
          }
        }
      }

      void (async () => {
        const existing =
          (await readCacheSnapshot<Record<string, GroupMember[]>>('taskGroupMembers', targetOrgId)) ??
          {};
        existing[groupId] = mapped;
        await writeCacheSnapshot('taskGroupMembers', existing, targetOrgId);
      })();
    },
    [orgId, selectedGroupId, supabase],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    list: members,
    loading,
    error,
    memberTagIndex,
    refresh,
  };
}
