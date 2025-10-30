'use client';

import type { FormEvent } from 'react';

import type { SelectionType, TagCategory } from './use-tag-management';

type TagCategorySectionProps = {
  isAdmin: boolean;
  categories: TagCategory[];
  categoriesLoading: boolean;
  creatingCategory: boolean;
  newCategoryName: string;
  newCategorySelection: SelectionType;
  newCategoryRequired: boolean;
  newTagNames: Record<string, string>;
  categoryUpdating: Record<string, boolean>;
  tagMutations: Record<string, boolean>;
  selectionTypeLabels: Record<SelectionType, string>;
  onCategoryNameChange: (value: string) => void;
  onCategorySelectionChange: (value: SelectionType) => void;
  onCategoryRequiredChange: (value: boolean) => void;
  onTagNameChange: (categoryId: string, value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<{ is_required: boolean; selection_type: SelectionType }>
  ) => void;
  onCreateTag: (event: FormEvent<HTMLFormElement>, categoryId: string) => void;
  onToggleTagActive: (tagId: string, shouldActivate: boolean) => void;
};

export function TagCategorySection({
  isAdmin,
  categories,
  categoriesLoading,
  creatingCategory,
  newCategoryName,
  newCategorySelection,
  newCategoryRequired,
  newTagNames,
  categoryUpdating,
  tagMutations,
  selectionTypeLabels,
  onCategoryNameChange,
  onCategorySelectionChange,
  onCategoryRequiredChange,
  onTagNameChange,
  onCreateCategory,
  onUpdateCategory,
  onCreateTag,
  onToggleTagActive,
}: TagCategorySectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">标签类别</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          类别帮助你按“性别”“学科”“职务”等维度组织标签，可设置为单选或多选，以及是否为成员加入时的必填项。
        </p>
      </div>

      {isAdmin ? (
        <form
          onSubmit={onCreateCategory}
          className="space-y-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-900/10"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">类别名称</span>
              <input
                className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                placeholder="例如：学科、年级、职务"
                value={newCategoryName}
                onChange={(event) => onCategoryNameChange(event.target.value)}
                maxLength={60}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">选择方式</span>
              <select
                className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-700"
                value={newCategorySelection}
                onChange={(event) => onCategorySelectionChange(event.target.value as SelectionType)}
              >
                <option value="single">单选（仅允许选择一个标签）</option>
                <option value="multiple">多选（允许选择多个标签）</option>
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-zinc-900"
                checked={newCategoryRequired}
                onChange={(event) => onCategoryRequiredChange(event.target.checked)}
              />
              <span>成员加入时必须选择</span>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              {creatingCategory ? '创建中…' : '新增类别'}
            </button>
          </div>
        </form>
      ) : null}

      {categoriesLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载类别...
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          尚未创建标签类别。
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {categories.map((category) => {
            const updating = Boolean(categoryUpdating[category.id]);
            return (
              <div
                key={category.id}
                className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{category.name}</h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectionTypeLabels[category.selectionType]} · {category.isRequired ? '必选' : '可选'}
                    </span>
                  </div>
                  {isAdmin ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                          checked={category.isRequired}
                          onChange={() =>
                            onUpdateCategory(category.id, { is_required: !category.isRequired })
                          }
                          disabled={updating}
                        />
                        <span>成员加入时必须选择</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <span>选择方式</span>
                        <select
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          value={category.selectionType}
                          onChange={(event) =>
                            onUpdateCategory(category.id, {
                              selection_type: event.target.value as SelectionType,
                            })
                          }
                          disabled={updating}
                        >
                          <option value="single">单选</option>
                          <option value="multiple">多选</option>
                        </select>
                      </label>
                      {updating ? <span className="text-emerald-600">保存中…</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {category.tags.length === 0 ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">暂无标签</span>
                  ) : (
                    <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {category.tags.map((tag) => {
                        const mutationKey = `tag-${tag.id}`;
                        const toggling = Boolean(tagMutations[mutationKey]);
                        return (
                          <li
                            key={tag.id}
                            className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
                          >
                            <span
                              className={`${
                                tag.isActive ? 'text-zinc-700 dark:text-zinc-100' : 'text-zinc-400 line-through'
                              }`}
                            >
                              {tag.name}
                              {!tag.isActive ? '（停用）' : ''}
                            </span>
                            {isAdmin ? (
                              <button
                                type="button"
                                className="text-xs font-medium text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:text-emerald-400"
                                onClick={() => onToggleTagActive(tag.id, !tag.isActive)}
                                disabled={toggling}
                              >
                                {toggling ? '更新中…' : tag.isActive ? '停用' : '启用'}
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {isAdmin ? (
                  <form
                    onSubmit={(event) => onCreateTag(event, category.id)}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <input
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="输入标签名称后回车，例如：数学 / 班主任"
                      value={newTagNames[category.id] ?? ''}
                      onChange={(event) => onTagNameChange(category.id, event.target.value)}
                      maxLength={60}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                      disabled={
                        Boolean(tagMutations[`create-${category.id}`]) ||
                        !(newTagNames[category.id] ?? '').trim()
                      }
                    >
                      {tagMutations[`create-${category.id}`] ? '添加中…' : '新增标签'}
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
