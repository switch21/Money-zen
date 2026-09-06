/**
 * Money-zen — AuthService (auth Supabase).
 *
 * Email + password (le + simple,universel). Magic link/OAuth en V2.
 *
 * Fonctions :
 *   - signUp(email, password) → crée un user dans Supabase Auth
 *   - signIn(email, password) → session persistée dans SecureStore
 *   - signOut() → clear session
 *   - getCurrentUser() → user courant ou null
 *   - refreshSession() → rafraîchit le token
 *
 * Spec section 37 : Supabase Auth.
 */
import type { Session, User } from '@supabase/supabase-js';

import { getSupabase, getSupabaseOrNull, isSupabaseEnabled } from './supabaseClient';
import { MoneyZenError } from '@types/index';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export const AuthService = {
  /** True si Supabase Auth est disponible. */
  isAuthEnabled(): boolean {
    return isSupabaseEnabled();
  },

  async signUp(email: string, password: string): Promise<AuthResult> {
    if (!this.isAuthEnabled()) {
      throw new MoneyZenError('UNKNOWN', 'Supabase n\'est pas configuré.');
    }
    if (password.length < 6) {
      throw new MoneyZenError('PIN_INVALID', 'Mot de passe : 6 caractères minimum.');
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new MoneyZenError('UNKNOWN', error.message, error);
    }
    return { user: data.user, session: data.session };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!this.isAuthEnabled()) {
      throw new MoneyZenError('UNKNOWN', 'Supabase n\'est pas configuré.');
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new MoneyZenError('UNKNOWN', error.message, error);
    }
    return { user: data.user, session: data.session };
  },

  async signInWithMagicLink(email: string): Promise<void> {
    if (!this.isAuthEnabled()) return;
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new MoneyZenError('UNKNOWN', error.message, error);
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseOrNull();
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabaseOrNull();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  async getCurrentSession(): Promise<Session | null> {
    const supabase = getSupabaseOrNull();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Écoute les changements de session (login / logout / refresh). */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const supabase = getSupabaseOrNull();
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  },

  async refreshSession(): Promise<void> {
    const supabase = getSupabaseOrNull();
    if (!supabase) return;
    await supabase.auth.refreshSession();
  },

  /** Envoie un email de reset password. */
  async resetPassword(email: string): Promise<void> {
    if (!this.isAuthEnabled()) return;
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new MoneyZenError('UNKNOWN', error.message, error);
  },
};
