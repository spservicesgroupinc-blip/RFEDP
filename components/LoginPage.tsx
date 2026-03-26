
import React, { useState } from 'react';
import { User, Lock, Building2, ArrowRight, Loader2, AlertCircle, Download, Mail, CheckCircle, UserCircle } from 'lucide-react';
import { UserSession } from '../types';
import { supabase, getProfileAndCompany } from '../services/supabase';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  installPrompt: any;
  onInstall: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, installPrompt, onInstall }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'check_email'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailAddress, setCheckEmailAddress] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  });

  const handleSignup = async () => {
    if (!formData.companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    if (!formData.fullName.trim()) {
      setError('Your name is required.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!supabase) throw new Error('Supabase not configured.');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.username,
      password: formData.password,
      options: {
        data: {
          role: 'admin',
          company_name: formData.companyName.trim(),
          full_name: formData.fullName.trim(),
        },
      },
    });

    if (signUpError) throw signUpError;
    if (!data.user) throw new Error('Signup failed — no user returned.');

    // Email confirmation is required (Supabase default): session is null.
    // Show "check your email" screen and do NOT log the user in yet.
    if (!data.session) {
      setCheckEmailAddress(formData.username);
      setMode('check_email');
      return;
    }

    // Email confirmation is disabled: session is available immediately.
    // Poll for the profile/company rows created by the DB trigger.
    let result = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(r => setTimeout(r, 500));
      result = await getProfileAndCompany(data.user.id);
      if (result) break;
    }
    if (!result) throw new Error('Account setup failed. Profile was not created. Please contact support.');

    onLoginSuccess({
      username: data.user.email || formData.username,
      companyName: result.company.name,
      companyId: result.profile.company_id,
      spreadsheetId: '',
      role: result.profile.role,
      token: data.session.access_token,
    });
  };

  const handleLogin = async () => {
    if (!supabase) throw new Error('Supabase not configured.');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.username,
      password: formData.password,
    });

    if (signInError) throw signInError;
    if (!data.user) throw new Error('Login failed.');

    const result = await getProfileAndCompany(data.user.id);
    if (!result) throw new Error('Account setup incomplete. Please contact support.');

    onLoginSuccess({
      username: data.user.email || formData.username,
      companyName: result.company.name,
      companyId: result.profile.company_id,
      spreadsheetId: '',
      role: result.profile.role,
      token: data.session.access_token,
    });
  };

  const handleForgotPassword = async () => {
    if (!supabase) throw new Error('Supabase not configured.');
    if (!formData.username.trim()) {
      setError('Enter your email address above first.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      formData.username.trim(),
      { redirectTo: `${window.location.origin}/` }
    );

    if (resetError) throw resetError;

    setCheckEmailAddress(formData.username.trim());
    setMode('check_email');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!supabase) {
        setError('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
        return;
      }
      if (mode === 'signup') await handleSignup();
      else if (mode === 'login') await handleLogin();
      else if (mode === 'forgot') await handleForgotPassword();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next);
    setError(null);
  };

  // ── Check-your-email screen ──────────────────────────────────────────────
  if (mode === 'check_email') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
            <Logo />
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand via-slate-900 to-slate-900" />
          </div>
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Check Your Email</h2>
            <p className="text-slate-500 text-sm mb-6">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-slate-700">{checkEmailAddress}</span>.
              Click the link in the email to activate your account, then come back and log in.
            </p>
            <button
              onClick={() => switchMode('login')}
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
            >
              Back to Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main auth form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300 relative">

        {/* PWA Install Banner */}
        {installPrompt && (
          <button
            onClick={onInstall}
            className="w-full bg-emerald-600 text-white py-2 px-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Install Desktop/Mobile App
          </button>
        )}

        {/* Header */}
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          <div className="relative z-10">
            <Logo />
          </div>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand via-slate-900 to-slate-900" />
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {mode === 'signup' ? 'Create Company Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Signup-only: Company Name */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="Acme Insulation"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Signup-only: Full Name */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Your Name</label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="Jane Smith"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                {mode === 'signup' ? 'Admin Email' : 'Email'}
              </label>
              <div className="relative">
                {mode === 'signup' ? (
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                ) : (
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                )}
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                  placeholder="admin@company.com"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            {/* Password (login + signup) */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Signup-only: Confirm Password */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signup' ? 'Creating Account...' : mode === 'forgot' ? 'Sending Link...' : 'Logging In...'}
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Login'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 flex flex-col items-center gap-2">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-slate-400 hover:text-brand font-medium transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-sm text-slate-500 hover:text-brand font-medium transition-colors"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-slate-500 hover:text-brand font-medium transition-colors"
              >
                Already have an account? Login
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-slate-500 hover:text-brand font-medium transition-colors"
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Logo: React.FC = () => (
  <div className="flex flex-col items-center justify-center select-none">
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-brand text-white px-2 py-0.5 -skew-x-12 transform origin-bottom-left shadow-sm flex items-center justify-center">
        <span className="skew-x-12 font-black text-3xl tracking-tighter">RFE</span>
      </div>
      <span className="text-3xl font-black italic tracking-tighter text-white leading-none">RFE</span>
    </div>
    <span className="text-[0.6rem] font-bold tracking-[0.2em] text-brand-yellow bg-black px-2 py-0.5 leading-none">
      FOAM EQUIPMENT
    </span>
    <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">Professional Estimation Suite</p>
  </div>
);

export default LoginPage;
