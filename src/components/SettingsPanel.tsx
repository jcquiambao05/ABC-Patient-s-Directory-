import React from 'react';
import { X, Type, Monitor, Layout, Home } from 'lucide-react';
import { usePreferences, Preferences } from '../hooks/usePreferences';

interface Props {
  token: string;
  onClose: () => void;
}

export default function SettingsPanel({ token, onClose }: Props) {
  const { preferences, updatePreferences } = usePreferences();
  const set = (patch: Partial<Preferences>) => updatePreferences(patch, token);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
    { value: 'high-contrast' as const, label: 'High Contrast', icon: '⬛' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel — always dark regardless of theme for readability */}
      <div className="w-80 bg-zinc-900 border-l border-zinc-700 h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Display Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">

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
            <p className="text-xs text-zinc-500 mt-2">Scales all text proportionally</p>
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
            <p className="text-xs text-zinc-500 mt-2">
              {preferences.theme === 'system' ? 'Follows your OS dark/light mode setting' :
               preferences.theme === 'high-contrast' ? 'Maximum contrast for bright environments' :
               preferences.theme === 'dark' ? 'Easier on eyes during long shifts' :
               'Best for bright clinic environments'}
            </p>
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
                { value: true, label: 'Compact', desc: 'Icons only, more space' },
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
            <p className="text-xs text-zinc-500 mt-2">Where you land after login</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">Saves automatically · Per account</p>
        </div>
      </div>
    </div>
  );
}
