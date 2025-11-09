'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from '@/lib/i18n/client';
import { supabase } from '../../lib/supabaseClient';

import { useOrgContext } from './org-provider';

type Metrics = {
  members: number;
  groups: number;
  tasks: number;
};

export default function DashboardHome() {
  const t = useTranslations();
  const { activeOrg, organizationsLoading, organizationsError } = useOrgContext();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? null;

  useEffect(() => {
    if (!orgId) {
      setMetrics(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const [membersRes, groupsRes, tasksRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .is('removed_at', null),
        supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .is('deleted_at', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .is('archived_at', null),
      ]);

      if (cancelled) return;

      const firstError =
        membersRes.error ?? groupsRes.error ?? tasksRes.error ?? null;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setMetrics({
        members: membersRes.count ?? 0,
        groups: groupsRes.count ?? 0,
        tasks: tasksRes.count ?? 0,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const overviewCards = useMemo(
    () => [
      {
        label: t('dashboard.home.cards.members.label'),
        value: metrics?.members ?? 0,
        href: '/dashboard/members',
        description: t('dashboard.home.cards.members.description'),
      },
      {
        label: t('dashboard.home.cards.groups.label'),
        value: metrics?.groups ?? 0,
        href: '/dashboard/groups',
        description: t('dashboard.home.cards.groups.description'),
      },
      {
        label: t('dashboard.home.cards.tasks.label'),
        value: metrics?.tasks ?? 0,
        href: '/dashboard/tasks',
        description: t('dashboard.home.cards.tasks.description'),
      },
    ],
    [metrics, t]
  );

  if (organizationsLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t('dashboard.home.title')}</h1>
        <div className="animate-pulse rounded-xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {t('dashboard.home.loading')}
        </div>
      </div>
    );
  }

  if (organizationsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t('dashboard.home.title')}</h1>
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {organizationsError}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t('dashboard.home.title')}</h1>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          {t('dashboard.home.noOrg')}
        </div>
      </div>
    );
  }

  const orgName = activeOrg?.name ?? t('common.notSet');
  const orgSlug = activeOrg?.slug
    ? t('dashboard.home.orgLabelWithSlug', { name: orgName, slug: activeOrg.slug })
    : t('dashboard.home.orgLabel', { name: orgName });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.home.welcome')}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{orgSlug}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {overviewCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {card.label}
              </div>
              <div className="mt-2 text-3xl font-semibold">{loading ? '...' : card.value}</div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t('dashboard.home.nextSteps')}
        </h2>
        <ul className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-400">
          <li>
            {t('dashboard.home.actions.members.prefix')}
            <Link
              href="/dashboard/members"
              className="mx-1 text-zinc-900 underline dark:text-zinc-100"
            >
              {t('dashboard.home.actions.members.link')}
            </Link>
            {t('dashboard.home.actions.members.suffix')}
          </li>
          <li>
            {t('dashboard.home.actions.groups.prefix')}
            <Link
              href="/dashboard/groups"
              className="mx-1 text-zinc-900 underline dark:text-zinc-100"
            >
              {t('dashboard.home.actions.groups.link')}
            </Link>
            {t('dashboard.home.actions.groups.suffix')}
          </li>
          <li>
            {t('dashboard.home.actions.tasks.prefix')}
            <Link
              href="/dashboard/tasks"
              className="mx-1 text-zinc-900 underline dark:text-zinc-100"
            >
              {t('dashboard.home.actions.tasks.link')}
            </Link>
            {t('dashboard.home.actions.tasks.suffix')}
          </li>
        </ul>
      </div>
    </div>
  );
}
