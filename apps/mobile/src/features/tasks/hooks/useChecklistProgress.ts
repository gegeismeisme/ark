'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createChecklistItem,
  mergeChecklistProgress,
  type TaskChecklistItem,
} from '@project-ark/shared';

import { t } from '../../../i18n';
import {
  readChecklistProgress,
  resetChecklistProgress,
  writeChecklistProgress,
} from '../../../lib/storage/checklistProgress';

type UseChecklistProgressOptions = {
  taskId: string | null | undefined;
  baseItems: TaskChecklistItem[];
};

export function useChecklistProgress({ taskId, baseItems }: UseChecklistProgressOptions) {
  const [items, setItems] = useState<TaskChecklistItem[]>(baseItems);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems((prev) => mergeChecklistProgress(baseItems, prev));
  }, [baseItems]);

  useEffect(() => {
    if (!taskId) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void readChecklistProgress(taskId)
      .then((stored) => {
        if (cancelled) return;
        if (stored?.length) {
          setItems(mergeChecklistProgress(baseItems, stored));
        } else {
          setItems(baseItems);
        }
        setError(null);
        setHydrated(true);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : t('task.checklist.errorLoad');
        setError(message);
        setHydrated(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseItems, taskId]);

  const persist = useCallback(
    async (next: TaskChecklistItem[]) => {
      if (!taskId) return;
      await writeChecklistProgress(taskId, next);
    },
    [taskId],
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== itemId) return item;
          const completed = !item.completed;
          return {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
          };
        });
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const addItem = useCallback(
    (label: string) => {
      if (!label.trim()) return;
      setItems((prev) => {
        const next = [createChecklistItem(label), ...prev];
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== itemId);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setItems(baseItems);
    if (taskId) {
      void resetChecklistProgress(taskId);
    }
  }, [baseItems, taskId]);

  const completedRatio = useMemo(() => {
    if (!items.length) return null;
    const completed = items.filter((item) => item.completed).length;
    return `${completed}/${items.length}`;
  }, [items]);

  return {
    items,
    loading,
    hydrated,
    error,
    toggleItem,
    addItem,
    removeItem,
    reset,
    completedRatio,
  };
}
