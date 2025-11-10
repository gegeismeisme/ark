'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheKey =
  | 'orgGroups'
  | 'tagCategories'
  | 'orgMembers'
  | 'memberTags'
  | 'tagRequests'
  | 'memberDirectory'
  | 'memberInvites'
  | 'memberJoinRequests'
  | 'orgVisibility'
  | 'groupList'
  | 'groupOrgMembers'
  | 'groupMembers'
  | 'taskGroups'
  | 'taskTagCategories'
  | 'taskGroupMembers'
  | 'taskList'
  | 'taskAttachments'
  | 'taskAttachmentDrafts';

type CacheRecord<T = unknown> = {
  key: CacheKey;
  scopeId: string | null;
  data: T;
  updatedAt: number;
};

const KEY_PREFIX = 'ark-cache:';

const buildStorageKey = (key: CacheKey, scopeId?: string | null) =>
  `${KEY_PREFIX}${key}:${scopeId ?? 'global'}`;

export async function readCacheSnapshot<T>(
  key: CacheKey,
  scopeId?: string | null
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(buildStorageKey(key, scopeId));
    if (!raw) return null;
    const record = JSON.parse(raw) as CacheRecord<T>;
    return record.data ?? null;
  } catch (error) {
    console.warn('[local-cache-mobile] read failed', key, error);
    return null;
  }
}

export async function writeCacheSnapshot<T>(
  key: CacheKey,
  data: T,
  scopeId?: string | null
): Promise<void> {
  const record: CacheRecord<T> = {
    key,
    scopeId: scopeId ?? null,
    data,
    updatedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(
      buildStorageKey(key, scopeId),
      JSON.stringify(record)
    );
  } catch (error) {
    console.warn('[local-cache-mobile] write failed', key, error);
  }
}

export async function clearOrganizationSnapshots(scopeId: string): Promise<void> {
  const keys: CacheKey[] = [
    'orgGroups',
    'tagCategories',
    'orgMembers',
    'memberTags',
    'tagRequests',
    'memberDirectory',
    'memberInvites',
    'memberJoinRequests',
    'orgVisibility',
    'groupList',
    'groupOrgMembers',
    'groupMembers',
    'taskGroups',
    'taskTagCategories',
    'taskGroupMembers',
    'taskList',
    'taskAttachments',
    'taskAttachmentDrafts',
  ];

  await Promise.all(
    keys.map((cacheKey) => AsyncStorage.removeItem(buildStorageKey(cacheKey, scopeId)))
  );
}
