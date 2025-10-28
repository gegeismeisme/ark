'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseAuthState, createAuthActions } from '@project-ark/shared';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const inputClass =
  'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600';
const buttonClass =
  'inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 active:translate-y-[1px] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200';

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
  useMemo(() => createAuthActions(supabase), []);

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasOrg, setHasOrg] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);
      if (!mounted) return;
      if (error) {
        // If RLS blocks, fall back to checking ownership
        const { data: owned, error: ownedErr } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);
        if (ownedErr) {
          setError(ownedErr.message);
          setHasOrg(false);
        } else {
          setHasOrg(Boolean(owned && owned.length > 0));
        }
      } else {
        setHasOrg(Boolean(data && data.length > 0));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const onNameChange = useCallback((v: string) => {
    setOrgName(v);
    if (!orgSlug) setOrgSlug(slugify(v));
  }, [orgSlug]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const base = { name: orgName.trim(), slug: orgSlug.trim(), owner_id: user.id } as const;
      if (!base.name || !base.slug) {
        setError('请输入组织名称/标识');
        setSubmitting(false);
        return;
      }
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .insert(base)
        .select('id')
        .limit(1);
      if (orgErr) throw orgErr;
      const orgId = orgs?.[0]?.id as string | undefined;
      if (!orgId) throw new Error('创建组织失败');
      // Ensure owner is a member for RLS-based queries
      await supabase.from('organization_members').insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      });
      // Optional: create a default group
      await supabase.from('groups').insert({
        organization_id: orgId,
        name: 'General',
        created_by: user.id,
      });
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? '创建组织失败');
    } finally {
      setSubmitting(false);
    }
  }, [orgName, orgSlug, router, user]);

  if (!session || loading || hasOrg === null) return null;
  if (hasOrg) return null;

  return (
    <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">欢迎，先创建你的组织</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">首次登录需要创建一个组织以继续使用后台。</p>
      <div className="flex flex-col gap-3">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">组织名称</label>
        <input className={inputClass} value={orgName} onChange={(e) => onNameChange(e.target.value)} placeholder="如：Acme 团队" />
        <label className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">组织标识（Slug）</label>
        <input className={inputClass} value={orgSlug} onChange={(e) => setOrgSlug(slugify(e.target.value))} placeholder="如：acme" />
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button disabled={submitting} className={buttonClass} onClick={handleSubmit}>
            {submitting ? '创建中…' : '创建组织'}
          </button>
        </div>
      </div>
    </div>
  );
}

