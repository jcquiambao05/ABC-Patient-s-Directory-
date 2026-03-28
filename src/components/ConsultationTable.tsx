import React, { useState } from 'react';
import { Plus, Save, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { ConsultationRecord } from '../types/index';

interface Props {
  records: ConsultationRecord[];
  token: string;
  patientId: string;
  role: string | null;
  onRefresh: () => void;
}

export default function ConsultationTable({ records, token, patientId, role, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ConsultationRecord>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newRow, setNewRow] = useState({ date: new Date().toISOString().split('T')[0], subjective_clinical_findings: '', assessment_plan: '' });

  const startEdit = (r: ConsultationRecord) => {
    setEditingId(r.id);
    setEditData({ subjective_clinical_findings: r.subjective_clinical_findings || '', assessment_plan: r.assessment_plan || '', reviewer_notes: r.reviewer_notes || '' });
    setError('');
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true); setError('');
    try {
      await api(`/api/consultation-records/${editingId}/save`, { method: 'PUT', body: JSON.stringify(editData) }, token);
      setEditingId(null); onRefresh();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleMark = async (id: string) => {
    setSaving(true); setError('');
    try {
      await api(`/api/consultation-records/${id}/mark`, { method: 'PUT', body: '{}' }, token);
      setEditingId(null); onRefresh();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try { await api(`/api/consultation-records/${id}`, { method: 'DELETE' }, token); onRefresh(); }
    catch (err) { alert((err as Error).message); }
  };

  const handleAddNew = async () => {
    try {
      await api('/api/consultation-records', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...newRow }) }, token);
      setAddingNew(false);
      setNewRow({ date: new Date().toISOString().split('T')[0], subjective_clinical_findings: '', assessment_plan: '' });
      onRefresh();
    } catch (err) { alert((err as Error).message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Consultation Record</h3>
        {role === 'staff' && (
          <button onClick={() => setAddingNew(true)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
        )}
      </div>

      {error && <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}

      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/80">
              <th className="px-3 py-2.5 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider w-28">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Subjective / Clinical Findings</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Assessment / Plan</th>
              <th className="px-3 py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {addingNew && (
              <tr className="bg-emerald-500/5">
                <td className="px-3 py-2"><input type="date" value={newRow.date} onChange={e => setNewRow(n => ({ ...n, date: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 text-xs outline-none" /></td>
                <td className="px-3 py-2"><textarea value={newRow.subjective_clinical_findings} onChange={e => setNewRow(n => ({ ...n, subjective_clinical_findings: e.target.value }))} rows={2} className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 text-xs outline-none resize-none" /></td>
                <td className="px-3 py-2"><textarea value={newRow.assessment_plan} onChange={e => setNewRow(n => ({ ...n, assessment_plan: e.target.value }))} rows={2} className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 text-xs outline-none resize-none" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={handleAddNew} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs">Save</button>
                    <button onClick={() => setAddingNew(false)} className="px-2 py-1 bg-zinc-700 text-white rounded text-xs">Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            {records.length === 0 && !addingNew && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500 text-sm">No consultation records yet</td></tr>
            )}
            {records.map(r => (
              <tr key={r.id} className={`${r.reviewed ? 'bg-emerald-500/5' : 'bg-zinc-900/30'} hover:bg-zinc-800/30 transition-colors`}>
                <td className="px-3 py-3 text-zinc-300 text-xs align-top">
                  <div>{new Date(r.date).toLocaleDateString()}</div>
                  {r.reviewed && r.marked_at && (
                    <div className="flex items-center gap-1 mt-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-[10px]">Marked {new Date(r.marked_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {editingId === r.id
                    ? <textarea value={editData.subjective_clinical_findings || ''} onChange={e => setEditData(d => ({ ...d, subjective_clinical_findings: e.target.value }))} rows={3} className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 text-xs outline-none resize-none" />
                    : <span className="text-zinc-300 text-xs">{r.subjective_clinical_findings || <span className="text-zinc-600">—</span>}</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  {editingId === r.id
                    ? <textarea value={editData.assessment_plan || ''} onChange={e => setEditData(d => ({ ...d, assessment_plan: e.target.value }))} rows={3} className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 text-xs outline-none resize-none" />
                    : <span className="text-zinc-300 text-xs">{r.assessment_plan || <span className="text-zinc-600">—</span>}</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  {role === 'staff' && (
                    <div className="flex flex-col gap-1">
                      {editingId === r.id ? (
                        <>
                          <button onClick={handleSave} disabled={saving} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs flex items-center gap-1 justify-center"><Save className="w-3 h-3" /> Save</button>
                          <button onClick={() => handleMark(r.id)} disabled={saving} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs flex items-center gap-1 justify-center"><CheckCircle className="w-3 h-3" /> Mark</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs flex items-center gap-1 justify-center"><Edit3 className="w-3 h-3" /> Edit</button>
                          {!r.reviewed && <button onClick={() => handleMark(r.id)} className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-xs flex items-center gap-1 justify-center"><CheckCircle className="w-3 h-3" /> Mark</button>}
                          <button onClick={() => handleDelete(r.id)} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1 justify-center"><Trash2 className="w-3 h-3" /> Del</button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
