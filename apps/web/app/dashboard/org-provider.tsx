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

  const storageKey = user ? `${STORAGE_PREFIX}:${user.id}` : null;

  const loadOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrgId(null);
      setOrganizationsError(null);
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
          } satisfies OrgSummary;
        })
        .filter((org): org is OrgSummary => Boolean(org)) ?? [];

    setOrganizations(mapped);

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

  const value = useMemo<OrgContextValue>(
    () => ({
      user,
      authLoading,
      organizations,
      organizationsLoading,
      organizationsError,
      activeOrg,
      setActiveOrgId: setActiveOrgIdSafe,
      refreshOrganizations: loadOrganizations,
    }),
    [
      activeOrg,
      authLoading,
      loadOrganizations,
      organizations,
      organizationsError,
      organizationsLoading,
      setActiveOrgIdSafe,
      user,
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
  } = useOrgContext();
  const t = useTranslations();

  if (organizationsLoading) {
    return (
      <div className="flex h-10 items-center rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
        {t('dashboard.orgSwitcher.loading')}
      </div>
    );
  }

  if (organizationsError) {
    return (
      <div className="flex h-16 items-center justify-between gap-3 rounded-xl border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.12)] px-3 text-sm font-medium text-[var(--ark-text-primary)] shadow-[0_12px_30px_-24px_rgba(248,113,113,0.55)]">
        <span>{t('dashboard.orgSwitcher.error', { error: organizationsError })}</span>
        <button
          type="button"
          className="rounded-lg bg-[rgba(248,113,113,0.2)] px-3 py-1 text-xs font-semibold transition hover:bg-[rgba(248,113,113,0.35)]"
          onClick={() => void refreshOrganizations()}
        >
          {t('dashboard.orgSwitcher.retry')}
        </button>
      </div>
    );
  }

  if (!organizations.length) {
    return (
      <div className="flex h-16 items-center justify-between gap-3 rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
        <span>{t('dashboard.orgSwitcher.empty')}</span>
        <Link
          href="/organizations"
          className="rounded-lg bg-[var(--ark-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ark-accent)]"
        >
          {t('dashboard.orgSwitcher.cta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-16 flex-col justify-center gap-1 rounded-xl border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 text-sm text-[var(--ark-text-secondary)] shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
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
      <select
        className="w-full bg-transparent text-sm font-semibold text-[var(--ark-text-primary)] outline-none"
        value={activeOrg?.id ?? ''}
        onChange={(event) => setActiveOrgId(event.target.value)}
      >
        {organizations.map((org) => {
          const roleKey =
            org.role === 'owner'
              ? 'dashboard.orgSwitcher.role.owner'
              : org.role === 'admin'
                ? 'dashboard.orgSwitcher.role.admin'
                : 'dashboard.orgSwitcher.role.member';
          const slugSuffix = org.slug ? ` · ${org.slug}` : '';

          return (
            <option key={org.id} value={org.id}>
              {org.name}
              {slugSuffix} · {t(roleKey)}
            </option>
          );
        })}
      </select>
    </div>
  );
}
