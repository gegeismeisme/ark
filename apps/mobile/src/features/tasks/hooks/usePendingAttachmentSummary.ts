'use client';

import { useEffect, useState } from 'react';

import {
  getPendingAttachmentSummary,
  subscribePendingAttachmentSummary,
  type PendingAttachmentSummary,
} from '../../../lib/storage/pendingAttachmentUploads';

const EMPTY_SUMMARY: PendingAttachmentSummary = {
  total: 0,
  taskIds: [],
  errorCount: 0,
  lastError: null,
};

export function usePendingAttachmentSummary() {
  const [summary, setSummary] = useState<PendingAttachmentSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    let active = true;
    void getPendingAttachmentSummary().then((result) => {
      if (active) {
        setSummary(result);
      }
    });
    const unsubscribe = subscribePendingAttachmentSummary((next) => {
      setSummary(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return summary;
}
