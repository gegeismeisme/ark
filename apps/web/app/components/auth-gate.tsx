'use client';

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  createAuthActions,
  useSupabaseAuthState,
  type AuthErrorCode,
  type AuthMessageCode,
} from "@project-ark/shared";

import type { Translator } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n/client";
import { supabase } from "../../lib/supabaseClient";
import { OrgBootstrap } from "./org-bootstrap";

type AuthMode = "sign-in" | "sign-up";

const inputClass =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 active:translate-y-[1px] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const MESSAGE_KEY_MAP: Record<AuthMessageCode, string> = {
  "sign-in-success": "app.message.signInSuccess",
  "sign-up-confirm-email": "app.message.signUpVerifyEmail",
  "sign-up-complete": "app.message.signUpComplete",
  "password-reset-sent": "app.message.passwordResetSent",
  "sign-out-success": "app.message.signOutSuccess",
};

const ERROR_KEY_MAP: Record<AuthErrorCode, string> = {
  "credentials-missing": "app.error.credentialsMissing",
  "password-reset-email-required": "app.error.passwordResetEmailRequired",
  "sign-in-failed": "app.error.signInFailed",
  "sign-up-failed": "app.error.signUpFailed",
  "password-reset-failed": "app.error.passwordResetFailed",
  "sign-out-failed": "app.error.signOutFailed",
};

const translateMessage = (
  translator: Translator,
  code?: AuthMessageCode,
  fallback?: string | null,
): string => {
  if (code) {
    const key = MESSAGE_KEY_MAP[code];
    if (key) {
      return translator(key);
    }
  }

  return fallback ?? translator("app.alert.genericSuccess");
};

const translateError = (
  translator: Translator,
  code?: AuthErrorCode,
  fallback?: string | null,
): string => {
  if (code) {
    const key = ERROR_KEY_MAP[code];
    if (key) {
      return translator(key);
    }
  }

  return fallback ?? translator("app.alert.genericError");
};

const SESSION_ID_LENGTH = 8;

export function AuthGate() {
  const router = useRouter();
  const t = useTranslations();
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(
    () =>
      createAuthActions(supabase, {
        passwordResetRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      }),
    [],
  );

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetFeedback();
      setSubmitting(true);

      const credentials = { email, password };
      const result =
        mode === "sign-in"
          ? await authActions.signInWithPassword(credentials)
          : await authActions.signUpWithPassword(credentials);

      setSubmitting(false);

      if (result.success) {
        setPassword("");
        if (mode === "sign-up") {
          setMode("sign-in");
        }
        setMessage(translateMessage(t, result.messageCode, result.message));
      } else {
        setError(translateError(t, result.errorCode, result.error));
      }
    },
    [authActions, email, mode, password, resetFeedback, t],
  );

  const handlePasswordReset = useCallback(async () => {
    resetFeedback();
    setSubmitting(true);

    const result = await authActions.resetPassword(email);
    setSubmitting(false);

    if (result.success) {
      setMessage(translateMessage(t, result.messageCode, result.message));
    } else {
      setError(translateError(t, result.errorCode, result.error));
    }
  }, [authActions, email, resetFeedback, t]);

  const handleSignOut = useCallback(async () => {
    resetFeedback();
    setSubmitting(true);

    const result = await authActions.signOut();
    setSubmitting(false);

    if (result.success) {
      setMessage(translateMessage(t, result.messageCode, result.message));
    } else {
      setError(translateError(t, result.errorCode, result.error));
    }
  }, [authActions, resetFeedback, t]);

  const session = authState.session;
  const busy = submitting;
  const authError = error ?? authState.error;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-2xl shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/40">
      <div className="space-y-3 text-start">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {session ? t("auth.headingSignedIn") : t("app.login.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {session ? t("auth.signedInSubtitle") : t("app.login.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 shadow-inner shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/50">
        {session ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.email ?? t("auth.signedInEmailFallback")}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {t("auth.signedInHint")}
              </p>
            </div>

            {authError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/40 dark:text-red-200">
                {authError}
              </p>
            ) : null}

            {message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                {message}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={handleSignOut}
                disabled={busy}
              >
                {busy ? t("common.processing") : t("session.signOut")}
              </button>
              <button
                type="button"
                className={`${secondaryButtonClass} w-full sm:flex-1`}
                onClick={() => router.push("/dashboard")}
              >
                {t("auth.openConsole")}
              </button>
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-200 px-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {t("auth.sessionIdLabel", {
                  id: session.user.id.slice(0, SESSION_ID_LENGTH),
                })}
              </div>
            </div>

            <OrgBootstrap />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex gap-2 rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-300">
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "sign-in"
                    ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100"
                    : ""
                }`}
                onClick={() => {
                  resetFeedback();
                  setMode("sign-in");
                }}
              >
                {t("auth.signIn")}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "sign-up"
                    ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100"
                    : ""
                }`}
                onClick={() => {
                  resetFeedback();
                  setMode("sign-up");
                }}
              >
                {t("auth.signUp")}
              </button>
            </div>

            <div className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span>{t("auth.emailLabel")}</span>
                <input
                  className={inputClass}
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    resetFeedback();
                    setEmail(event.target.value);
                  }}
                  disabled={busy}
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span>{t("auth.passwordLabel")}</span>
                <input
                  className={inputClass}
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => {
                    resetFeedback();
                    setPassword(event.target.value);
                  }}
                  disabled={busy}
                />
              </label>
            </div>

            {authError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/40 dark:text-red-200">
                {authError}
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
                className={`${primaryButtonClass} w-full`}
                disabled={busy}
              >
                {busy
                  ? t("common.processing")
                  : mode === "sign-in"
                  ? t("auth.submitSignIn")
                  : t("auth.submitSignUpConfirm")}
              </button>

              <button
                type="button"
                className={`${secondaryButtonClass} w-full`}
                onClick={handlePasswordReset}
                disabled={busy}
              >
                {t("auth.resetCta")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
