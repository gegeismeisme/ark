'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'sign-in' | 'sign-up';

const inputClass =
  'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600';
const buttonClass =
  'inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 active:translate-y-[1px] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200';
const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const resetFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetFeedback();
      setLoading(true);

      try {
        if (!email || !password) {
          throw new Error('请填写邮箱和密码');
        }

        if (mode === 'sign-in') {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          setMessage('登录成功');
        } else {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (signUpError) throw signUpError;
          if (data.user?.email_confirmed_at) {
            setMessage('注册成功，您已完成邮箱验证');
          } else {
            setMessage('注册成功，请查收邮箱完成验证');
          }
        }
      } catch (err) {
        const description =
          err instanceof Error ? err.message : '发生未知错误';
        setError(description);
      } finally {
        setLoading(false);
      }
    },
    [email, password, mode, resetFeedback]
  );

  const handlePasswordReset = useCallback(async () => {
    resetFeedback();
    setLoading(true);
    try {
      if (!email) {
        throw new Error('请输入邮箱以发送重置链接');
      }
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      if (resetError) throw resetError;
      setMessage('重置邮件已发送，请检查邮箱');
    } catch (err) {
      const description = err instanceof Error ? err.message : '发送失败';
      setError(description);
    } finally {
      setLoading(false);
    }
  }, [email, resetFeedback]);

  const handleSignOut = useCallback(async () => {
    resetFeedback();
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setMessage('您已安全退出');
      setEmail('');
      setPassword('');
    } catch (err) {
      const description =
        err instanceof Error ? err.message : '退出登录失败，请重试';
      setError(description);
    } finally {
      setLoading(false);
    }
  }, [resetFeedback]);

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-zinc-900/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow dark:bg-zinc-100 dark:text-zinc-900">
          Project Ark
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {session ? '欢迎回来' : '登录 Project Ark'}
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          使用工作邮箱登录以继续。注册后请检查邮箱完成验证。
        </p>
      </header>

      <div className="w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white/80 p-8 shadow-xl backdrop-blur-md transition dark:border-zinc-800/60 dark:bg-zinc-900/70">
        {session ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/60 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-100">
              <p className="font-medium">
                {session.user.email ?? '已认证用户'}
              </p>
              <p className="mt-1 text-xs">
                您已登录，可以继续访问受保护模块或退出登录。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className={buttonClass}
                onClick={handleSignOut}
                disabled={loading}
              >
                {loading ? '处理中…' : '退出登录'}
              </button>
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-200 px-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                会话 ID：{session.user.id.slice(0, 8)}…
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex gap-2 rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-300">
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === 'sign-in'
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100'
                    : ''
                }`}
                onClick={() => setMode('sign-in')}
              >
                登录
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === 'sign-up'
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100'
                    : ''
                }`}
                onClick={() => setMode('sign-up')}
              >
                注册
              </button>
            </div>

            <div className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span>邮箱</span>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span>密码</span>
                <input
                  className={inputClass}
                  type="password"
                  placeholder="至少 6 位字符"
                  autoComplete={
                    mode === 'sign-in' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/40 dark:text-red-200">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                {message}
              </p>
            ) : null}

            <div className="space-y-3">
              <button
                type="submit"
                className={`${buttonClass} w-full`}
                disabled={loading}
              >
                {loading
                  ? '处理中…'
                  : mode === 'sign-in'
                    ? '登录'
                    : '注册并发送验证邮件'}
              </button>

              <button
                type="button"
                className={`${secondaryButtonClass} w-full`}
                onClick={handlePasswordReset}
                disabled={loading}
              >
                忘记密码？发送重置邮件
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
