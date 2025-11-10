'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AssignmentStatus } from '../../types';

const KEY = 'ark-mobile-offline-queue';

export type AssignmentStatusJobPayload = {
  assignmentId: string;
  updates: Record<string, unknown>;
  summary: {
    nextStatus?: AssignmentStatus;
    completionNote?: string | null;
  };
  localAppliedAt: string;
};

export type OfflineJob = {
  id: string;
  type: 'assignmentStatus';
  payload: AssignmentStatusJobPayload;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type Listener = (jobs: OfflineJob[]) => void;

const listeners = new Set<Listener>();

const notify = (jobs: OfflineJob[]) => {
  listeners.forEach((listener) => {
    listener(jobs);
  });
};

export const subscribeOfflineQueue = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

async function readRawQueue(): Promise<OfflineJob[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineJob[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

async function writeQueue(jobs: OfflineJob[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(jobs));
  notify(jobs);
}

export async function getOfflineJobs(): Promise<OfflineJob[]> {
  return readRawQueue();
}

export async function enqueueOfflineJob(job: OfflineJob): Promise<void> {
  const jobs = await readRawQueue();
  jobs.push(job);
  await writeQueue(jobs);
}

export async function removeOfflineJob(jobId: string): Promise<void> {
  const jobs = await readRawQueue();
  const next = jobs.filter((job) => job.id !== jobId);
  await writeQueue(next);
}

export async function updateOfflineJob(
  jobId: string,
  updater: (job: OfflineJob) => OfflineJob
): Promise<void> {
  const jobs = await readRawQueue();
  const next = jobs.map((job) => {
    if (job.id !== jobId) return job;
    return updater(job);
  });
  await writeQueue(next);
}

export async function clearOfflineJobs(): Promise<void> {
  await writeQueue([]);
}

const randomId = () => Math.random().toString(36).slice(2, 10);

export function buildAssignmentStatusJob(
  payload: AssignmentStatusJobPayload
): OfflineJob {
  const timestamp = new Date().toISOString();
  return {
    id: `offline-${timestamp}-${randomId()}`,
    type: 'assignmentStatus',
    payload,
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function enqueueAssignmentStatusJob(
  payload: AssignmentStatusJobPayload
): Promise<void> {
  const job = buildAssignmentStatusJob(payload);
  await enqueueOfflineJob(job);
}
