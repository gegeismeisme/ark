'use client';

import { useEffect, useState } from 'react';
import { useSupabaseAuthState } from '@project-ark/shared';
import { supabase } from '@/lib/supabaseClient';

type Group = { id: string; name: string; created_at: string };

export default function GroupsPage() {
  const { user } = useSupabaseAuthState({ client: supabase });
  const [orgId, setOrgId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        const { data: owned } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);
        setOrgId(owned?.[0]?.id ?? null);
      } else {
        const id = data?.[0]?.organization_id ?? null;
        setOrgId(id);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function refresh() {
    if (!orgId) return;
    const { data } = await supabase
      .from('groups')
      .select('id, name, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    setGroups((data as Group[]) ?? []);
  }

  useEffect(() => {
    refresh();
  }, [orgId]);

  async function onCreate() {
    if (!orgId || !user) return;
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from('groups').insert({
      organization_id: orgId,
      name: trimmed,
      created_by: user.id,
    });
    if (error) setError(error.message);
    setName('');
    await refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Groups</h1>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200">{error}</div>
      ) : null}
      {!orgId ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">No organization detected.</div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New group name"
              className="flex h-10 w-64 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            />
            <button onClick={onCreate} className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              Create
            </button>
          </div>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-zinc-500">{g.id.slice(0, 8)}…</span>
                </div>
                <span className="text-xs text-zinc-500">{new Date(g.created_at).toLocaleString()}</span>
              </li>
            ))}
            {groups.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">No groups yet.</li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}

