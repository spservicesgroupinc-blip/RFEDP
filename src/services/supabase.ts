/**
 * Supabase Authentication Service
 * Handles user authentication, signup, and crew PIN verification
 */

import { createClient } from '@supabase/supabase-js';
import type { User, Session, AuthError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'admin' | 'crew';

export interface Profile {
  id: string;
  company_id: string;
  role: UserRole;
  crew_pin: string | null;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  error: AuthError | null;
}

export interface SignupParams {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface CrewLoginParams {
  email: string;
  pin: string;
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Sign up a new admin user and create their company
 */
export async function signupUser(params: SignupParams): Promise<AuthResult> {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Step 2: Create company
    const { data: companyData, error: companyError } = await supabase.rpc(
      'create_new_company',
      { p_company_name: params.companyName }
    );

    if (companyError) throw companyError;
    if (!companyData) throw new Error('Company creation failed');

    // Step 3: Create user profile linked to company
    const { error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: authData.user.id,
      p_company_id: companyData,
      p_role: 'admin',
      p_full_name: params.fullName,
      p_email: params.email,
      p_crew_pin: null,
    });

    if (profileError) throw profileError;

    // Step 4: Fetch the created profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return {
      user: authData.user,
      session: authData.session,
      profile: profile as Profile,
      error: null,
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      user: null,
      session: null,
      profile: null,
      error: error as AuthError,
    };
  }
}

/**
 * Login with email and password
 */
export async function loginUser(params: LoginParams): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) throw error;

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      user: data.user,
      session: data.session,
      profile: profile as Profile,
      error: null,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      user: null,
      session: null,
      profile: null,
      error: error as AuthError,
    };
  }
}

/**
 * Login crew member with email and PIN
 * This verifies credentials and then checks the PIN
 */
export async function loginCrew(params: CrewLoginParams): Promise<AuthResult> {
  try {
    // First, verify the PIN using our RPC function
    const { data: pinData, error: pinError } = await supabase.rpc(
      'verify_crew_pin',
      { p_email: params.email, p_pin: params.pin }
    );

    if (pinError) throw pinError;
    if (!pinData || pinData.length === 0) {
      throw new Error('Invalid email or PIN');
    }

    const crewMember = pinData[0];

    // Now sign in with password (crew members should have a default password)
    // For crew PIN-only login, we might use a different flow
    // This assumes crew has a standard password or uses magic link
    
    // Alternative: Use magic link or OTP for crew
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.pin, // Use PIN as password for simplicity
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
      profile: crewMember as Profile,
      error: null,
    };
  } catch (error) {
    console.error('Crew login error:', error);
    return {
      user: null,
      session: null,
      profile: null,
      error: error as AuthError,
    };
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session and profile
 */
export async function getCurrentSession(): Promise<AuthResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session) {
      return { user: null, session: null, profile: null, error: null };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: session.user,
      session,
      profile: profile as Profile,
      error: null,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return {
      user: null,
      session: null,
      profile: null,
      error: error as AuthError,
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'email'>>
): Promise<{ profile: Profile | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { profile: data as Profile, error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return { profile: null, error: error as AuthError };
  }
}

/**
 * Change password
 */
export async function changePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Reset password (sends email)
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { error };
}

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role === 'admin';
}

/**
 * Check if current user is crew
 */
export async function isCrew(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role === 'crew';
}

/**
 * Get current user's company ID
 */
export async function getCurrentCompanyId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  return profile?.company_id || null;
}
