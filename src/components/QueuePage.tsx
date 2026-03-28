import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ListOrdered, UserCheck, ClipboardList, Eye, X } from 'lucide-react';
import { api } from '../lib/api';
import DetailPanel from './DetailPanel';
import type { Patient, QueueEntry } from '../types/index';

interface Props {
  token: string;
  role: string | null;
}

export default function QueuePage({ token, role }: Props) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [doneConfirm, setDoneConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [viewPatientData, setViewPatientData] = useState<any>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([api('/api/queue', {}, token), api('/api/patients', {}, token)]);
      setQueue(q); setPatients(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const addToQueue = async (patientId: string) => {
    try { await api('/api/queue', { method: 'POST', body: JSON.stringify({ patient_id: patientId }) }, token); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const callNext = async () => {
    const next = queue.find(q => q.status === 'waiting');
    if (!next) return;
    try { await api(`/api/queue/${next.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'in_consultation' }) }, token); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const markDone = async (id: string) => {
    try { await api(`/api/queue/${id}/done`, { method: 'PATCH', body: '{}' }, token); setDoneConfirm(null); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const resetQueue = async () => {
    try { await api('/api/queue/reset', { method: 'POST', body: '{}' }, token); setResetConfirm(false); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const archiveDay = async () => {
    if (!confirm('Archive all queued patients for today?')) return;
    try { await api('/api/queue/archive', { method: 'POST', body: '{}' }, token); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const updateRemarks = async (id: string, remarks: string) => {
    try { await api(`/api/queue/${id}/remarks`, { method: 'PATCH', body: JSON.stringify({ remarks }) }, token); }
    catch (err) { console.error(err); }
  };

  const openPatientRecord = async (patientId: string) => {
    try {
      const [pd, ci] = await Promise.all([api(`/api/patients/${patientId}`, {}, token), api(`/api/patients/${patientId}/chart-images`, {}, token)]);
      setViewPatientData({ ...pd, chart_images: ci });
    } catch (err) { alert((err as Error).message); }
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const reordered = [...queue];
    const fromIdx = reordered.findIndex(q => q.id === dragId);
    const toIdx = reordered.findIndex(q => q.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((q, i) => ({ ...q, position: i + 1 }));
    setQueue(updated); setDragId(null);
    try { await api('/api/queue/reorder', { method: 'PATCH', body: JSON.stringify(updated.map(q => ({ id: q.id, position: q.position }))) }, token); }
    catch { loadQueue(); }
  };

  const filtered = patients.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()));
  const statusColors: Record<string, string> = { waiting: 'bg-zinc-700 text-zinc-300', in_consultation: 'bg-blue-500/20 text-blue-400', done: 'bg-emerald-500/20 text-emerald-400' };
  const statusLabels: Record<string, string> = { waiting: 'Waiting', in_consultation: 'In Consultation', done: 'Done' };

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-50">
      {/* Staff: patient search panel */}
      {role === 'staff' && (
        <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="font-bold text-zinc-900 mb-3">Add to Queue</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-100 rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filtered.map(p => {
              const inQueue = queue.some(q => q.patient_id === p.id);
              return (
                <div key={p.id} className="p-3 flex items-center gap-3 hover:bg-zinc-50">
                  <div className="w-8 h-8 rounded-xl bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0 overflow-hidden">
                    {p.profile_photo_path ? <img src={`/${p.profile_photo_path}`} className="w-full h-full object-cover" alt="" /> : p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-zinc-800 truncate">{p.full_name}</span>
                  <button onClick={() => addToQueue(p.id)} disabled={inQueue}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${inQueue ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                    {inQueue ? 'Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-zinc-200 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Today's Queue</h1>
            <p className="text-sm text-zinc-500">{queue.filter(q => q.status !== 'done').length} active · {queue.filter(q => q.status === 'done').length} done</p>
          </div>
          <div className="flex gap-2">
            {role === 'admin' && (
              <>
                <button onClick={callNext} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Call Next
                </button>
                <button onClick={() => setResetConfirm(true)} className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-sm font-medium">
                  Reset Queue
                </button>
              </>
            )}
            {role === 'staff' && (
              <button onClick={archiveDay} className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-sm font-medium flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Archive Day
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <ListOrdered className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Queue is empty</p>
              {role === 'staff' && <p className="text-sm mt-1">Search for patients on the left to add them</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(entry => (
                <div key={entry.id}
                  draggable={role === 'staff'}
                  onDragStart={() => setDragId(entry.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(entry.id)}
                  className={`bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4 transition-all ${role === 'staff' ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === entry.id ? 'opacity-50' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600 flex-shrink-0">{entry.position}</div>
                  <div className="w-9 h-9 rounded-xl bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0 overflow-hidden">
                    {entry.profile_photo_path ? <img src={`/${entry.profile_photo_path}`} className="w-full h-full object-cover" alt="" /> : entry.patient_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{entry.patient_name}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${statusColors[entry.status]}`}>{statusLabels[entry.status]}</span>
                  </div>
                  <input defaultValue={entry.remarks || ''} onBlur={e => updateRemarks(entry.id, e.target.value)}
                    placeholder="Remarks..." className="w-32 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:border-emerald-400" />
                  {role === 'admin' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openPatientRecord(entry.patient_id)} className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600" title="View record">
                        <Eye className="w-4 h-4" />
                      </button>
                      {entry.status === 'in_consultation' && (
                        <button onClick={() => setDoneConfirm(entry.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium">Done</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Done confirmation */}
      {doneConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Mark as Done?</h3>
            <p className="text-zinc-400 text-sm mb-5">This will mark the consultation as complete.</p>
            <div className="flex gap-3">
              <button onClick={() => setDoneConfirm(null)} className="flex-1 py-2 bg-zinc-700 text-white rounded-xl text-sm">Cancel</button>
              <button onClick={() => markDone(doneConfirm)} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium">Confirm Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation */}
      {resetConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Reset Queue?</h3>
            <p className="text-zinc-400 text-sm mb-5">This will remove all active queue entries for today.</p>
            <div className="flex gap-3">
              <button onClick={() => setResetConfirm(false)} className="flex-1 py-2 bg-zinc-700 text-white rounded-xl text-sm">Cancel</button>
              <button onClick={resetQueue} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Patient record modal (doctor view) */}
      {viewPatientData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">{viewPatientData.full_name}</h2>
              <button onClick={() => setViewPatientData(null)} className="text-zinc-400 hover:text-zinc-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DetailPanel patient={viewPatientData} token={token} role={role} onClose={() => setViewPatientData(null)} onRefresh={() => openPatientRecord(viewPatientData.id)} isExpanded={false} onToggleExpand={() => {}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
