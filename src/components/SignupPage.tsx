import React, { useState, useEffect } from 'react';
import { Activity, Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle, Loader2, ArrowLeft, Shield, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onBack: () => void;
  onSignupSuccess: () => void;
}

interface Availability {
  staff_slots: number;
  admin_slots: number;
  registration_open: boolean;
}

// 3 steps: account details → scan QR code → verify code
type Step = 'form' | 'qr' | 'verify';

export default function SignupPage({ onBack, onSignupSuccess }: Props) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [step, setStep] = useState<Step>('form');

  // Step 1 — form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 — MFA QR
  const [newUserId, setNewUserId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');

  // Step 3 — verify code
  const [mfaCode, setMfaCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/signup-availability')
      .then(r => r.json())
      .then(setAvailability)
      .catch(() => setAvailability({ staff_slots: 0, admin_slots: 0, registration_open: false }))
      .finally(() => setLoadingAvail(false));
  }, []);

  const getStrength = (pwd: string) => {
    if (!pwd) return null;
    let s = 0;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    if (s >= 4) return 'strong';
    if (s >= 2) return 'medium';
    return 'weak';
  };
  const strength = getStrength(password);
  const strengthColor = strength === 'strong' ? 'bg-emerald-500' : strength === 'medium' ? 'bg-yellow-500' : 'bg-red-500';

  // ── Step 1: Create account ──────────────────────────────────────────────
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 12) { setError('Password must be at least 12 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password needs an uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { setError('Password needs a number'); return; }
    if (!/[^a-zA-Z0-9]/.test(password)) { setError('Password needs a special character'); return; }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed'); return; }

      // Account created — now get the QR code for MFA setup
      setNewUserId(data.userId);
      const mfaRes = await fetch('/api/auth/signup-setup-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.userId }),
      });
      const mfaData = await mfaRes.json();
      if (!mfaRes.ok) { setError(mfaData.error || 'MFA setup failed'); return; }

      setQrCode(mfaData.qrCode);
      setMfaSecret(mfaData.secret);
      setStep('qr');
    } catch { setError('Network error. Please try again.'); }
    finally { setIsLoading(false); }
  };

  // ── Step 3: Verify the first TOTP code ─────────────────────────────────
  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId, mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      // MFA activated — account is fully ready
      setTimeout(() => onSignupSuccess(), 1500);
      setStep('verify'); // show success state
    } catch { setError('Network error. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const inputCls = 'w-full pl-12 pr-4 py-3.5 bg-zinc-800/50 border border-zinc-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 text-zinc-950" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">ABCare OmniFlow</h1>
          <p className="text-zinc-400">Create your clinic account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {['Account', 'Scan QR', 'Verify'].map((label, i) => {
            const stepNum = i + 1;
            const currentNum = step === 'form' ? 1 : step === 'qr' ? 2 : 3;
            const done = currentNum > stepNum;
            const active = currentNum === stepNum;
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-emerald-400' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px max-w-8 ${done ? 'bg-emerald-500' : 'bg-zinc-700'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-8">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Account form ── */}
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button onClick={onBack} className="mb-5 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>

                {loadingAvail && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>}

                {!loadingAvail && !availability?.registration_open && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Registration Closed</h2>
                    <p className="text-zinc-400 text-sm">All 4 clinic accounts have been created.</p>
                    <button onClick={onBack} className="mt-6 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium">Back to Login</button>
                  </div>
                )}

                {!loadingAvail && availability?.registration_open && (
                  <>
                    {/* Slot counter */}
                    <div className="mb-5 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700 flex gap-4 text-sm">
                      <div className="flex-1 text-center">
                        <div className={`text-lg font-bold ${availability.staff_slots > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>{availability.staff_slots}/2</div>
                        <div className="text-zinc-500 text-xs">Staff slots</div>
                      </div>
                      <div className="w-px bg-zinc-700" />
                      <div className="flex-1 text-center">
                        <div className={`text-lg font-bold ${availability.admin_slots > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{availability.admin_slots}/2</div>
                        <div className="text-zinc-500 text-xs">Doctor slots</div>
                      </div>
                    </div>

                    {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-400">{error}</p></div>}

                    <form onSubmit={handleCreateAccount} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                        <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="Dr. Juan Dela Cruz" /></div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Email</label>
                        <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="doctor@abcclinic.com" /></div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Role</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setRole('staff')} disabled={availability.staff_slots <= 0}
                            className={`py-3 rounded-xl text-sm font-medium border transition-colors ${role === 'staff' ? 'bg-emerald-500 border-emerald-500 text-white' : availability.staff_slots > 0 ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-emerald-500' : 'bg-zinc-800/20 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                            👤 Staff{availability.staff_slots <= 0 && <span className="block text-xs">(full)</span>}
                          </button>
                          <button type="button" onClick={() => setRole('admin')} disabled={availability.admin_slots <= 0}
                            className={`py-3 rounded-xl text-sm font-medium border transition-colors ${role === 'admin' ? 'bg-blue-500 border-blue-500 text-white' : availability.admin_slots > 0 ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-blue-500' : 'bg-zinc-800/20 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                            👨‍⚕️ Doctor{availability.admin_slots <= 0 && <span className="block text-xs">(full)</span>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Password</label>
                        <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className={`${inputCls} pr-12`} placeholder="Min 12 chars" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {password && <div className="mt-2 flex gap-1.5">
                          <div className={`h-1.5 flex-1 rounded-full ${strength ? strengthColor : 'bg-zinc-700'}`} />
                          <div className={`h-1.5 flex-1 rounded-full ${strength && strength !== 'weak' ? strengthColor : 'bg-zinc-700'}`} />
                          <div className={`h-1.5 flex-1 rounded-full ${strength === 'strong' ? strengthColor : 'bg-zinc-700'}`} />
                        </div>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                        <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                            className={`${inputCls} pr-12 ${confirmPassword && confirmPassword !== password ? 'border-red-500' : ''}`} placeholder="Repeat password" />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : 'Continue to MFA Setup →'}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Scan QR code ── */}
            {step === 'qr' && (
              <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-2xl mb-3">
                    <Smartphone className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Set Up Authenticator</h2>
                  <p className="text-zinc-400 text-sm">Scan this QR code with Google Authenticator or Authy. This works offline forever after setup.</p>
                </div>

                {qrCode && (
                  <div className="flex justify-center mb-5">
                    <div className="bg-white p-3 rounded-2xl">
                      <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                    </div>
                  </div>
                )}

                <div className="mb-5 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-1">Can't scan? Enter this key manually:</p>
                  <p className="text-xs font-mono text-emerald-400 break-all">{mfaSecret}</p>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-5">
                  <p className="text-xs text-blue-300">
                    📱 <strong>Apps to use:</strong> Google Authenticator, Authy, Microsoft Authenticator<br/>
                    🔒 After scanning, this generates 6-digit codes every 30 seconds — no internet needed.
                  </p>
                </div>

                <button onClick={() => setStep('verify')}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all">
                  I've scanned it → Enter verification code
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: Verify first code ── */}
            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Verify Your Code</h2>
                  <p className="text-zinc-400 text-sm">Enter the 6-digit code from your authenticator app to confirm it's working.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-400">{error}</p></div>}

                {isLoading === false && mfaCode.length === 0 ? null : null}

                <form onSubmit={handleVerifyMFA} className="space-y-4">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required maxLength={6}
                    className="w-full px-4 py-5 bg-zinc-800/50 border border-zinc-700 text-white text-center text-3xl font-mono tracking-widest rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
                    placeholder="000000"
                    autoFocus
                  />
                  <button type="submit" disabled={isLoading || mfaCode.length !== 6}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                      : <><CheckCircle className="w-5 h-5" /> Activate Account</>}
                  </button>
                  <button type="button" onClick={() => { setStep('qr'); setError(''); setMfaCode(''); }}
                    className="w-full text-sm text-zinc-400 hover:text-white transition-colors">
                    ← Back to QR code
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
