import type { Session, User } from '@supabase/supabase-js';

export type AuthUser = User;

export interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export type AuthMessageCode =
  | 'sign-in-success'
  | 'sign-up-confirm-email'
  | 'sign-up-complete'
  | 'password-reset-sent'
  | 'sign-out-success';

export type AuthErrorCode =
  | 'credentials-missing'
  | 'password-reset-email-required'
  | 'sign-in-failed'
  | 'sign-up-failed'
  | 'password-reset-failed'
  | 'sign-out-failed';

export interface AuthResult {
  success: boolean;
  message?: string;
  messageCode?: AuthMessageCode;
  error?: string;
  errorCode?: AuthErrorCode;
}

export interface AuthActions {
  signInWithPassword: (credentials: AuthCredentials) => Promise<AuthResult>;
  signUpWithPassword: (credentials: AuthCredentials) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}
