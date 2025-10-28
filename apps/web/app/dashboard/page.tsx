'use client';

import { useEffect, useState } from 'react';
import { useSupabaseAuthState } from '@project-ark/shared';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function DashboardHome() {
  const { user } = useSupabaseAuthState({ client: supabase });
  const [orgId, setOrgId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {orgId ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>Active organization: {orgId.slice(0, 8)}…</div>
          <div className="mt-2 flex gap-3">
            <Link href="/dashboard/members" className="text-zinc-900 underline dark:text-zinc-100">
              Manage members
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">No organization detected. Use the homepage prompt to create one.</div>
      )}
    </div>
  );
}

