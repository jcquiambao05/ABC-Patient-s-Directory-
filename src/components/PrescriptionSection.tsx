import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Camera, Loader2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Prescription } from '../types/index';

interface Props {
  patientId: string;
  token: string;
  role: string | null;
}

export default function PrescriptionSection({ patientId, token, role }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/prescriptions/${patientId}`, {}, token);
      setPrescriptions(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [patientId, token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        fd.append('patient_id', patientId);
        fd.append('type', 'photo');
        await fetch('/api/prescriptions', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      } else {
        await api('/api/prescriptions', { method: 'POST', body: JSON.stringify({ patient_id: patientId, type: 'typed', ...form }) }, token);
      }
      setShowForm(false);
      setPhotoFile(null);
      setForm({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });
      load();
    } catch (err) { alert((err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prescription?')) return;
    try { await api(`/api/prescriptions/${id}`, { method: 'DELETE' }, token); load(); }
    catch (err) { alert((err as Error).message); }
  };

  const inputCls = 'mt-0.5 w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:border-emerald-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-700">Prescriptions</h3>
        {role === 'admin' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Prescription
          </button>
        )}
      </div>

      {/* New prescription form (admin only) */}
      {showForm && role === 'admin' && (
        <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-zinc-50">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-emerald-600 transition-colors">
              <Camera className="w-4 h-4" />
              <span>{photoFile ? 'Change photo' : 'Upload photo instead'}</span>
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
            {photoFile && <span className="text-xs text-emerald-600 truncate max-w-32">{photoFile.name}</span>}
          </div>

          {!photoFile && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-zinc-500">Medication Name</label><input value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-zinc-500">Dosage</label><input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-zinc-500">Frequency</label><input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-zinc-500">Duration</label><input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className={inputCls} /></div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500">Instructions</label>
                <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors">Save</button>
            <button onClick={() => { setShowForm(false); setPhotoFile(null); }} className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Prescription list */}
      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm">No prescriptions recorded</div>
      ) : (
        <div className="space-y-2">
          {prescriptions.map(rx => (
            <div key={rx.id} className="border border-zinc-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-zinc-800 text-sm">
                      {rx.type === 'photo' ? 'Photo Prescription' : rx.medication_name || 'Prescription'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rx.type === 'photo' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {rx.type}
                    </span>
                  </div>
                  {rx.type === 'typed' && (
                    <p className="text-xs text-zinc-500">{[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ')}</p>
                  )}
                  {rx.instructions && <p className="text-xs text-zinc-400 mt-0.5">{rx.instructions}</p>}
                  {rx.photo_path && (
                    <a href={`/${rx.photo_path}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                      View photo
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs text-zinc-400">{new Date(rx.created_at).toLocaleDateString()}</span>
                  {role === 'admin' && (
                    <button onClick={() => handleDelete(rx.id)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
