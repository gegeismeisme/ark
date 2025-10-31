import { VISIBILITY_LABELS } from '../constants';
import type { OrgVisibility } from '../types';

type VisibilityCardProps = {
  visibility: OrgVisibility;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onChange: (next: OrgVisibility) => void;
};

export function VisibilityCard({
  visibility,
  loading,
  saving,
  error,
  onChange,
}: VisibilityCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">组织可见性</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            设置组织是否可以在目录中被搜索到。公开组织支持自由申请加入，私密组织仅通过邀请链接加入。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(Object.keys(VISIBILITY_LABELS) as OrgVisibility[]).map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
              visibility === value
                ? 'border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100/10 dark:text-zinc-100'
                : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
            }`}
          >
            <input
              type="radio"
              name="org-visibility"
              value={value}
              className="mt-0.5"
              checked={visibility === value}
              disabled={loading || saving}
              onChange={() => onChange(value)}
            />
            <div>
              <div className="font-medium">{VISIBILITY_LABELS[value]}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {value === 'public'
                  ? '成员可在组织目录中搜索并提交加入申请。'
                  : '组织不会出现在目录中，只能通过邀请链接加入。'}
              </div>
            </div>
          </label>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        状态：{loading ? '读取中' : saving ? '保存中' : '已同步'}
      </p>

      {error ? (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
