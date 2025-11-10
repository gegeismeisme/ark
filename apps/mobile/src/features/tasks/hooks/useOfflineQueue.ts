'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabaseClient';
import {
  enqueueAssignmentStatusJob as enqueueAssignmentStatusJobStorage,
  getOfflineJobs,
  removeOfflineJob,
  subscribeOfflineQueue,
  updateOfflineJob,
  type AssignmentStatusJobPayload,
  type OfflineJob,
} from '../../../lib/storage/offlineQueue';
import { useTaskStore } from '../taskStore';

type UseOfflineQueueResult = {
  jobs: OfflineJob[];
  pendingAssignmentIds: string[];
  pendingCount: number;
  processing: boolean;
  enqueueAssignmentStatusJob: (payload: AssignmentStatusJobPayload) => Promise<void>;
  flushQueue: () => Promise<void>;
};

export function useOfflineQueue(session: Session | null): UseOfflineQueueResult {
  const [jobs, setJobs] = useState<OfflineJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const updateAssignment = useTaskStore((state) => state.updateAssignment);

  useEffect(() => {
    let cancelled = false;
    void getOfflineJobs().then((initial) => {
      if (!cancelled) setJobs(initial);
    });
    const unsubscribe = subscribeOfflineQueue((nextJobs) => setJobs(nextJobs));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const processAssignmentStatusJob = useCallback(
    async (job: OfflineJob) => {
      if (!session?.user) return false;
      const { assignmentId, updates } = job.payload;
      const { error } = await supabase.from('task_assignments').update(updates).eq('id', assignmentId);
      if (error) {
        await updateOfflineJob(job.id, (current) => ({
          ...current,
          attempts: current.attempts + 1,
          lastError: error.message,
          updatedAt: new Date().toISOString(),
        }));
        return false;
      }
      await removeOfflineJob(job.id);
      updateAssignment(assignmentId, (assignment) => assignment);
      return true;
    },
    [session?.user, updateAssignment],
  );

  const processJob = useCallback(
    async (job: OfflineJob) => {
      if (job.type === 'assignmentStatus') {
        return processAssignmentStatusJob(job);
      }
      return true;
    },
    [processAssignmentStatusJob],
  );

  const flushQueue = useCallback(async () => {
    if (!session?.user) return;
    if (!jobs.length) return;
    setProcessing(true);
    try {
      // process sequentially to respect order
      for (const job of jobs) {
        const success = await processJob(job);
        if (!success) {
          break;
        }
      }
    } finally {
      setProcessing(false);
    }
  }, [jobs, processJob, session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    if (!jobs.length) return;
    if (processing) return;
    void flushQueue();
  }, [jobs, processing, session?.user, flushQueue]);

  const enqueueAssignmentStatusJob = useCallback(async (payload: AssignmentStatusJobPayload) => {
    await enqueueAssignmentStatusJobStorage(payload);
  }, []);

  const pendingAssignmentIds = useMemo(() => {
    const ids = new Set<string>();
    jobs.forEach((job) => {
      if (job.type === 'assignmentStatus') {
        ids.add(job.payload.assignmentId);
      }
    });
    return Array.from(ids);
  }, [jobs]);

  return {
    jobs,
    pendingAssignmentIds,
    pendingCount: jobs.length,
    processing,
    enqueueAssignmentStatusJob,
    flushQueue,
  };
}
