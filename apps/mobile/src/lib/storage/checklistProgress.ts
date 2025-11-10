import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TaskChecklistItem } from '../../types';

const KEY_PREFIX = 'ark:checklist:';

type ChecklistPayload = {
  updatedAt: string;
  items: TaskChecklistItem[];
};

const buildKey = (taskId: string) => `${KEY_PREFIX}${taskId}`;

export async function readChecklistProgress(
  taskId: string,
): Promise<TaskChecklistItem[] | null> {
  const raw = await AsyncStorage.getItem(buildKey(taskId));
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as ChecklistPayload;
    if (!Array.isArray(payload.items)) return null;
    return payload.items;
  } catch {
    return null;
  }
}

export async function writeChecklistProgress(
  taskId: string,
  items: TaskChecklistItem[],
): Promise<void> {
  const payload: ChecklistPayload = {
    updatedAt: new Date().toISOString(),
    items,
  };
  await AsyncStorage.setItem(buildKey(taskId), JSON.stringify(payload));
}

export async function resetChecklistProgress(taskId: string): Promise<void> {
  await AsyncStorage.removeItem(buildKey(taskId));
}
