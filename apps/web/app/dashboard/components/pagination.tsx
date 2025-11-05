"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/lib/i18n/client";

type UsePaginationOptions = {
  initialPage?: number;
  pageSize?: number;
};

export function usePagination<T>(
  items: readonly T[],
  options: UsePaginationOptions = {}
) {
  const { initialPage = 1, pageSize: initialPageSize = 10 } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startIndex = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    totalItems: items.length,
    startIndex,
    endIndex,
    paginatedItems,
  };
}

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
};

export function PaginationControls({
  page,
  pageCount,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  label,
}: PaginationControlsProps) {
  const t = useTranslations();
  const locale = useLocale();

  const resolvedLabel = label ?? t("pagination.defaultLabel");
  const summaryText = t("pagination.summary", {
    start: startIndex.toLocaleString(locale),
    end: endIndex.toLocaleString(locale),
    total: totalItems.toLocaleString(locale),
    label: resolvedLabel,
  });
  const canPrevious = page > 1;
  const canNext = page < pageCount;

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
      <div>{summaryText}</div>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && typeof pageSize === 'number' ? (
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {t("pagination.perPage")}
            <select
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
            aria-label={t("pagination.prev")}
          >
            ‹
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("pagination.pageSummary", { page, pageCount })}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label={t("pagination.next")}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
