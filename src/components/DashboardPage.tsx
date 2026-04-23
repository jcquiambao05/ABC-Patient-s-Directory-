import React, { useState, useEffect, useCallback } from 'react';
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

type Range = 'today' | 'week' | 'month' | 'custom';

export default function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats>({ todayVisits: 0, weekVisits: 0, monthVisits: 0, totalPatients: 0, pendingReviews: 0, recentPatients: [] });
  const [range, setRange] = useState<Range>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/dashboard/stats';
      if (range === 'custom' && customFrom && customTo) {
        url += `?from=${customFrom}&to=${customTo}`;
      } else if (range !== 'month') {
        url += `?range=${range}`;
      }
      const data = await api(url, {}, token);
      setStats(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token, range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  const rangeLabel: Record<Range, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    custom: "Custom Range",
  };

  const cards = [
    { label: "Today's Queue", value: stats.todayVisits, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'This Week', value: stats.weekVisits, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'This Month', value: stats.monthVisits, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Patients', value: stats.totalPatients, color: 'text-zinc-300', bg: 'bg-zinc-700/30' },
    { label: 'Pending Reviews', value: stats.pendingReviews, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50">
      {/* Header + filter — stacks on mobile */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">Daily Dashboard</h1>
        {/* Date range filter — wraps on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'month', 'custom'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-emerald-400'}`}>
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs — stacks on mobile */}
      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-white border border-zinc-200 rounded-xl px-4 py-3">
          <span className="text-sm text-zinc-500">From</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-emerald-400" />
          <span className="text-sm text-zinc-500">to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-emerald-400" />
          <button onClick={load} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium w-full sm:w-auto">Apply</button>
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-4 md:p-6`}>
            <p className="text-xs md:text-sm text-zinc-500 mb-1">{c.label}</p>
            <p className={`text-3xl md:text-4xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider mb-3">Recent Patients</h2>
        <div className="space-y-2">
          {stats.recentPatients.map((p: Patient) => (
            <div key={p.id} className="bg-white rounded-xl p-5 flex items-center gap-3 border border-zinc-100">
              <div className="w-11 h-11 rounded-xl bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 overflow-hidden">
                {p.profile_photo_path
                  ? <img src={`/${p.profile_photo_path}`} className="w-full h-full object-cover" alt="" />
                  : p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-zinc-900 text-base">{p.full_name}</p>
                <p className="text-sm text-zinc-400">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
