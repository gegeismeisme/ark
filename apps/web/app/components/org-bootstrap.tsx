'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuthState } from "@project-ark/shared";

import { useTranslations } from "@/lib/i18n/client";
import { supabase } from "../../lib/supabaseClient";

const inputClass =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 active:translate-y-[1px] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

const DUPLICATE_SLUG_ERROR_KEY = "orgBootstrap.errorDuplicateSlug";
const GENERIC_ERROR_KEY = "orgBootstrap.errorGeneric";
const MISSING_FIELDS_KEY = "orgBootstrap.errorMissingFields";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function OrgBootstrap() {
  const router = useRouter();
  const t = useTranslations();
  const { session, user, loading } = useSupabaseAuthState({ client: supabase });

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
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
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!active) return;

      if (membershipError) {
        setError(membershipError.message ?? t(GENERIC_ERROR_KEY));
        setHasOrg(false);
        return;
      }

      if (memberships && memberships.length > 0) {
        setHasOrg(true);
        return;
      }

      const { data: owned, error: ownedError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      if (!active) return;

      if (ownedError) {
        setError(ownedError.message ?? t(GENERIC_ERROR_KEY));
        setHasOrg(false);
        return;
      }

      setHasOrg(Boolean(owned && owned.length > 0));
    })();

    return () => {
      active = false;
    };
  }, [t, user]);

  useEffect(() => {
    if (session && hasOrg) {
      router.push("/dashboard");
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
    [orgSlug],
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
      setError(t(MISSING_FIELDS_KEY));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "bootstrap_organization",
        {
          p_name: name,
          p_slug: slug,
          p_owner: user.id,
        },
      );

      if (rpcError) {
        const message = rpcError.message ?? t(GENERIC_ERROR_KEY);
        if (
          rpcError.message?.includes("organizations_slug_key") ||
          rpcError.message?.toLowerCase().includes("duplicate key value")
        ) {
          setError(t(DUPLICATE_SLUG_ERROR_KEY));
        } else {
          setError(message);
        }
        return;
      }

      const orgId = data?.[0]?.organization_id;
      if (!orgId) {
        setError(t(GENERIC_ERROR_KEY));
        return;
      }

      setHasOrg(true);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || t(GENERIC_ERROR_KEY));
      } else {
        setError(t(GENERIC_ERROR_KEY));
      }
    } finally {
      setSubmitting(false);
    }
  }, [orgName, orgSlug, router, submitting, t, user]);

  if (!session || loading || hasOrg === null) return null;
  if (hasOrg) return null;

  return (
    <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {t("orgBootstrap.title")}
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {t("orgBootstrap.subtitle")}
      </p>
      <div className="flex flex-col gap-3">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">
          {t("orgBootstrap.nameLabel")}
        </label>
        <input
          className={inputClass}
          value={orgName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("orgBootstrap.namePlaceholder")}
        />
        <label className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {t("orgBootstrap.slugLabel")}
        </label>
        <input
          className={inputClass}
          value={orgSlug}
          onChange={(event) => onSlugChange(event.target.value)}
          placeholder={t("orgBootstrap.slugPlaceholder")}
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
            className={primaryButtonClass}
            onClick={handleSubmit}
          >
            {submitting ? t("orgBootstrap.creating") : t("orgBootstrap.createButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
