import React from 'react';
import { Users, ListOrdered, BarChart2, MessageSquare, HistoryIcon, Activity, LogOut, Settings, Shield, CalendarDays } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onLogout: () => void;
  role: string | null;
  displayName?: string | null;
  sidebarCompact?: boolean;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
}

const nav = [
  { id: 'directory', icon: Users, label: 'Directory' },
  { id: 'queue', icon: ListOrdered, label: 'Queue' },
  { id: 'calendar', icon: CalendarDays, label: 'Appointments' },
  { id: 'dashboard', icon: BarChart2, label: 'Dashboard' },
  { id: 'chat', icon: MessageSquare, label: 'Assistant' },
  { id: 'audit', icon: HistoryIcon, label: 'Audit' },
];

export default function Sidebar({ activeTab, setActiveTab, onLogout, role, displayName, sidebarCompact = false, onOpenSettings, onOpenAdmin }: Props) {
  // On desktop: compact mode hides labels (icon-only). On tablet (md): always icon-only.
  const showLabels = !sidebarCompact;

  return (
    <>
      {/* ── Desktop / Tablet sidebar (hidden on mobile) ── */}
      <div className={`hidden md:flex ${sidebarCompact ? 'w-20' : 'md:w-16 lg:w-72'} bg-zinc-950 text-zinc-400 h-screen flex-col border-r border-zinc-800 flex-shrink-0 transition-all duration-300`}>
        {/* Logo */}
        <div className="p-5 lg:p-7 flex items-center gap-3 text-white overflow-hidden">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-zinc-950" />
          </div>
          {showLabels && <span className="font-bold text-xl tracking-tight hidden lg:block truncate">ABCare OmniFlow</span>}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 lg:px-4 space-y-1 mt-2">
          {nav.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 hover:text-zinc-200'
              }`}>
              <item.icon className="w-[22px] h-[22px] flex-shrink-0" />
              {showLabels && <span className="font-medium text-lg hidden lg:block">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 lg:p-4 border-t border-zinc-800 space-y-2 lg:space-y-3">
          {/* Role badge + gear icon */}
          {showLabels && (
            <div className="hidden lg:flex items-center justify-between bg-zinc-900/50 rounded-xl p-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Doctor / Admin' : 'Staff'}
                </p>
                <div className={`flex items-center gap-2 text-base font-medium ${role === 'superadmin' ? 'text-amber-400' : role === 'admin' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${role === 'superadmin' ? 'bg-amber-400' : role === 'admin' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  {displayName || (role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Doctor' : 'Staff')}
                </div>
              </div>
              <div className="flex gap-1">
                {role === 'superadmin' && onOpenAdmin && (
                  <button onClick={onOpenAdmin} title="Admin Panel"
                    className="p-1.5 rounded-lg hover:bg-amber-900/40 text-amber-500 hover:text-amber-300 transition-colors">
                    <Shield className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onOpenSettings} title="Settings"
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {/* Tablet: role dot + gear */}
          <div className={`${showLabels ? 'md:flex lg:hidden' : 'flex'} justify-center items-center gap-2 py-1`}>
            <div className={`w-2.5 h-2.5 rounded-full ${role === 'superadmin' ? 'bg-amber-400' : role === 'admin' ? 'bg-blue-400' : 'bg-emerald-400'}`}
              title={role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Doctor / Admin' : 'Staff'} />
            {role === 'superadmin' && onOpenAdmin && (
              <button onClick={onOpenAdmin} title="Admin Panel"
                className="p-1 rounded-lg hover:bg-zinc-800 text-amber-500 hover:text-amber-300 transition-colors">
                <Shield className="w-4 h-4" />
              </button>
            )}
            <button onClick={onOpenSettings} title="Settings"
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onLogout} title="Sign Out"
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-900 hover:text-red-400 text-zinc-400 transition-all">
            <LogOut className="w-[22px] h-[22px] flex-shrink-0" />
            {showLabels && <span className="font-medium text-lg hidden lg:block">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav bar ── */}
      {/* Row 1: main nav items (6 items) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 safe-area-pb">
        {/* Main nav row */}
        <div className="grid grid-cols-6 px-1 pt-1">
          {nav.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
                activeTab === item.id ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
        {/* Settings + Logout row — separated with a divider */}
        <div className="grid grid-cols-2 border-t border-zinc-800/60 px-4 pb-1">
          <button onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 py-2 text-zinc-500 hover:text-zinc-200 transition-all">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-medium">Settings</span>
          </button>
          <button onClick={onLogout}
            className="flex items-center justify-center gap-2 py-2 text-zinc-500 hover:text-red-400 transition-all border-l border-zinc-800/60">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
