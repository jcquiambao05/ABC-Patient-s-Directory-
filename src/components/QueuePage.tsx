2
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ListOrdered, UserCheck, ClipboardList, Eye, X, UserPlus, Upload, CalendarPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import DetailPanel from './DetailPanel';
import AddPatientModal from './AddPatientModal';
import AIUploadPreviewModal from './AIUploadPreviewModal';
import AppointmentModal from './AppointmentModal';
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
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAIUpload, setShowAIUpload] = useState(false);
  // Appointment state — shown after marking done
  const [appointmentEntry, setAppointmentEntry] = useState<QueueEntry | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

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

  const handleNewPatientSaved = async () => {
    // Reload patients, then find the newest one and add to queue
    try {
      const updated: Patient[] = await api('/api/patients', {}, token);
      setPatients(updated);
      if (updated.length > 0) {
        const newest = updated[0]; // ordered by created_at DESC
        await api('/api/queue', { method: 'POST', body: JSON.stringify({ patient_id: newest.id }) }, token);
        await loadQueue();
      }
    } catch (err) { console.error(err); }
    setShowAddPatient(false);
  };

  const callNext = async () => {
    const next = queue.find(q => q.status === 'waiting');
    if (!next) return;
    try { await api(`/api/queue/${next.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'in_consultation' }) }, token); loadQueue(); }
    catch (err) { alert((err as Error).message); }
  };

  const markDone = async (id: string) => {
    try {
      await api(`/api/queue/${id}/done`, { method: 'PATCH', body: '{}' }, token);
      setDoneConfirm(null);
      loadQueue();
      // Find the entry to offer appointment scheduling
      const entry = queue.find(q => q.id === id);
      if (entry) setAppointmentEntry(entry);
    } catch (err) { alert((err as Error).message); }
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
    <div className="flex-1 flex overflow-hidden bg-zinc-50 flex-col md:flex-row">
      {/* Staff: patient search panel — hidden on mobile, shown on md+ */}
      {role === 'staff' && (
        <div className="hidden md:flex w-80 lg:w-96 bg-white border-r border-zinc-200 flex-col flex-shrink-0">
          <div className="p-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg text-zinc-900">Add to Queue</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowAIUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                  <Upload className="w-4 h-4" /> AI Upload
                </button>
                <button onClick={() => setShowAddPatient(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
                  <UserPlus className="w-4 h-4" /> New Patient
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
                className="w-full pl-10 pr-3 py-3 bg-zinc-100 rounded-xl text-base outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filtered.map(p => {
              const inQueue = queue.some(q => q.patient_id === p.id);
              return (
                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-zinc-50">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 flex-shrink-0 overflow-hidden">
                    {p.profile_photo_path ? <img src={`/${p.profile_photo_path}`} className="w-full h-full object-cover" alt="" /> : p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <span className="flex-1 text-base text-zinc-800 truncate">{p.full_name}</span>
                  <button onClick={() => addToQueue(p.id)} disabled={inQueue}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${inQueue ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
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
        <div className="p-4 md:p-5 border-b border-zinc-200 bg-white flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Today's Queue</h1>
            <p className="text-sm md:text-base text-zinc-500">{queue.filter(q => q.status !== 'done').length} active · {queue.filter(q => q.status === 'done').length} done</p>
          </div>
          <div className="flex gap-2">
            {role === 'admin' && (
              <>
                <button onClick={callNext} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-base font-medium flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Call Next
                </button>
                <button onClick={() => setResetConfirm(true)} className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-base font-medium">
                  Reset Queue
                </button>
              </>
            )}
            {role === 'staff' && (
              <button onClick={archiveDay} className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl text-base font-medium flex items-center gap-2">
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
                  onDoubleClick={() => openPatientRecord(entry.patient_id)}
                  title="Double-click to view patient record"
                  className={`bg-white border border-zinc-200 rounded-xl p-3 md:py-5 md:px-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 transition-all ${role === 'staff' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${dragId === entry.id ? 'opacity-50' : ''}`}>
                  {/* Top row: position + avatar + name + status */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600 flex-shrink-0">{entry.position}</div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 flex-shrink-0 overflow-hidden">
                      {entry.profile_photo_path ? <img src={`/${entry.profile_photo_path}`} className="w-full h-full object-cover" alt="" /> : entry.patient_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-base text-zinc-900 truncate">{entry.patient_name}</p>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={entry.status}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.18 }}
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[entry.status]}`}>
                            {statusLabels[entry.status]}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      {entry.status !== 'done' && (
                        <span className="text-xs text-zinc-400">
                          {(() => {
                            const mins = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 60000);
                            if (mins < 1) return 'just added';
                            if (mins < 60) return `${mins}m waiting`;
                            return `${Math.floor(mins/60)}h ${mins%60}m waiting`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bottom row on mobile: remarks + actions */}
                  <div className="flex items-center gap-2 md:contents">
                    <input defaultValue={entry.remarks || ''} onBlur={e => updateRemarks(entry.id, e.target.value)}
                      placeholder="Remarks..." className="flex-1 md:w-48 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-emerald-400" onClick={e => e.stopPropagation()} />
                    {role === 'admin' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openPatientRecord(entry.patient_id)} className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600" title="View record">
                          <Eye className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        {entry.status === 'in_consultation' && (
                          <button onClick={() => setDoneConfirm(entry.id)} className="px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Done</button>
                        )}
                      </div>
                    )}
                  </div>
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

      {/* Patient record modal (doctor/staff double-click view) */}
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
      {showAddPatient && (
        <AddPatientModal
          token={token}
          onClose={() => setShowAddPatient(false)}
          onSaved={handleNewPatientSaved}
        />
      )}

      {showAIUpload && (
        <AIUploadPreviewModal
          token={token}
          onClose={() => setShowAIUpload(false)}
          onSaved={async (patientId) => {
            setShowAIUpload(false);
            try {
              const updated: Patient[] = await api('/api/patients', {}, token);
              setPatients(updated);
              await api('/api/queue', { method: 'POST', body: JSON.stringify({ patient_id: patientId }) }, token);
              await loadQueue();
            } catch (err) { console.error(err); }
          }}
        />
      )}

      {/* Post-done appointment prompt */}
      {appointmentEntry && !showAppointmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CalendarPlus className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Consultation Complete</h3>
                <p className="text-sm text-zinc-500">{appointmentEntry.patient_name}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 mb-5">Would you like to schedule a follow-up appointment for this patient?</p>
            <div className="flex gap-3">
              <button onClick={() => setAppointmentEntry(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Not Now
              </button>
              <button onClick={() => setShowAppointmentModal(true)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5">
                <CalendarPlus className="w-4 h-4" /> Make Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment modal */}
      {appointmentEntry && showAppointmentModal && (
        <AppointmentModal
          token={token}
          patientId={appointmentEntry.patient_id}
          patientName={appointmentEntry.patient_name}
          onClose={() => { setShowAppointmentModal(false); setAppointmentEntry(null); }}
          onSaved={() => { setShowAppointmentModal(false); setAppointmentEntry(null); }}
        />
      )}
    </div>
  );
}