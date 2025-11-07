'use client';

import { useTranslations } from '@/lib/i18n/client';

import type { TagSelectionType, TaskTagCategory } from '../types';

type TagFilterPanelProps = {
  loading: boolean;
  categories: TaskTagCategory[];
  filters: Record<string, string[]>;
  selectionLabels: Record<TagSelectionType, string>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onReset: () => void;
  onSingleChange: (categoryId: string, value: string) => void;
  onToggle: (categoryId: string, tagId: string, checked: boolean) => void;
  disabled?: boolean;
};

export function TaskComposerTagFilters({
  loading,
  categories,
  filters,
  selectionLabels,
  hasActiveFilters,
  activeFilterCount,
  onReset,
  onSingleChange,
  onToggle,
  disabled = false,
}: TagFilterPanelProps) {
  const t = useTranslations();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {t('dashboard.tasks.tagFilters.title')}
        </h3>
        <button
          type="button"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={onReset}
          disabled={disabled || !hasActiveFilters}
        >
          {t('dashboard.tasks.tagFilters.clear')}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('dashboard.tasks.tagFilters.loading')}
        </p>
      ) : categories.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('dashboard.tasks.tagFilters.empty')}
        </p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {categories.map((category) => {
            const selected = filters[category.id] ?? [];
            return (
              <div
                key={category.id}
                className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {category.name}{' '}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {selectionLabels[category.selectionType]}
                    {category.isRequired ? ` · ${t('dashboard.tasks.tagFilters.required')}` : ''}
                  </span>
                </div>
                {category.selectionType === 'single' ? (
                  <select
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                    value={selected[0] ?? ''}
                    onChange={(event) => onSingleChange(category.id, event.target.value)}
                    disabled={disabled}
                  >
                    <option value="">{t('dashboard.tasks.tagFilters.anyOption')}</option>
                    {category.tags.map((tag) => (
                      <option key={tag.id} value={tag.id} disabled={!tag.isActive}>
                        {tag.name}
                        {!tag.isActive ? ` ${t('dashboard.tasks.tagFilters.tagInactive')}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => {
                      const checked = selected.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            checked
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                              : 'border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
                            checked={checked}
                            onChange={(event) => onToggle(category.id, tag.id, event.target.checked)}
                            disabled={disabled || (!tag.isActive && !checked)}
                          />
                          <span>
                            {tag.name}
                            {!tag.isActive ? ` ${t('dashboard.tasks.tagFilters.tagInactive')}` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasActiveFilters ? (
        <div className="text-xs text-emerald-600 dark:text-emerald-300">
          {t('dashboard.tasks.tagFilters.applied', { count: activeFilterCount })}
        </div>
      ) : null}
    </div>
  );
}
