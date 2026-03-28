import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { AuditLog } from '../types/index';

export default function AuditPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api('/api/audit-logs', {}, token).then(setLogs).catch(console.error);
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Audit Trail</h1>
      {logs.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">No audit logs yet</div>
      ) : (
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="bg-white rounded-xl p-4 border border-zinc-100 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-800">{l.action} — {l.entity_type}</p>
                <p className="text-xs text-zinc-500">{l.description}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{new Date(l.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
