"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/lib/i18n/client";

type UsePaginationOptions = {
  initialPage?: number;
  pageSize?: number;
};

export function usePagination<T>(
  items: readonly T[],
  options: UsePaginationOptions = {},
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
    <div className="flex flex-col gap-3 text-sm text-[var(--ark-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <div>{summaryText}</div>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && typeof pageSize === "number" ? (
          <label className="flex items-center gap-2 text-xs text-[var(--ark-text-tertiary)]">
            {t("pagination.perPage")}
            <select
              className="rounded-lg border border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/80 px-2 py-1 text-xs font-medium text-[var(--ark-text-secondary)] outline-none transition focus:border-[var(--ark-accent)] focus:ring-2 focus:ring-[var(--ark-accent)]/35"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ark-border-subtle)] text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
            aria-label={t("pagination.prev")}
          >
            ‹
          </button>
          <span className="text-xs text-[var(--ark-text-tertiary)]">
            {t("pagination.pageSummary", { page, pageCount })}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ark-border-subtle)] text-[var(--ark-text-secondary)] transition hover:bg-[var(--ark-panel-surface)]/60 hover:text-[var(--ark-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
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
