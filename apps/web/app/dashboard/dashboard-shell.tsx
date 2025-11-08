"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LocaleSwitcher } from "@/app/components/locale-switcher";
import { useTranslations } from "@/lib/i18n/client";

import { OrgSwitcher, useOrgContext } from "./org-provider";

type IconProps = {
  className?: string;
};

type NavChild = {
  href: string;
  labelKey: string;
};

type NavItem = {
  href: string;
  labelKey: string;
  icon: (props: IconProps) => JSX.Element;
  children?: NavChild[];
};

const OverviewIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 5h6v6H5z" />
    <path d="M13 5h6v4h-6z" />
    <path d="M13 11h6v9h-6z" />
    <path d="M5 14h6v6H5z" />
  </svg>
);

const AnalyticsIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19h16" />
    <path d="M4 19V5" />
    <path d="M8 19v-8" />
    <path d="M12 19v-5" />
    <path d="M16 19V7" />
    <path d="m20 10-3-2-3 3-4-4-4 3" />
  </svg>
);

const MembersIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M17 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M4 20v-1.2C4 16.1 6.1 14 8.8 14h0.4C12 14 14 16 14 18.8V20" />
    <path d="M14 20v-.6c0-2.1 1.7-3.8 3.8-3.8h0.4c2.1 0 3.8 1.7 3.8 3.8V20" />
  </svg>
);

const TagsIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12V6a2 2 0 0 1 2-2h6l8 8-8 8-8-8z" />
    <circle cx="9" cy="7" r="1.5" />
  </svg>
);

const GroupsIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 9.5 12 5l8 4.5-8 4.5-8-4.5z" />
    <path d="M4 13.5 12 18l8-4.5" />
    <path d="M4 17.5 12 22l8-4.5" />
  </svg>
);

const TasksIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 7h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    <path d="M9 3h6" />
    <path d="M12 7V3" />
    <path d="m9 13 2 2 4-4" />
  </svg>
);

const MyTasksIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 4h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="M9 2h6v4H9z" />
    <path d="m10 12 2 2 3-4" />
  </svg>
);

const OrganizationsIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 21V9l8-5 8 5v12" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 11h6" />
    <path d="M12 11v4" />
  </svg>
);

const HomeIcon = ({ className }: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 10.5 12 4l9 6.5" />
    <path d="M5 9.5V20h14V9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: OverviewIcon },
  {
    href: "/dashboard/analytics",
    labelKey: "nav.analytics",
    icon: AnalyticsIcon,
  },
  { href: "/dashboard/members", labelKey: "nav.members", icon: MembersIcon },
  { href: "/dashboard/tags", labelKey: "nav.tags", icon: TagsIcon },
  { href: "/dashboard/groups", labelKey: "nav.groups", icon: GroupsIcon },
  { href: "/dashboard/tasks", labelKey: "nav.tasks", icon: TasksIcon },
  { href: "/dashboard/my-tasks", labelKey: "nav.myTasks", icon: MyTasksIcon },
  { href: "/dashboard/organizations", labelKey: "nav.organizations", icon: OrganizationsIcon },
];

const normalizePath = (value: string) => {
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value || "/";
};

