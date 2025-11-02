'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSupabaseAuthState } from '@project-ark/shared';

import {
  PaginationControls,
  usePagination,
} from '../dashboard/components/pagination';
import { supabase } from '../../lib/supabaseClient';

type OrgVisibility = 'public' | 'private';

type DirectoryOrganization = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  visibility: OrgVisibility;
};

type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type JoinRequest = {
  id: string;
  organizationId: string;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  responseNote: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  visibility: OrgVisibility;
};

type JoinRequestRow = {
  id: string;
  organization_id: string;
  status: JoinRequestStatus;
  message: string | null;
  created_at: string;
  reviewed_at: string | null;
  response_note: string | null;
};

const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已撤销',
};

export default function OrganizationsPage() {
  const { user, loading: authLoading } = useSupabaseAuthState({ client: supabase });

  const [organizations, setOrganizations] = useState<DirectoryOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [submittingOrgId, setSubmittingOrgId] = useState<string | null>(null);
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('organizations')
      .select('id, name, description, created_at, visibility')
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (queryError) {
      setOrganizations([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map(
        (row: OrganizationRow): DirectoryOrganization => ({
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          visibility: row.visibility,
        }),
      ) ?? [];

    setOrganizations(mapped);
    setLoading(false);
  }, []);

  const fetchJoinRequests = useCallback(async () => {
    if (!user) {
      setJoinRequests([]);
      return;
    }

    setRequestsLoading(true);
    setRequestError(null);

    const { data, error: queryError } = await supabase
      .from('organization_join_requests')
      .select('id, organization_id, status, message, created_at, reviewed_at, response_note')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (queryError) {
      setJoinRequests([]);
      setRequestError(queryError.message);
      setRequestsLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map(
        (row: JoinRequestRow): JoinRequest => ({
          id: row.id,
          organizationId: row.organization_id,
          status: row.status,
          message: row.message,
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          responseNote: row.response_note,
        }),
      ) ?? [];

    setJoinRequests(mapped);
    setRequestsLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    void fetchJoinRequests();
  }, [fetchJoinRequests]);

  const joinRequestsByOrg = useMemo(() => {
    const map = new Map<string, JoinRequest>();
    joinRequests.forEach((req) => map.set(req.organizationId, req));
    return map;
  }, [joinRequests]);

  const filteredOrganizations = useMemo(() => {
    if (!searchTerm.trim()) return organizations;
    const keyword = searchTerm.trim().toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(keyword) ||
        (org.description ?? '').toLowerCase().includes(keyword),
    );
  }, [organizations, searchTerm]);

  const pagination = usePagination(filteredOrganizations, { pageSize: 10 });

  const handleSubmitRequest = useCallback(
    async (organizationId: string) => {
      if (!user) return;

      setSubmittingOrgId(organizationId);
      const message = requestNotes[organizationId]?.trim() || null;

      const { error: submitError } = await supabase.from('organization_join_requests').insert({
        organization_id: organizationId,
        user_id: user.id,
        message,
        status: 'pending',
      });

      if (submitError) {
        setRequestError(submitError.message);
        setSubmittingOrgId(null);
        return;
      }

      await fetchJoinRequests();
      setSubmittingOrgId(null);
    },
    [fetchJoinRequests, requestNotes, user],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">公开组织目录</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          浏览公开组织，提交加入申请或查看当前审批状态。创建个人组织请前往控制台。
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <input
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          placeholder="搜索组织名称或关键字"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {requestError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {requestError}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          正在加载组织列表...
        </div>
      ) : pagination.totalItems === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          暂无符合条件的公开组织。
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.paginatedItems.map((organization) => {
            const request = joinRequestsByOrg.get(organization.id) ?? null;
            const noteValue = requestNotes[organization.id] ?? '';

            return (
              <div
                key={organization.id}
                className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {organization.name}
                    </h2>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      创建于 {new Date(organization.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {organization.description ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {organization.description}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">该组织暂未填写简介。</p>
                  )}
                </div>

                <div className="w-full max-w-sm border-t border-zinc-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 dark:border-zinc-800">
                  {authLoading ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">正在确认登录状态...</p>
                  ) : !user ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        登录后可以申请加入此组织。
                      </p>
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        href="/auth/login"
                      >
                        登录
                      </Link>
                    </div>
                  ) : request ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center rounded-full bg-zinc-900/5 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                        {REQUEST_STATUS_LABELS[request.status]}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        提交于 {new Date(request.createdAt).toLocaleString('zh-CN')}
                      </p>
                      {request.responseNote ? (
                        <div className="rounded-md bg-zinc-900/5 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-100/10 dark:text-zinc-200">
                          管理员备注：{request.responseNote}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        申请说明（可选）
                        <textarea
                          className="min-h-[72px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                          placeholder="简要说明加入原因或补充信息"
                          value={noteValue}
                          onChange={(event) =>
                            setRequestNotes((prev) => ({
                              ...prev,
                              [organization.id]: event.target.value,
                            }))
                          }
                          disabled={submittingOrgId === organization.id || requestsLoading}
                        />
                      </label>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400/60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        onClick={() => void handleSubmitRequest(organization.id)}
                        disabled={submittingOrgId === organization.id}
                      >
                        {submittingOrgId === organization.id ? '提交中...' : '申请加入'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <PaginationControls
              page={pagination.page}
              pageCount={pagination.pageCount}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setPage}
              pageSize={pagination.pageSize}
              onPageSizeChange={pagination.setPageSize}
              label="个组织"
            />
          </div>
        </div>
      )}
    </div>
  );
}
