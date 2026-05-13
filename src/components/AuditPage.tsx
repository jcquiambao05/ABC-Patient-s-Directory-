import React, { useState, useEffect, useCallback } from 'react';
import { Printer, RefreshCw, ChevronDown, ChevronRight, Search, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import type { AuditLog } from '../types/index';

// ── Action config — human-readable labels, icons, colors ──────────────────
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  LOGIN:                   { label: 'Sign In',            color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  icon: '🔐' },
  LOGOUT:                  { label: 'Sign Out',           color: 'text-zinc-600',    bg: 'bg-zinc-50 border-zinc-200',        icon: '🚪' },
  CREATE:                  { label: 'Patient Added',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',        icon: '👤' },
  UPDATE:                  { label: 'Patient Updated',    color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',    icon: '✏️' },
  ARCHIVE:                 { label: 'Patient Archived',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',      icon: '📦' },
  RESTORE:                 { label: 'Patient Restored',   color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200',        icon: '♻️' },
  PERMANENT_DELETE:        { label: 'Patient Deleted',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200',          icon: '🗑️' },
  MARK_REVIEWED:           { label: 'Consultation Reviewed', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '✅' },
  DELETE:                  { label: 'Record Deleted',     color: 'text-red-600',     bg: 'bg-red-50 border-red-200',          icon: '❌' },
  QUEUE_ADD:               { label: 'Added to Queue',     color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200',        icon: '➕' },
  QUEUE_RESET:             { label: 'Queue Reset',        color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',    icon: '🔄' },
  QUEUE_ARCHIVE:           { label: 'Queue Archived',     color: 'text-zinc-600',    bg: 'bg-zinc-50 border-zinc-200',        icon: '📋' },
  APPOINTMENT_ATTENDED:    { label: 'Appointment Attended', color: 'text-green-700', bg: 'bg-green-50 border-green-200',      icon: '🏥' },
  APPOINTMENT_CONFIRMED:   { label: 'Appt Confirmed',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '📅' },
  APPOINTMENT_CANCELLED:   { label: 'Appt Cancelled',     color: 'text-red-600',     bg: 'bg-red-50 border-red-200',          icon: '🚫' },
  APPOINTMENT_NO_SHOW:     { label: 'No-Show',            color: 'text-red-700',     bg: 'bg-red-50 border-red-200',          icon: '⚠️' },
  PROCEDURE_ADDED:         { label: 'Procedure Added',    color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',    icon: '💉' },
  CONSENT_SIGNED:          { label: 'Consent Signed',     color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200',        icon: '✍️' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function getMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthLabel(key: string) {
  const [year, month] = key.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}
function getDayKey(iso: string) {
  return new Date(iso).toISOString().split('T')[0];
}

export default function AuditPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedMonth
        ? `/api/audit-logs?month=${selectedMonth}`
        : '/api/audit-logs';
      const data = await api(url, {}, token);
      setLogs(data);
      // Auto-expand the most recent month
      if (data.length > 0) {
        const firstMonth = getMonthKey(data[0].created_at);
        setExpandedMonths(new Set([firstMonth]));
        const firstDay = getDayKey(data[0].created_at);
        setExpandedDays(new Set([firstDay]));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = logs.filter(l => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const cfg = ACTION_CONFIG[l.action];
    return (
      l.description.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      (cfg?.label || l.action).toLowerCase().includes(q)
    );
  });

  // ── Group by month → day ──────────────────────────────────────────────────
  const byMonth: Record<string, Record<string, AuditLog[]>> = {};
  for (const log of filtered) {
    const mk = getMonthKey(log.created_at);
    const dk = getDayKey(log.created_at);
    if (!byMonth[mk]) byMonth[mk] = {};
    if (!byMonth[mk][dk]) byMonth[mk][dk] = [];
    byMonth[mk][dk].push(log);
  }
  const monthKeys = Object.keys(byMonth).sort().reverse();

  // ── Print report for a specific day ──────────────────────────────────────
  const handlePrint = async () => {
    try {
      const data: AuditLog[] = await api(`/api/audit-logs?date=${printDate}`, {}, token);
      if (data.length === 0) {
        alert('No audit events found for ' + printDate);
        return;
      }

      const dateLabel = new Date(printDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const rows = data.map(l => {
        const cfg = ACTION_CONFIG[l.action];
        const time = formatTime(l.created_at);
        const label = cfg?.label || l.action;
        const user = l.user_email.split('@')[0];
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;white-space:nowrap">${time}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600">${label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${l.description}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${user}</td>
          </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Audit Report — ${dateLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    .header { border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }
    .clinic { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    .summary { margin-top: 24px; padding: 12px 16px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #374151; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <p class="clinic">ABC MD Medical Clinic — ABCare OmniFlow</p>
    <h1>Daily Audit Report</h1>
    <p class="meta">${dateLabel} &nbsp;·&nbsp; ${data.length} event${data.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Printed ${new Date().toLocaleString()}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Action</th>
        <th>Description</th>
        <th>User</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <strong>Summary:</strong> ${data.length} total events recorded on ${dateLabel}.
    Logins: ${data.filter(l => l.action === 'LOGIN').length} &nbsp;·&nbsp;
    Patients added: ${data.filter(l => l.action === 'CREATE' && l.entity_type === 'patient').length} &nbsp;·&nbsp;
    Consultations reviewed: ${data.filter(l => l.action === 'MARK_REVIEWED').length} &nbsp;·&nbsp;
    Queue events: ${data.filter(l => l.action.startsWith('QUEUE')).length}
  </div>
</body>
</html>`;

      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    } catch (err) { alert('Failed to load audit data for printing.'); }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleMonth = (mk: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(mk) ? next.delete(mk) : next.add(mk);
      return next;
    });
  };
  const toggleDay = (dk: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dk) ? next.delete(dk) : next.add(dk);
      return next;
    });
  };

  // ── Available months for the selector ────────────────────────────────────
  const availableMonths = Array.from(new Set(logs.map(l => getMonthKey(l.created_at)))).sort().reverse();

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Audit Trail</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{filtered.length} events · grouped by month</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search events..."
                className="pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400 w-52"
              />
            </div>
            {/* Month filter */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400"
            >
              <option value="">All months</option>
              {availableMonths.map(mk => (
                <option key={mk} value={mk}>{getMonthLabel(mk)}</option>
              ))}
            </select>
            {/* Refresh */}
            <button onClick={load} className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-500 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Print report bar */}
        <div className="mt-3 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Printer className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium text-emerald-800">Print Daily Report</span>
          <input
            type="date"
            value={printDate}
            onChange={e => setPrintDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-16 text-zinc-400">Loading audit trail...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium text-zinc-500">No audit events yet</p>
            <p className="text-sm mt-1">Events will appear here as staff use the system — logins, patient records, queue actions, and more.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthKeys.map(mk => {
              const monthExpanded = expandedMonths.has(mk);
              const dayKeys = Object.keys(byMonth[mk]).sort().reverse();
              const totalInMonth = dayKeys.reduce((sum, dk) => sum + byMonth[mk][dk].length, 0);

              return (
                <div key={mk} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                  {/* Month header */}
                  <button
                    onClick={() => toggleMonth(mk)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-zinc-900">{getMonthLabel(mk)}</span>
                      <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full font-medium">
                        {totalInMonth} event{totalInMonth !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-zinc-400">{dayKeys.length} day{dayKeys.length !== 1 ? 's' : ''}</span>
                    </div>
                    {monthExpanded
                      ? <ChevronDown className="w-4 h-4 text-zinc-400" />
                      : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                  </button>

                  {monthExpanded && (
                    <div className="border-t border-zinc-100">
                      {dayKeys.map(dk => {
                        const dayExpanded = expandedDays.has(dk);
                        const dayLogs = byMonth[mk][dk];
                        const dayLabel = formatDate(dayLogs[0].created_at);

                        return (
                          <div key={dk} className="border-b border-zinc-100 last:border-b-0">
                            {/* Day header */}
                            <button
                              onClick={() => toggleDay(dk)}
                              className="w-full flex items-center justify-between px-5 py-3 bg-zinc-50/60 hover:bg-zinc-100/60 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-zinc-700">{dayLabel}</span>
                                <span className="text-xs px-2 py-0.5 bg-white border border-zinc-200 text-zinc-500 rounded-full">
                                  {dayLogs.length} event{dayLogs.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {dayExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                            </button>

                            {dayExpanded && (
                              <div className="divide-y divide-zinc-50">
                                {dayLogs.map(log => {
                                  const cfg = ACTION_CONFIG[log.action];
                                  const label = cfg?.label || log.action.replace(/_/g, ' ');
                                  const icon = cfg?.icon || '📝';
                                  const colorCls = cfg?.color || 'text-zinc-600';
                                  const bgCls = cfg?.bg || 'bg-zinc-50 border-zinc-200';
                                  const userName = log.user_email.split('@')[0];

                                  return (
                                    <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-zinc-50/40 transition-colors">
                                      {/* Time */}
                                      <span className="text-xs text-zinc-400 w-16 flex-shrink-0 pt-0.5 font-mono">
                                        {formatTime(log.created_at)}
                                      </span>
                                      {/* Action badge */}
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 whitespace-nowrap ${bgCls} ${colorCls}`}>
                                        {icon} {label}
                                      </span>
                                      {/* Description */}
                                      <p className="flex-1 text-sm text-zinc-700 min-w-0">{log.description}</p>
                                      {/* User */}
                                      <span className="text-xs text-zinc-400 flex-shrink-0 pt-0.5">{userName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
