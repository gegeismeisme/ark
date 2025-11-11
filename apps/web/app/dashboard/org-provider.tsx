'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabaseAuthState } from '@project-ark/shared';

import { useTranslations } from '@/lib/i18n/client';

import { supabase } from '../../lib/supabaseClient';

type OrgSummary = {
  id: string;
  name: string;
  slug: string | null;
  role: string;
  memberCount: number | null;
};

type OrganizationMembershipRow = {
  organization_id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

type OrgContextValue = {
  user: User | null;
  authLoading: boolean;
  organizations: OrgSummary[];
  organizationsLoading: boolean;
  organizationsError: string | null;
  activeOrg: OrgSummary | null;
  setActiveOrgId: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
  autoRetryDelayMs: number | null;
  retryAttempts: number;
};

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_PREFIX = 'ark-active-org';

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSupabaseAuthState({
    client: supabase,
  });

  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(
    null
  );
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [autoRetryDelayMs, setAutoRetryDelayMs] = useState<number | null>(null);

  const storageKey = user ? `${STORAGE_PREFIX}:${user.id}` : null;

  const loadOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrgId(null);
      setOrganizationsError(null);
      setRetryAttempts(0);
      setAutoRetryDelayMs(null);
      return;
    }

    setOrganizationsLoading(true);
    setOrganizationsError(null);

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        'organization_id, role, organizations!inner(id, name, slug)'
      )
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('removed_at', null)
      .order('joined_at', { ascending: true });

    if (error) {
      setOrganizations([]);
      setActiveOrgId(null);
      setOrganizationsError(error.message);
      setOrganizationsLoading(false);
      return;
    }

    const mapped =
      ((data ?? []) as Array<
        OrganizationMembershipRow & {
          organizations:
            | OrganizationMembershipRow['organizations']
            | OrganizationMembershipRow['organizations'][];
        }
      >)
        .map(({ organizations, role }) => {
          const org = Array.isArray(organizations)
            ? organizations[0] ?? null
            : organizations;
          if (!org) return null;
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role,
            memberCount: null,
          } satisfies OrgSummary;
        })
        .filter((org): org is OrgSummary => Boolean(org)) ?? [];

    let counts: Record<string, number> = {};
    if (mapped.length) {
      const { data: countRows } = await supabase
        .from('organization_members')
        .select('organization_id')
        .in(
          'organization_id',
          mapped.map((org) => org.id),
        )
        .eq('status', 'active')
        .is('removed_at', null);
      if (countRows) {
        counts = countRows.reduce<Record<string, number>>((acc, row) => {
          const orgId = (row as { organization_id: string }).organization_id;
          acc[orgId] = (acc[orgId] ?? 0) + 1;
          return acc;
        }, {});
      }
    }

    const enriched = mapped.map((org) => ({
      ...org,
      memberCount: counts[org.id] ?? null,
    }));

    setOrganizations(enriched);
    setRetryAttempts(0);
    setAutoRetryDelayMs(null);

    if (typeof window !== 'undefined') {
      const stored = storageKey
        ? window.localStorage.getItem(storageKey)
        : null;
      const storedExists =
        stored && mapped.some((org) => org.id === stored);
      if (storedExists) {
        setActiveOrgId(stored as string);
      } else {
        setActiveOrgId(mapped[0]?.id ?? null);
        if (storageKey && mapped[0]?.id) {
          window.localStorage.setItem(storageKey, mapped[0].id);
        }
      }
    } else {
      setActiveOrgId(mapped[0]?.id ?? null);
    }

    setOrganizationsLoading(false);
  }, [storageKey, user]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    if (!activeOrgId) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, activeOrgId);
  }, [activeOrgId, storageKey]);

  const setActiveOrgIdSafe = useCallback(
    (nextId: string) => {
      if (!organizations.some((org) => org.id === nextId)) return;
      setActiveOrgId(nextId);
    },
    [organizations]
  );

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return organizations.find((org) => org.id === activeOrgId) ?? null;
  }, [activeOrgId, organizations]);

  useEffect(() => {
    if (!organizationsError) {
      setAutoRetryDelayMs(null);
      return;
    }
    if (retryAttempts >= 3) {
      setAutoRetryDelayMs(null);
      return;
    }
    const delay = Math.min(30000, 2000 * 2 ** retryAttempts);
    setAutoRetryDelayMs(delay);
    const timer = setTimeout(() => {
      setAutoRetryDelayMs(null);
      setRetryAttempts((count) => count + 1);
      void loadOrganizations();
    }, delay);
    return () => clearTimeout(timer);
  }, [loadOrganizations, organizationsError, retryAttempts]);

  const refreshOrganizations = useCallback(async () => {
    setRetryAttempts(0);
    setAutoRetryDelayMs(null);
    await loadOrganizations();
  }, [loadOrganizations]);

  const value = useMemo<OrgContextValue>(
    () => ({
      user,
      authLoading,
      organizations,
      organizationsLoading,
      organizationsError,
      activeOrg,
      setActiveOrgId: setActiveOrgIdSafe,
      refreshOrganizations,
      autoRetryDelayMs,
      retryAttempts,
    }),
    [
      activeOrg,
      autoRetryDelayMs,
      authLoading,
      organizations,
      organizationsError,
      organizationsLoading,
      refreshOrganizations,
      setActiveOrgIdSafe,
      user,
      retryAttempts,
    ]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrgContext must be used within an OrgProvider');
  }
  return context;
}

