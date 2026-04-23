import React, { useState } from 'react';
import { X, Type, Monitor, Layout, Home, User, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePreferences, Preferences } from '../hooks/usePreferences';

interface Props {
  token: string;
  onClose: () => void;
}

export default function SettingsPanel({ token, onClose }: Props) {
  const { preferences, updatePreferences } = usePreferences();
  const set = (patch: Partial<Preferences>) => updatePreferences(patch, token);

  // Account settings state
  const [displayName, setDisplayName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true); setNameMsg('');
    try {
      const r = await fetch('/api/auth/display-name', {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setNameMsg('Name updated!');
      setDisplayName('');
      setTimeout(() => setNameMsg(''), 3000);
    } catch (e) { setNameMsg((e as Error).message); }
    finally { setNameSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwMsg('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setPwMsg('Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (e) { setPwError((e as Error).message); }
    finally { setPwSaving(false); }
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
    { value: 'high-contrast' as const, label: 'High Contrast', icon: '⬛' },
  ];

  const inputCls = 'w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-xl text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-500';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop — only on desktop */}
      <div className="hidden md:block flex-1 bg-black/40" onClick={onClose} />

      {/* Panel — full screen on mobile, side drawer on desktop */}
      <div className="w-full md:w-80 bg-zinc-900 md:border-l border-zinc-700 h-full flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-base font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-7">

          {/* Account — Display Name */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Display Name</span>
            </div>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter new display name"
              className={inputCls}
            />
            {nameMsg && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${nameMsg.includes('!') ? 'text-emerald-400' : 'text-red-400'}`}>
                {nameMsg.includes('!') ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {nameMsg}
              </p>
            )}
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !displayName.trim()}
              className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              {nameSaving ? 'Saving...' : 'Save Name'}
            </button>
          </div>

          {/* Account — Change Password */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Change Password</span>
            </div>
            <div className="space-y-2">
              <input
                type={showPw ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className={inputCls}
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  className={`${inputCls} pr-10`}
                />
                <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                className={inputCls}
              />
            </div>
            {pwError && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{pwError}</p>}
            {pwMsg && <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{pwMsg}</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !newPw || !confirmPw}
              className="mt-2 w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Font Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Font Size</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'normal', label: 'Normal', sample: 'Aa' },
                { value: 'large', label: 'Large', sample: 'Aa' },
                { value: 'xlarge', label: 'X-Large', sample: 'Aa' },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => set({ fontSize: opt.value })}
                  className={`py-3 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 ${
                    preferences.fontSize === opt.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}>
                  <span style={{ fontSize: opt.value === 'normal' ? '14px' : opt.value === 'large' ? '17px' : '20px' }}>{opt.sample}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map(t => (
                <button key={t.value} onClick={() => set({ theme: t.value })}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    preferences.theme === t.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}>
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Sidebar</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: 'Full', desc: 'Icons + labels' },
                { value: true, label: 'Compact', desc: 'Icons only' },
              ].map(opt => (
                <button key={String(opt.value)} onClick={() => set({ sidebarCompact: opt.value })}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    preferences.sidebarCompact === opt.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}>
                  <div>{opt.label}</div>
                  <div className={`text-xs mt-0.5 ${preferences.sidebarCompact === opt.value ? 'text-emerald-100' : 'text-zinc-500'}`}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Default Landing Page */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Default Page</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['directory', 'queue', 'dashboard'] as const).map(tab => (
                <button key={tab} onClick={() => set({ defaultTab: tab })}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferences.defaultTab === tab
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}>
                  {tab === 'directory' ? 'Directory' : tab === 'queue' ? 'Queue' : 'Dashboard'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 mt-auto">
          <p className="text-xs text-zinc-500 text-center">Saves automatically · Per account</p>
        </div>
      </div>
    </div>
  );
}
