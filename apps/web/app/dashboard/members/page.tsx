'use client';

import { useEffect, useState } from 'react';
import { useSupabaseAuthState } from '@project-ark/shared';
import { supabase } from '@/lib/supabaseClient';

type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  invited_at: string | null;
};

export default function MembersPage() {
  const { user } = useSupabaseAuthState({ client: supabase });
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
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
        setOrgId(data?.[0]?.organization_id ?? null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, joined_at, invited_at')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: false });
      if (!mounted) return;
      if (error) setError(error.message);
      setMembers((data ?? []) as Member[]);
    })();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Members</h1>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200">{error}</div>
      ) : null}
      {!orgId ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">No organization detected.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2 font-mono text-xs">{m.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-2">{m.role}</td>
                  <td className="px-4 py-2">{m.status}</td>
                  <td className="px-4 py-2">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

