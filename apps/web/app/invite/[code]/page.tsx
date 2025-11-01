'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSupabaseAuthState } from '@project-ark/shared';

import { supabase } from '../../../lib/supabaseClient';

type InvitePageProps = {
  params: {
    code: string;
  };
};

type RedemptionState = 'idle' | 'processing' | 'success' | 'error';

export default function InvitePage({ params }: InvitePageProps) {
  const { user, loading: authLoading } = useSupabaseAuthState({ client: supabase });
  const [state, setState] = useState<RedemptionState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const { code } = params;

  const handleRedeem = useCallback(async () => {
    if (!user) return;
    if (!code) {
      setMessage('无效的邀请码链接。');
      setState('error');
      return;
    }

    setState('processing');
    setMessage(null);

    const { data, error } = await supabase.rpc('redeem_org_invite', {
      p_code: code,
    });

    if (error) {
      setState('error');
      setMessage(error.message);
      return;
    }

    const organizationId =
      Array.isArray(data) && data[0]?.organization_id ? data[0].organization_id : null;

    setState('success');
    setMessage(
      organizationId
        ? '邀请已受理，您现在是组织成员。稍后可在后台切换至该组织。'
        : '邀请已受理。'
    );
  }, [code, user]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">组织邀请</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          使用此邀请码加入组织：
          <span className="font-mono">{code}</span>
        </p>
      </div>

      {authLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在确认登录状态…
        </div>
      ) : !user ? (
        <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          <p>请先登录后再领取邀请。</p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            href={`/auth/login?redirect=/invite/${code}`}
          >
            前往登录
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            点击下方按钮即可领取邀请并加入对应组织。
          </p>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-400"
            onClick={() => void handleRedeem()}
            disabled={state === 'processing'}
          >
            {state === 'processing' ? '处理中…' : '领取邀请'}
          </button>
          {message ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                state === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                  : 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
              }`}
            >
              {message}
            </div>
          ) : null}
          {state === 'success' ? (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              href="/dashboard"
            >
              返回控制台
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
