import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAuthActions } from './actions';

type StubAuth = {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

function createStubClient(overrides?: Partial<StubAuth>): SupabaseClient {
  const auth: StubAuth = {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { email_confirmed_at: '2024-01-01T00:00:00Z' } },
      error: null,
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };

  return { auth } as unknown as SupabaseClient;
}

describe('createAuthActions', () => {
  const email = 'user@example.com';
  const password = 'password123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error when credentials are missing', async () => {
    const actions = createAuthActions(createStubClient());

    const result = await actions.signInWithPassword({ email: '', password: '' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('credentials-missing');
  });

  it('signs in successfully with valid credentials', async () => {
    const client = createStubClient();
    const actions = createAuthActions(client);

    const result = await actions.signInWithPassword({ email, password });

    expect(result.success).toBe(true);
    expect(result.messageCode).toBe('sign-in-success');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email, password });
  });

  it('returns error when sign in fails', async () => {
    const client = createStubClient({
      signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid login' } }),
    });
    const actions = createAuthActions(client);

    const result = await actions.signInWithPassword({ email, password });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('sign-in-failed');
    expect(result.error).toBe('Invalid login');
  });

  it('sends password reset email when address provided', async () => {
    const client = createStubClient();
    const actions = createAuthActions(client, { passwordResetRedirectTo: 'https://example.com/reset' });

    const result = await actions.resetPassword(email);

    expect(result.success).toBe(true);
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: 'https://example.com/reset',
    });
  });

  it('rejects password reset without email', async () => {
    const actions = createAuthActions(createStubClient());

    const result = await actions.resetPassword('');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('password-reset-email-required');
  });
});
