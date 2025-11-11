'use client';

import Dexie, { type Table } from 'dexie';

import {
  CACHE_KEYS,
  buildCacheId,
  type CacheKey,
  type CacheRecord,
} from '@project-ark/shared';

type SnapshotRecord<T = unknown> = CacheRecord<T> & { id: string };
type LegacySnapshotRecord<T = unknown> = SnapshotRecord<T> & { orgId?: string | null };

class ArkLocalCache extends Dexie {
  public snapshots!: Table<SnapshotRecord>;

  constructor() {
    super('ark-local-cache');
    this.version(1).stores({
      snapshots: '&id,key,orgId,updatedAt',
    });
    this.version(2)
      .stores({
        snapshots: '&id,key,scopeId,updatedAt',
      })
      .upgrade(async (tx) => {
        const table = tx.table<LegacySnapshotRecord>('snapshots');
        await table.toCollection().modify((record) => {
          if (typeof record.scopeId === 'undefined') {
            record.scopeId = record.orgId ?? null;
          }
          if (record.orgId !== undefined) {
            delete record.orgId;
          }
        });
      });
  }
}

const db = new ArkLocalCache();

export async function readCacheSnapshot<T>(
  key: CacheKey,
  scopeId?: string | null,
): Promise<T | null> {
  try {
    const record = await db.snapshots.get(buildCacheId(key, scopeId));
    return record ? (record.data as T) : null;
  } catch (error) {
    console.warn('[local-cache] read failed', key, error);
    return null;
  }
}

export async function writeCacheSnapshot<T>(key: CacheKey, data: T, scopeId?: string | null) {
  try {
    await db.snapshots.put({
      id: buildCacheId(key, scopeId),
      key,
      scopeId: scopeId ?? null,
      data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[local-cache] write failed', key, error);
  }
}

export async function clearOrganizationSnapshots(scopeId: string) {
  await Promise.all(CACHE_KEYS.map((key) => db.snapshots.delete(buildCacheId(key, scopeId))));
}
