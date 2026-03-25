
import React, { useState, useEffect } from 'react';
import { User, Lock, Building2, ArrowRight, Loader2, AlertCircle, Download, Mail } from 'lucide-react';
import { UserSession } from '../types';
import { supabase, getProfileAndCompany } from '../services/supabase';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  installPrompt: any;
  onInstall: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, installPrompt, onInstall }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    companyName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // If Supabase is configured, use it for auth
      if (supabase) {
        if (isSignup) {
          if (!formData.companyName) {
            setError('Company Name is required.')
            setIsLoading(false)
            return
          }
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.username,
            password: formData.password,
            options: {
              data: {
                role: 'admin',
                company_name: formData.companyName,
              },
            },
          })
          if (signUpError) throw signUpError
          if (data.user) {
            // Poll for profile/company rows created by DB trigger (up to 5s)
            let result = null
            for (let attempt = 0; attempt < 10; attempt++) {
              await new Promise(r => setTimeout(r, 500))
              result = await getProfileAndCompany(data.user.id)
              if (result) break
            }
            onLoginSuccess({
              username: data.user.email || formData.username,
              companyName: result?.company.name || formData.companyName,
              companyId: result?.profile.company_id,
              spreadsheetId: '',
              role: 'admin',
              token: data.session?.access_token,
            })
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.username,
            password: formData.password,
          })
          if (signInError) throw signInError
          if (data.user) {
            const result = await getProfileAndCompany(data.user.id)
            if (!result) throw new Error('Account setup incomplete. Please contact support.')
            onLoginSuccess({
              username: data.user.email || formData.username,
              companyName: result.company.name,
              companyId: result.profile.company_id,
              spreadsheetId: '',
              role: result.profile.role,
              token: data.session?.access_token,
            })
          }
        }
        return;
      }

      // Supabase not configured - show error
      setError('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="relative z-10 flex flex-col items-center justify-center select-none">
            {/* RFE Logo Block */}
            <div className="flex items-center gap-2 mb-2">
                 <div className="bg-brand text-white px-2 py-0.5 -skew-x-12 transform origin-bottom-left shadow-sm flex items-center justify-center">
                    <span className="skew-x-12 font-black text-3xl tracking-tighter">RFE</span>
                 </div>
                 <span className="text-3xl font-black italic tracking-tighter text-white leading-none">RFE</span>
            </div>
            {/* Subtext */}
            <span className="text-[0.6rem] font-bold tracking-[0.2em] text-brand-yellow bg-black px-2 py-0.5 leading-none">FOAM EQUIPMENT</span>
            
            <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">Professional Estimation Suite</p>
          </div>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand via-slate-900 to-slate-900"></div>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
             {isSignup ? 'Create Company Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignup && (
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
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">{isSignup ? 'Admin Email' : 'Email or Username'}</label>
              <div className="relative">
                {isSignup ? <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> : <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />}
                <input 
                  type={isSignup ? "email" : "text"} 
                  required 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                  placeholder={isSignup ? "admin@company.com" : "Enter email or username"}
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</label>
              <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                  type="password" 
                  required 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Login'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

          </form>

          <div className="mt-6 text-center">
              <button 
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(null); }}
              className="text-sm text-slate-500 hover:text-brand font-medium transition-colors"
              >
              {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
              </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
