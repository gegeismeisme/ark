import type { Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n';
import type { JoinRequestRow } from '../../types';
import { loadJoinRequestsImpl, redeemInviteImpl } from './useInvites';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../../lib/supabaseClient';

const supabaseMock = vi.mocked(supabase);

const buildJoinRequestRow = (overrides: Partial<JoinRequestRow> = {}): JoinRequestRow => ({
  id: 'request-1',
  organization_id: 'org-1',
  status: 'pending',
  message: 'hello',
  created_at: '2024-01-01T00:00:00.000Z',
  reviewed_at: null,
  response_note: null,
  organizations: { id: 'org-1', name: 'My Org' },
  ...overrides,
});

const session = { user: { id: 'user-1' } } as Session;

const rpcSuccess = (data: unknown) =>
  ({
    data,
    error: null,
    status: 200,
    statusText: 'OK',
    count: null,
  } as const);

const rpcError = (message: string) =>
  ({
    data: null,
    error: { message, details: null, hint: null, code: 'rpc', name: 'PostgrestError' },
    status: 400,
    statusText: 'Bad Request',
    count: null,
  } as const);

describe('useInvites helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips loading when session is missing', async () => {
    const deps = {
      session: null,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      setJoinRequests: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    };

    await loadJoinRequestsImpl(deps);

    expect(deps.setJoinRequests).toHaveBeenCalledWith([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('loads join requests from Supabase', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [buildJoinRequestRow()], error: null }),
    };
    supabaseMock.from.mockReturnValue(builder as never);
    const deps = {
      session,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      setJoinRequests: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    };

    await loadJoinRequestsImpl(deps);

    expect(deps.setJoinRequests).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'request-1', organizationName: 'My Org' })])
    );
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('records Supabase errors when loading join requests fails', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    };
    supabaseMock.from.mockReturnValue(builder as never);
    const deps = {
      session,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      setJoinRequests: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    };

    await loadJoinRequestsImpl(deps);

    expect(deps.setError).toHaveBeenCalledWith('boom');
    expect(deps.setJoinRequests).toHaveBeenCalledWith([]);
  });

  it('validates redeem code before calling Supabase', async () => {
    const deps = {
      session,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      redeemCode: '   ',
      setRedeemCode: vi.fn(),
      setRedeemLoading: vi.fn(),
      setRedeemMessage: vi.fn(),
      setRedeemError: vi.fn(),
      reloadRequests: vi.fn(),
    };

    await redeemInviteImpl(deps);

    expect(deps.setRedeemError).toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('redeems invite codes and reloads requests', async () => {
    supabaseMock.rpc.mockResolvedValue(rpcSuccess([{ organization_id: 'org-1' }]) as never);
    const deps = {
      session,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      redeemCode: ' INVITE ',
      setRedeemCode: vi.fn(),
      setRedeemLoading: vi.fn(),
      setRedeemMessage: vi.fn(),
      setRedeemError: vi.fn(),
      reloadRequests: vi.fn(),
    };

    await redeemInviteImpl(deps);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('redeem_org_invite', { p_code: 'INVITE' });
    expect(deps.setRedeemMessage).toHaveBeenCalledWith(t('invite.success.joined'));
    expect(deps.reloadRequests).toHaveBeenCalled();
    expect(deps.setRedeemCode).toHaveBeenCalledWith('');
  });

  it('handles RPC errors during redeem', async () => {
    supabaseMock.rpc.mockResolvedValue(rpcError('fail') as never);
    const deps = {
      session,
      supabaseClient: supabaseMock as unknown as typeof supabase,
      redeemCode: 'code',
      setRedeemCode: vi.fn(),
      setRedeemLoading: vi.fn(),
      setRedeemMessage: vi.fn(),
      setRedeemError: vi.fn(),
      reloadRequests: vi.fn(),
    };

    await redeemInviteImpl(deps);

    expect(deps.setRedeemError).toHaveBeenCalledWith('fail');
    expect(deps.reloadRequests).not.toHaveBeenCalled();
  });
});
