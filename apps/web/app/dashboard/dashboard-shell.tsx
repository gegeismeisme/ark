"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LocaleSwitcher } from "@/app/components/locale-switcher";
import { useTranslations } from "@/lib/i18n/client";

import { OrgSwitcher, useOrgContext } from "./org-provider";

const NAV_LINKS = [
  { href: "/dashboard", labelKey: "nav.overview" },
  { href: "/dashboard/analytics", labelKey: "nav.analytics" },
  { href: "/dashboard/members", labelKey: "nav.members" },
  { href: "/dashboard/tags", labelKey: "nav.tags" },
  { href: "/dashboard/groups", labelKey: "nav.groups" },
  { href: "/dashboard/tasks", labelKey: "nav.tasks" },
  { href: "/dashboard/my-tasks", labelKey: "nav.myTasks" },
  { href: "/organizations", labelKey: "nav.organizations" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    authLoading,
    activeOrg,
    organizationsError,
    organizationsLoading,
  } = useOrgContext();
  const t = useTranslations();

  const showEmptyState =
    !authLoading &&
    !organizationsLoading &&
    !organizationsError &&
    !activeOrg;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="border-b border-zinc-200 bg-white/80 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
            >
              {t("app.consoleTitle")}
            </Link>
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <LocaleSwitcher />
            {user ? (
              <span className="font-medium">{user.email}</span>
            ) : (
              <Link
                href="/"
                className="rounded-md bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {t("auth.signIn")}
              </Link>
            )}
            <Link
              href="/"
              className="rounded-md border border-zinc-200 px-3 py-1 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("common.backHome")}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <aside className="w-60 shrink-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("dashboard.shell.panelHeading")}
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => router.push(link.href)}
                  className={`rounded-md px-2 py-1.5 text-left transition ${
                    active
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t(link.labelKey)}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">
          {showEmptyState ? (
            <div className="flex h-[calc(100vh-180px)] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {t("dashboard.shell.noOrg")}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