export function OrgSwitcher() {
  const {
    organizations,
    organizationsLoading,
    organizationsError,
    activeOrg,
    setActiveOrgId,
    refreshOrganizations,
    autoRetryDelayMs,
    retryAttempts,
  } = useOrgContext();
  const t = useTranslations();
  const autoRetrySeconds =
    typeof autoRetryDelayMs === 'number' ? Math.ceil(autoRetryDelayMs / 1000) : null;
  const isRetrying = organizationsLoading && Boolean(organizationsError);

  if (organizationsLoading) {
    return (
      <div className="flex h-10 items-center rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
        {t('dashboard.orgSwitcher.loading')}
      </div>
    );
  }

  if (organizationsError) {
    return (
      <div className="flex h-auto flex-col gap-2 rounded-xl border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] p-3 text-sm font-medium text-[var(--ark-text-primary)] shadow-[0_12px_30px_-24px_rgba(248,113,113,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <span>{t('dashboard.orgSwitcher.error', { error: organizationsError })}</span>
          <button
            type="button"
            className="rounded-lg bg-[rgba(248,113,113,0.2)] px-3 py-1 text-xs font-semibold transition hover:bg-[rgba(248,113,113,0.35)]"
            onClick={() => void refreshOrganizations()}
          >
            {t('dashboard.orgSwitcher.retry')}
          </button>
        </div>
        {isRetrying ? (
          <span className="text-xs font-normal text-[rgba(248,113,113,0.95)]">
            {t('dashboard.orgSwitcher.retryingNow')}
          </span>
        ) : autoRetrySeconds !== null && retryAttempts < 3 ? (
          <span className="text-xs font-normal text-[rgba(248,113,113,0.95)]">
            {t('dashboard.orgSwitcher.autoRetry', { seconds: autoRetrySeconds })}
          </span>
        ) : null}
      </div>
    );
  }

  if (!organizations.length) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 py-4 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-[var(--ark-text-primary)]">
            {t('dashboard.orgSwitcher.empty')}
          </span>
          <span className="text-xs">{t('dashboard.orgSwitcher.emptyHint')}</span>
        </div>
        <Link
          href="/organizations"
          className="mt-1 inline-flex w-fit items-center rounded-lg bg-[var(--ark-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ark-accent)]"
        >
          {t('dashboard.orgSwitcher.cta')}
        </Link>
      </div>
    );
  }

  const memberLabel = activeOrg
    ? activeOrg.memberCount !== null
      ? t('dashboard.orgSwitcher.memberCount', { count: activeOrg.memberCount })
      : t('dashboard.orgSwitcher.memberCountUnknown')
    : null;

  return (
    <div className="rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 py-3 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--ark-text-tertiary)]">
            {t('dashboard.orgSwitcher.label')}
            {activeOrg ? (
              <span className="rounded-full bg-[var(--ark-border-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ark-text-primary)]">
                {t(
                  activeOrg.role === 'owner'
                    ? 'dashboard.orgSwitcher.role.owner'
                    : activeOrg.role === 'admin'
                      ? 'dashboard.orgSwitcher.role.admin'
                      : 'dashboard.orgSwitcher.role.member'
                )}
              </span>
            ) : null}
          </label>
          {memberLabel ? (
            <p className="text-xs font-medium text-[var(--ark-text-secondary)]">{memberLabel}</p>
          ) : null}
        </div>
        <Link
          href="/organizations"
          className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--ark-accent)] transition hover:bg-[var(--ark-accent-soft)]"
        >
          {t('dashboard.orgSwitcher.manage')}
        </Link>
      </div>
      <div
        role="listbox"
        aria-label={t('dashboard.orgSwitcher.label')}
        className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1"
      >
        {organizations.map((org) => {
          const isActive = activeOrg?.id === org.id;
          const roleKey =
            org.role === 'owner'
              ? 'dashboard.orgSwitcher.role.owner'
              : org.role === 'admin'
                ? 'dashboard.orgSwitcher.role.admin'
                : 'dashboard.orgSwitcher.role.member';
          const memberText =
            org.memberCount !== null
              ? t('dashboard.orgSwitcher.memberCountShort', { count: org.memberCount })
              : t('dashboard.orgSwitcher.memberCountUnknownShort');
          return (
            <button
              key={org.id}
              type="button"
              className={[
                'flex w-full flex-col gap-2 rounded-lg border px-3 py-2 text-left transition',
                isActive
                  ? 'border-[var(--ark-accent)] bg-[var(--ark-accent-soft)] text-[var(--ark-text-primary)]'
                  : 'border-[var(--ark-border-subtle)] bg-[var(--ark-panel-surface)]/60 hover:border-[var(--ark-border-strong)] hover:bg-[var(--ark-panel-surface)]/80',
              ].join(' ')}
              onClick={() => setActiveOrgId(org.id)}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--ark-text-primary)]">{org.name}</span>
                {org.slug ? (
                  <span className="text-xs font-medium text-[var(--ark-text-tertiary)]">
                    {org.slug}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span
                  className={[
                    'rounded-full px-2 py-0.5',
                    isActive
                      ? 'bg-[rgba(15,23,42,0.08)] text-[var(--ark-text-primary)]'
                      : 'bg-[var(--ark-border-subtle)] text-[var(--ark-text-tertiary)]',
                  ].join(' ')}
                >
                  {t(roleKey)}
                </span>
                <span
                  className={[
                    'rounded-full px-2 py-0.5',
                    isActive
                      ? 'bg-[rgba(15,23,42,0.08)] text-[var(--ark-text-primary)]'
                      : 'bg-[var(--ark-border-subtle)] text-[var(--ark-text-tertiary)]',
                  ].join(' ')}
                >
                  {memberText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
