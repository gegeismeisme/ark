'use client';

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
  } = useOrgContext();

  if (organizationsLoading) {
    return (
      <div className="flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        加载组织中…
      </div>
    );
  }

  if (organizationsError) {
    return (
      <div className="flex h-10 items-center rounded-lg border border-red-300 bg-red-50 px-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {organizationsError}
      </div>
    );
  }

  if (!organizations.length) {
    return (
      <div className="flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        暂无组织
      </div>
    );
  }

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">组织</span>
      <select
        className="bg-transparent text-sm font-medium outline-none dark:text-zinc-100"
        value={activeOrg?.id ?? ''}
        onChange={(event) => setActiveOrgId(event.target.value)}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
            {org.role === 'owner'
              ? ' · 拥有者'
              : org.role === 'admin'
                ? ' · 管理员'
                : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
