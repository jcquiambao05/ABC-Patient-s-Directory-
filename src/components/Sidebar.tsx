import React from 'react';
import { Users, ListOrdered, BarChart2, MessageSquare, HistoryIcon, Activity, LogOut } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onLogout: () => void;
  role: string | null;
}

const nav = [
  { id: 'directory', icon: Users, label: 'Patient Directory' },
  { id: 'queue', icon: ListOrdered, label: 'Queue' },
  { id: 'dashboard', icon: BarChart2, label: 'Daily Dashboard' },
  { id: 'chat', icon: MessageSquare, label: 'Health Assistant' },
  { id: 'audit', icon: HistoryIcon, label: 'Audit Trail' },
];

export default function Sidebar({ activeTab, setActiveTab, onLogout, role }: Props) {
  return (
    <div className="w-64 bg-zinc-950 text-zinc-400 h-screen flex flex-col border-r border-zinc-800 flex-shrink-0">
      <div className="p-6 flex items-center gap-3 text-white">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-zinc-950" />
        </div>
        <span className="font-bold text-lg tracking-tight">ABC Patient Directory</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        {nav.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 hover:text-zinc-200'
            }`}>
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-3">
        <div className="bg-zinc-900/50 rounded-xl p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Role</p>
          <div className={`flex items-center gap-2 text-sm font-medium ${role === 'admin' ? 'text-blue-400' : 'text-emerald-400'}`}>
            <div className={`w-2 h-2 rounded-full ${role === 'admin' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
            {role === 'admin' ? 'Doctor / Admin' : 'Staff'}
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 hover:text-red-400 text-zinc-400 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
