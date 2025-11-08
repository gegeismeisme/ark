'use client';

import Dexie, { type Table } from 'dexie';

type CacheKey = 'orgGroups' | 'tagCategories' | 'orgMembers' | 'memberTags' | 'tagRequests';

type CacheRecord<T = unknown> = {
  id: string;
  key: CacheKey;
  orgId: string | null;
  data: T;
  updatedAt: number;
};

class ArkLocalCache extends Dexie {
  public snapshots!: Table<CacheRecord>;

  constructor() {
    super('ark-local-cache');
    this.version(1).stores({
      snapshots: '&id,key,orgId,updatedAt',
    });
  }
}

const db = new ArkLocalCache();

const buildId = (key: CacheKey, orgId?: string | null) => `${key}:${orgId ?? 'global'}`;

export async function readCacheSnapshot<T>(key: CacheKey, orgId?: string | null): Promise<T | null> {
  try {
    const record = await db.snapshots.get(buildId(key, orgId));
    return record ? (record.data as T) : null;
  } catch (error) {
    console.warn('[local-cache] read failed', key, error);
    return null;
  }
}

export async function writeCacheSnapshot<T>(key: CacheKey, data: T, orgId?: string | null) {
  try {
    await db.snapshots.put({
      id: buildId(key, orgId),
      key,
      orgId: orgId ?? null,
      data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[local-cache] write failed', key, error);
  }
}

export async function clearOrganizationSnapshots(orgId: string) {
  const keys: CacheKey[] = ['orgGroups', 'tagCategories', 'orgMembers', 'memberTags', 'tagRequests'];
  await Promise.all(keys.map((key) => db.snapshots.delete(buildId(key, orgId))));
}

