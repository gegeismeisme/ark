import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AuthActions,
  AuthCredentials,
  AuthErrorCode,
  AuthMessageCode,
  AuthResult,
} from './types';

export interface CreateAuthActionsOptions {
  passwordResetRedirectTo?: string;
}

interface CreateResultParams {
  success: boolean;
  message?: string;
  messageCode?: AuthMessageCode;
  error?: string;
  errorCode?: AuthErrorCode;
}

function createResult({
  success,
  message,
  messageCode,
  error,
  errorCode,
}: CreateResultParams): AuthResult {
  return { success, message, messageCode, error, errorCode };
}

function ensureCredentials({
  email,
  password,
}: AuthCredentials): AuthResult | null {
  if (!email?.trim() || !password?.trim()) {
    return createResult({
      success: false,
      errorCode: 'credentials-missing',
      error: 'Email and password are required.',
    });
  }

  return null;
}

export function createAuthActions(
  client: SupabaseClient,
  options: CreateAuthActionsOptions = {}
): AuthActions {
  const { passwordResetRedirectTo } = options;

  const signInWithPassword: AuthActions['signInWithPassword'] = async (
    credentials
  ) => {
    const credentialsCheck = ensureCredentials(credentials);
    if (credentialsCheck) return credentialsCheck;

    const { error } = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return createResult({
        success: false,
        errorCode: 'sign-in-failed',
        error: error.message,
      });
    }

    return createResult({
      success: true,
      messageCode: 'sign-in-success',
      message: 'Signed in successfully.',
    });
  };

  const signUpWithPassword: AuthActions['signUpWithPassword'] = async (
    credentials
  ) => {
    const credentialsCheck = ensureCredentials(credentials);
    if (credentialsCheck) return credentialsCheck;

    const { data, error } = await client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return createResult({
        success: false,
        errorCode: 'sign-up-failed',
        error: error.message,
      });
    }

    const confirmed = Boolean(data.user?.email_confirmed_at);

    return createResult({
      success: true,
      messageCode: confirmed ? 'sign-up-complete' : 'sign-up-confirm-email',
      message: confirmed
        ? 'Sign up complete. Your email is verified.'
        : 'Sign up successful. Please confirm via the email we sent you.',
    });
  };

  const resetPassword: AuthActions['resetPassword'] = async (email) => {
    if (!email?.trim()) {
      return createResult({
        success: false,
        errorCode: 'password-reset-email-required',
        error: 'Email is required to send a reset link.',
      });
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectTo,
    });

    if (error) {
      return createResult({
        success: false,
        errorCode: 'password-reset-failed',
        error: error.message,
      });
    }

    return createResult({
      success: true,
      messageCode: 'password-reset-sent',
      message: 'Password reset email sent.',
    });
  };

  const signOut: AuthActions['signOut'] = async () => {
    const { error } = await client.auth.signOut();

    if (error) {
      return createResult({
        success: false,
        errorCode: 'sign-out-failed',
        error: error.message,
      });
    }

    return createResult({
      success: true,
      messageCode: 'sign-out-success',
      message: 'Signed out successfully.',
    });
  };

  return {
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
  };
}
