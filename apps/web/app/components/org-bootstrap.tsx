'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuthState } from '@project-ark/shared';

import { supabase } from '../../lib/supabaseClient';

const inputClass =
  'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600';
const buttonClass =
  'inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 active:translate-y-[1px] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200';

const DEFAULT_GROUP_NAME = 'General';

const DUPLICATE_SLUG_ERROR = '组织标识已被占用，请尝试其他名称或自定义标识。';
const GENERIC_ERROR = '创建组织失败，请稍后再试。';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function OrgBootstrap() {
  const router = useRouter();
  const { session, user, loading } = useSupabaseAuthState({ client: supabase });

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasOrg(null);
      return;
    }

    let active = true;

    (async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!active) return;

      if (membershipError) {
        setError(membershipError.message);
        setHasOrg(false);
        return;
      }

      if (memberships && memberships.length > 0) {
        setHasOrg(true);
        return;
      }

      const { data: owned, error: ownedError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (!active) return;

      if (ownedError) {
        setError(ownedError.message);
        setHasOrg(false);
        return;
      }

      setHasOrg(Boolean(owned && owned.length > 0));
    })();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (session && hasOrg) {
      router.push('/dashboard');
    }
  }, [hasOrg, router, session]);

  const onNameChange = useCallback(
    (value: string) => {
      setOrgName(value);
      setError(null);

      if (!orgSlug) {
        setOrgSlug(slugify(value));
      }
    },
    [orgSlug]
  );

  const onSlugChange = useCallback((value: string) => {
    setOrgSlug(slugify(value));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || submitting) return;

    const name = orgName.trim();
    const slug = slugify(orgSlug.trim());

    if (!name || !slug) {
      setError('请输入组织名称和标识。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (organizationError) {
        if (
          organizationError.message?.includes('organizations_slug_key') ||
          organizationError.message?.toLowerCase().includes('duplicate key value')
        ) {
          setError(DUPLICATE_SLUG_ERROR);
        } else {
          setError(organizationError.message || GENERIC_ERROR);
        }
        return;
      }

      const orgId = organization?.id;
      if (!orgId) {
        setError(GENERIC_ERROR);
        return;
      }

      const timestamp = new Date().toISOString();

      const { error: membershipError } = await supabase
        .from('organization_members')
        .upsert(
          {
            organization_id: orgId,
            user_id: user.id,
            role: 'owner',
            status: 'active',
            invited_by: user.id,
            invited_at: timestamp,
            joined_at: timestamp,
          },
          { onConflict: 'organization_id,user_id' }
        );

      if (membershipError) {
        setError(membershipError.message || GENERIC_ERROR);
        return;
      }

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          organization_id: orgId,
          name: DEFAULT_GROUP_NAME,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (groupError) {
        setError(groupError.message || GENERIC_ERROR);
        return;
      }

      const groupId = group?.id;
      if (groupId) {
        const { error: groupMemberError } = await supabase
          .from('group_members')
          .upsert(
            {
              group_id: groupId,
              user_id: user.id,
              role: 'admin',
              status: 'active',
              added_by: user.id,
              added_at: timestamp,
            },
            { onConflict: 'group_id,user_id' }
          );

        if (groupMemberError) {
          setError(groupMemberError.message || GENERIC_ERROR);
          return;
        }
      }

      setHasOrg(true);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || GENERIC_ERROR);
      } else {
        setError(GENERIC_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgName, orgSlug, router, submitting, user]);

  if (!session || loading || hasOrg === null) return null;
  if (hasOrg) return null;

  return (
    <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        欢迎创建您的第一个组织
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        首次登录需要先创建一个组织，以便继续使用后台功能。
      </p>
      <div className="flex flex-col gap-3">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">组织名称</label>
        <input
          className={inputClass}
          value={orgName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例如：Acme 团队"
        />
        <label className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          组织标识（Slug）
        </label>
        <input
          className={inputClass}
          value={orgSlug}
          onChange={(event) => onSlugChange(event.target.value)}
          placeholder="例如：acme"
        />
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            className={buttonClass}
            onClick={handleSubmit}
          >
            {submitting ? '创建中...' : '创建组织'}
          </button>
        </div>
      </div>
    </div>
  );
}
