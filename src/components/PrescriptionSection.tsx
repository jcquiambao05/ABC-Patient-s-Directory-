import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, X, Edit3, Save } from 'lucide-react';
import { api } from '../lib/api';

interface Prescription {
  id: string;
  patient_id: string;
  type: 'typed' | 'photo';
  medication_name: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  photo_path: string | null;
  created_at: string;
}

interface Props {
  patientId: string;
  token: string;
  role: string | null;
}

const emptyForm = { medication_name: '', dosage: '', instructions: '' };

export default function PrescriptionSection({ patientId, token, role }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const canEdit = role === 'admin' || role === 'superadmin';

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/prescriptions/${patientId}`, {}, token);
      setPrescriptions(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [patientId, token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.medication_name.trim()) { setFormError('Medicine name is required.'); return; }
    setSaving(true); setFormError('');
    try {
      await api('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          type: 'typed',
          medication_name: form.medication_name.trim(),
          dosage: form.dosage.trim(),
          instructions: form.instructions.trim(),
        }),
      }, token);
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) { setFormError((err as Error).message); }
    finally { setSaving(false); }
  };

  const startEdit = (rx: Prescription) => {
    setEditingId(rx.id);
    setEditForm({
      medication_name: rx.medication_name || '',
      dosage: rx.dosage || '',
      instructions: rx.instructions || '',
    });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      await api(`/api/prescriptions/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          medication_name: editForm.medication_name.trim(),
          dosage: editForm.dosage.trim(),
          instructions: editForm.instructions.trim(),
        }),
      }, token);
      setEditingId(null);
      await load();
    } catch (err) { alert((err as Error).message); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prescription?')) return;
    try { await api(`/api/prescriptions/${id}`, { method: 'DELETE' }, token); load(); }
    catch (err) { alert((err as Error).message); }
  };

  const inputCls = 'w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 text-zinc-900';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-700">Prescriptions</h3>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Prescription
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && canEdit && (
        <div className="border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">New Prescription</span>
            <button onClick={() => { setShowForm(false); setFormError(''); setForm(emptyForm); }} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {formError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{formError}</div>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-500 font-medium block mb-1">Medicine Name <span className="text-red-400">*</span></label>
              <input value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} placeholder="e.g. Amoxicillin 500mg" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">Quantity</label>
              <input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 30 capsules" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">Remarks</label>
              <input value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take after meals" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setFormError(''); setForm(emptyForm); }} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Prescription
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border border-zinc-200 rounded-xl">No prescriptions recorded</div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-2.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200 w-28">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Medicine Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200 w-32">Quantity</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Remarks</th>
                {canEdit && <th className="px-4 py-2.5 w-20 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {prescriptions.map(rx => (
                <tr key={rx.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-4 py-3 text-zinc-600 text-xs border-r border-zinc-100 align-top whitespace-nowrap">
                    {new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 border-r border-zinc-100 align-top">
                    {editingId === rx.id ? (
                      <input value={editForm.medication_name} onChange={e => setEditForm(f => ({ ...f, medication_name: e.target.value }))} className={inputCls} />
                    ) : (
                      <span className="text-zinc-800 font-medium">{rx.medication_name || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-zinc-100 align-top">
                    {editingId === rx.id ? (
                      <input value={editForm.dosage} onChange={e => setEditForm(f => ({ ...f, dosage: e.target.value }))} className={inputCls} />
                    ) : (
                      <span className="text-zinc-600">{rx.dosage || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-zinc-100 align-top">
                    {editingId === rx.id ? (
                      <input value={editForm.instructions} onChange={e => setEditForm(f => ({ ...f, instructions: e.target.value }))} className={inputCls} />
                    ) : (
                      <span className="text-zinc-600">{rx.instructions || '—'}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-3 align-top">
                      {editingId === rx.id ? (
                        <div className="flex gap-1">
                          <button onClick={handleEditSave} disabled={editSaving} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors" title="Save">
                            {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(rx)} className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(rx.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
