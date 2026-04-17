import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { AuditLog } from '../types/index';

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-600',
  UPDATE: 'bg-blue-500/10 text-blue-600',
  DELETE: 'bg-red-500/10 text-red-500',
  MARK_REVIEWED: 'bg-purple-500/10 text-purple-600',
  QUEUE_ADD: 'bg-cyan-500/10 text-cyan-600',
  QUEUE_RESET: 'bg-orange-500/10 text-orange-600',
  QUEUE_ARCHIVE: 'bg-zinc-500/10 text-zinc-500',
};

const entityLabels: Record<string, string> = {
  patient: 'Patient',
  consultation_record: 'Consultation',
  prescription: 'Prescription',
  queue: 'Queue',
};

export default function AuditPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/audit-logs', {}, token)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = logs.filter(l =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(filter.toLowerCase()) ||
    l.description.toLowerCase().includes(filter.toLowerCase()) ||
    l.user_email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Audit Trail</h1>
          <p className="text-sm text-zinc-500">{logs.length} total events logged</p>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by action, user, or description..."
          className="w-72 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          {logs.length === 0 ? 'No audit logs yet. Actions will appear here once staff start using the system.' : 'No results match your filter.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <div key={l.id} className="bg-white rounded-xl px-4 py-3 border border-zinc-100 flex items-start gap-4">
              {/* Action badge */}
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 mt-0.5 ${actionColors[l.action] || 'bg-zinc-100 text-zinc-500'}`}>
                {l.action.replace('_', ' ')}
              </span>
              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800">{l.description}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-zinc-400">{entityLabels[l.entity_type] || l.entity_type}</span>
                  <span className="text-xs text-zinc-300">·</span>
                  <span className="text-xs text-zinc-500">{l.user_email}</span>
                </div>
              </div>
              {/* Timestamp */}
              <span className="text-xs text-zinc-400 flex-shrink-0 mt-0.5">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
