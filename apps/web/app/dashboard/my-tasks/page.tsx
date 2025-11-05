"use client";

import { useTranslations } from "@/lib/i18n/client";

export default function DashboardMyTasksPlaceholder() {
  const t = useTranslations();
  return (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      {t("dashboard.myTasks.placeholder")}
    </div>
  );
}
