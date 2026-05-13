import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, AlertTriangle, Phone } from 'lucide-react';
import { api } from '../lib/api';
import type { Patient } from '../types/index';

interface NoShowStats {
  noShowCount: number;
  totalAppointments: number;
  attendedCount: number;
  pendingCount: number;
  noShowRate: number;
}

interface AtRiskPatient {
  id: string;
  full_name: string;
  contact_number: string | null;
  no_show_count: number;
  last_no_show: string;
}

interface Stats {
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  totalPatients: number;
  pendingReviews: number;
  recentPatients: Patient[];
  noShowStats?: NoShowStats;
  atRiskPatients?: AtRiskPatient[];
}

type Range = 'today' | 'week' | 'month' | 'custom';

export default function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats>({ todayVisits: 0, weekVisits: 0, monthVisits: 0, totalPatients: 0, pendingReviews: 0, recentPatients: [], noShowStats: undefined, atRiskPatients: [] });
  const [range, setRange] = useState<Range>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Daily briefing state
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);

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

  // Load daily briefing on mount — only if not dismissed today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const dismissedDate = localStorage.getItem('briefing_dismissed_date');
    if (dismissedDate === today) { setBriefingDismissed(true); return; }

    setBriefingLoading(true);
    api('/api/ai/daily-briefing', {}, token)
      .then(data => setBriefing(data.briefing))
      .catch(() => {}) // silently fail — briefing is optional
      .finally(() => setBriefingLoading(false));
  }, [token]);

  const dismissBriefing = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('briefing_dismissed_date', today);
    setBriefingDismissed(true);
  };

  const rangeLabel: Record<Range, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    custom: "Custom Range",
  };

  const cards = [
    { label: "Today's Queue", value: stats.todayVisits, color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100' },
    { label: 'This Week', value: stats.weekVisits, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100' },
    { label: 'This Month', value: stats.monthVisits, color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
    { label: 'Total Patients', value: stats.totalPatients, color: 'text-zinc-700', bg: 'bg-zinc-100 border border-zinc-200' },
    { label: 'Pending Reviews', value: stats.pendingReviews, color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50">
      {/* Daily AI Briefing Card */}
      {!briefingDismissed && (briefingLoading || briefing) && (
        <div className="mb-5 bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">Morning Briefing</span>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">AI · Local</span>
            </div>
            <button onClick={dismissBriefing} className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {briefingLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your morning briefing...
              </div>
            ) : (
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{briefing}</p>
            )}
          </div>
        </div>
      )}

      {/* Header + filter */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">Daily Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'month', 'custom'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-emerald-400'}`}>
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs */}
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

      {/* No-show analytics */}
      {stats.noShowStats && stats.noShowStats.totalAppointments > 0 && (
        <div>
          <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider mb-3">Appointment Analytics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Appointments</p>
              <p className="text-2xl font-bold text-zinc-700">{stats.noShowStats.totalAppointments}</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <p className="text-xs text-zinc-500 mb-1">Attended</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.noShowStats.attendedCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <p className="text-xs text-zinc-500 mb-1">No-Shows</p>
              <p className="text-2xl font-bold text-red-500">{stats.noShowStats.noShowCount}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${stats.noShowStats.noShowRate >= 20 ? 'bg-red-50 border-red-200' : stats.noShowStats.noShowRate >= 10 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs text-zinc-500 mb-1">No-Show Rate</p>
              <p className={`text-2xl font-bold ${stats.noShowStats.noShowRate >= 20 ? 'text-red-600' : stats.noShowStats.noShowRate >= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {stats.noShowStats.noShowRate}%
              </p>
            </div>
          </div>

          {/* At-risk patients */}
          {stats.atRiskPatients && stats.atRiskPatients.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-red-700">At-Risk Patients (2+ no-shows)</h3>
              </div>
              <div className="space-y-2">
                {stats.atRiskPatients.map(p => (
                  <div key={p.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-red-100">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{p.full_name}</p>
                      <p className="text-xs text-zinc-500">
                        {p.no_show_count} no-show{p.no_show_count !== 1 ? 's' : ''} · Last: {new Date(p.last_no_show + 'T12:00:00').toLocaleDateString()}
                      </p>
                    </div>
                    {p.contact_number && (
                      <a href={`tel:${p.contact_number}`}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        <Phone className="w-3.5 h-3.5" /> {p.contact_number}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
