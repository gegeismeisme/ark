'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CACHE_KEYS,
  buildCacheId,
  type CacheKey,
  type CacheRecord,
} from '@project-ark/shared';

const KEY_PREFIX = 'ark-cache:';

const buildStorageKey = (key: CacheKey, scopeId?: string | null) =>
  `${KEY_PREFIX}${buildCacheId(key, scopeId)}`;

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

export async function listCacheScopeIds(key: CacheKey): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prefix = `${KEY_PREFIX}${key}:`;
    return keys
      .filter((storageKey) => storageKey.startsWith(prefix))
      .map((storageKey) => storageKey.slice(prefix.length));
  } catch (error) {
    console.warn('[local-cache-mobile] list scopes failed', key, error);
    return [];
  }
}

export async function clearOrganizationSnapshots(scopeId: string): Promise<void> {
  await Promise.all(
    CACHE_KEYS.map((cacheKey) =>
      AsyncStorage.removeItem(buildStorageKey(cacheKey as CacheKey, scopeId)),
    ),
  );
}