const splitHref = (href: string) => {
  const [pathPart, hashPart] = href.split("#");
  return {
    path: normalizePath(pathPart || "/"),
    hash: hashPart ? `#${hashPart}` : "",
  };
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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

  const normalizedCurrent = normalizePath(pathname);
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentHash(window.location.hash);
  }, [normalizedCurrent]);

  return (
    <div className="flex min-h-screen bg-[var(--ark-panel-surface)] text-[var(--ark-text-primary)]">
      <aside className="relative hidden w-[276px] flex-col border-r border-[var(--ark-sidebar-border)] bg-[var(--ark-sidebar-bg)]/98 shadow-[0_0_0_1px_rgba(7,9,12,0.35)] md:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ark-accent-soft)] text-[var(--ark-accent)] shadow-[0_0_0_1px_rgba(62,207,142,0.35)]"
          >
            <span className="text-base font-semibold uppercase">Ark</span>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-[var(--ark-text-primary)]">
              {t("app.consoleTitle")}
            </span>
            <span className="text-xs text-[var(--ark-sidebar-muted)]">
              {activeOrg?.name ?? t("common.notSet")}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--ark-sidebar-muted)]">
            {t("dashboard.shell.panelHeading")}
          </div>
          <nav className="mt-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const normalizedHref = normalizePath(item.href);
              const isRootDashboard = normalizedHref === "/dashboard";
              const isActive =
                normalizedCurrent === normalizedHref ||
                (!isRootDashboard &&
                  normalizedCurrent.startsWith(`${normalizedHref}/`));

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--ark-accent-soft)] text-[var(--ark-text-primary)] shadow-[0_0_0_1px_rgba(62,207,142,0.4)]"
                        : "text-[var(--ark-sidebar-muted)] hover:bg-white/6 hover:text-[var(--ark-text-primary)]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        isActive
                          ? "bg-[var(--ark-accent-soft)] text-[var(--ark-accent)] shadow-[0_0_0_1px_rgba(62,207,142,0.35)]"
                          : "bg-white/5 text-[var(--ark-text-primary)] group-hover:text-[var(--ark-accent)]"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="truncate">{t(item.labelKey)}</span>
                    {isActive ? (
                      <span className="ml-auto h-2 w-2 rounded-full bg-[var(--ark-accent)] shadow-[0_0_0_6px_rgba(62,207,142,0.14)]" />
                    ) : null}
                  </Link>
                  {item.children?.length ? (
                    <div className="ml-12 space-y-1 border-l border-[var(--ark-sidebar-border)]/60 pl-4">
                      {item.children.map((child) => {
                        const { path, hash } = splitHref(child.href);
                        const isChildPathActive = normalizedCurrent === path;
                        const isChildHashActive = hash ? currentHash === hash : true;
                        const isChildActive = isChildPathActive && isChildHashActive;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                              isChildActive
                                ? "text-[var(--ark-text-primary)]"
                                : "text-[var(--ark-sidebar-muted)] hover:text-[var(--ark-text-primary)]"
                            }`}
                          >
                            <span
                              className={`mr-2 h-1.5 w-1.5 rounded-full transition ${
                                isChildActive
                                  ? "bg-[var(--ark-accent)]"
                                  : "bg-[var(--ark-sidebar-border)]"
                              }`}
                            />
                            {t(child.labelKey)}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-[var(--ark-border-subtle)] px-6 py-5">
          {user ? (
            <div className="rounded-xl bg-white/6 px-4 py-3 text-xs text-[var(--ark-text-secondary)] shadow-[0_12px_40px_-28px_rgba(15,23,42,0.65)]">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[var(--ark-sidebar-muted)]">
                Seat
              </span>
              <span className="mt-1 block truncate font-medium text-[var(--ark-text-primary)]">
                {user.email}
              </span>
            </div>
          ) : (
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--ark-accent)] px-4 py-2 text-xs font-semibold text-[var(--ark-text-inverse)] shadow-[0_18px_34px_-24px_rgba(36,180,126,0.9)] transition hover:translate-y-[-1px]"
            >
              {t("auth.signIn")}
            </Link>
          )}
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/92 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <OrgSwitcher />
            {activeOrg ? (
              <span className="hidden text-xs font-medium text-[var(--ark-text-tertiary)] sm:inline">
                {activeOrg.slug ?? activeOrg.id}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            {user ? (
              <span className="hidden rounded-full bg-[var(--ark-card-surface)] px-3 py-1 text-xs font-medium text-[var(--ark-text-secondary)] sm:inline-flex">
                {user.email}
              </span>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ark-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--ark-text-secondary)] transition hover:border-[var(--ark-accent)] hover:text-[var(--ark-text-primary)]"
            >
              <HomeIcon className="h-4 w-4" />
              {t("common.backHome")}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10">
            {showEmptyState ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/70 text-center text-sm text-[var(--ark-text-secondary)] shadow-[0_22px_70px_-40px_rgba(15,23,42,0.65)]">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ark-accent-soft)] text-[var(--ark-accent)]">
                  <OrganizationsIcon className="h-6 w-6" />
                </span>
                <p className="max-w-sm leading-relaxed">
                  {t("dashboard.shell.noOrg")}
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
