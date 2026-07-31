/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Activity, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  onShowSignup: () => void;
}

// PasswordStrength type moved to SignupPage where it belongs

// Small component that checks slot availability and shows signup link
function SignupLink() {
  const [open, setOpen] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    fetch('/api/auth/signup-availability')
      .then(r => r.json())
      .then(d => setOpen(d.registration_open))
      .catch(() => setOpen(false));
  }, []);
  if (!open) return null;
  return (
    <p className="text-slate-500 text-sm">
      New to ABCare?{' '}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('abccare:show-signup'));
        }}
        className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
      >
        Create an account
      </button>
    </p>
  );
}

import { checkSessionExpiry } from '../lib/api';

export default function Login({ onLoginSuccess, onShowSignup }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'forgot' | 'mfa'>('login');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAdminKeyword = email.trim().toLowerCase() === 'admin';
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(() => checkSessionExpiry() ?? '');
  const [success, setSuccess] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devOtp, setDevOtp] = useState(''); // shown when email not configured
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle OAuth callback token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const oauthError = urlParams.get('error');

    if (token) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, '/');
      onLoginSuccess(token);
    } else if (oauthError) {
      window.history.replaceState({}, document.title, '/');
      
      // Show specific error messages
      switch (oauthError) {
        case 'oauth_not_configured':
          setError('Google OAuth is not configured. Please contact administrator.');
          break;
        case 'unauthorized_account':
          setError('This Google account is not authorized. Only whitelisted accounts can sign in.');
          break;
        case 'max_users_reached':
          setError('Maximum number of admin accounts reached. Contact administrator.');
          break;
        case 'whitelist_not_configured':
          setError('Google OAuth whitelist not configured. Contact administrator.');
          break;
        default:
          setError('Google sign-in failed. Please try again or use email/password.');
      }
    }
  }, [onLoginSuccess]);

  // Password strength calculation removed from login — only used in signup

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.requiresMFA) {
        setTempToken(data.tempToken);
        setMode('mfa');
      } else {
        onLoginSuccess(data.token);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, mfaCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'MFA verification failed');
      }

      onLoginSuccess(data.token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevOtp('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.cooldown) setCooldown(data.cooldown);
        throw new Error(data.error || 'Failed to send code');
      }

      // Google OAuth account — no password to reset
      if (data.use_google) {
        setError('This account uses Google Sign-In. Click "Continue with Google" on the login page instead.');
        setIsLoading(false);
        return;
      }

      // Email not configured in dev — show OTP directly
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }

      setSuccess(data.message);
      setCooldown(60);
      setForgotStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode.trim() || otpCode.length !== 6) { setError('Enter the 6-digit code'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess('Password updated! Redirecting to login...');
      setTimeout(() => {
        setMode('login');
        setForgotStep('email');
        setOtpCode('');
        setNewPassword('');
        setDevOtp('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 text-zinc-950" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">ABCare OmniFlow: Clinic Management</h1>
          <p className="text-slate-500">Secure Admin Access</p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Login Form */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                  <p className="text-slate-500">Sign in to access the admin dashboard</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email / Username Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        pattern={isAdminKeyword ? undefined : undefined}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="admin@clinic.com"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator removed — login does not need this */}
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Sign In Securely
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-400 font-medium">OR</span>
                    </div>
                  </div>

                  {/* Google Sign In */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-300 shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
              </motion.div>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <button
                  onClick={() => { setMode('login'); setForgotStep('email'); setError(''); setSuccess(''); setDevOtp(''); setOtpCode(''); setNewPassword(''); setCooldown(0); }}
                  className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>

                {forgotStep === 'email' ? (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h2>
                      <p className="text-slate-500">Enter your email and we'll send a 6-digit code</p>
                    </div>

                    {error && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || cooldown > 0}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Sending code...</>
                        ) : cooldown > 0 ? (
                          `Resend in ${cooldown}s`
                        ) : (
                          'Send Verification Code'
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Code</h2>
                      <p className="text-slate-500">Check your email for the 6-digit code</p>
                    </div>

                    {/* Dev OTP display when email not configured */}
                    {devOtp && (
                      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Email not configured — your code:</p>
                        <p className="text-2xl font-mono font-bold text-amber-700 tracking-widest">{devOtp}</p>
                        <p className="text-xs text-amber-600 mt-1">Add EMAIL_USER and EMAIL_PASS to .env to enable email delivery.</p>
                      </div>
                    )}

                    {error && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {success && !error && (
                      <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-700">{success}</p>
                      </div>
                    )}

                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider block text-center">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          maxLength={6}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 text-slate-900 text-center text-2xl font-mono tracking-widest rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                          placeholder="000000"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Min 8 characters"
                          />
                          <button type="button" onClick={() => setShowNewPassword(s => !s)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || otpCode.length !== 6 || newPassword.length < 8}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</>
                        ) : (
                          'Set New Password'
                        )}
                      </button>

                      <button type="button" onClick={() => { setForgotStep('email'); setError(''); setOtpCode(''); }}
                        disabled={cooldown > 0}
                        className="w-full text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50">
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get the code? Send again"}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            )}

            {/* MFA Verification Form */}
            {mode === 'mfa' && (
              <motion.div
                key="mfa"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl mb-4">
                    <Key className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Two-Factor Authentication</h2>
                  <p className="text-slate-500">Enter the 6-digit code from your authenticator app</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleMFAVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider text-center block">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 text-slate-900 text-center text-2xl font-mono tracking-widest rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || mfaCode.length !== 6}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Continue'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-slate-400 text-sm">  </p>
          {mode === 'login' && (
            <SignupLink />
          )}
        </div>
      </motion.div>
    </div>
  );
}
