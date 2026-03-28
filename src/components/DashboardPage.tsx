import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Patient } from '../types/index';

interface Stats {
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  totalPatients: number;
  pendingReviews: number;
  recentPatients: Patient[];
}

export default function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats>({ todayVisits: 0, weekVisits: 0, monthVisits: 0, totalPatients: 0, pendingReviews: 0, recentPatients: [] });

  useEffect(() => {
    api('/api/dashboard/stats', {}, token).then(setStats).catch(console.error);
  }, [token]);

  const cards = [
    { label: "Today's Queue", value: stats.todayVisits, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'This Week', value: stats.weekVisits, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'This Month', value: stats.monthVisits, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Patients', value: stats.totalPatients, color: 'text-zinc-300', bg: 'bg-zinc-700/30' },
    { label: 'Pending Reviews', value: stats.pendingReviews, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Daily Dashboard</h1>
      <div className="grid grid-cols-5 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-5`}>
            <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Recent Patients</h2>
        <div className="space-y-2">
          {stats.recentPatients.map((p: Patient) => (
            <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 overflow-hidden">
                {p.profile_photo_path
                  ? <img src={`/${p.profile_photo_path}`} className="w-full h-full object-cover" alt="" />
                  : p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-zinc-900 text-sm">{p.full_name}</p>
                <p className="text-xs text-zinc-400">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
