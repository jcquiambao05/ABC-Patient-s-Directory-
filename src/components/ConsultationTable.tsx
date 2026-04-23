import React, { useState, useRef, useEffect } from 'react';
import { Plus, Save, CheckCircle, Edit3, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { ConsultationRecord } from '../types/index';

interface Props {
  records: ConsultationRecord[];
  token: string;
  patientId: string;
  role: string | null;
  onRefresh: () => void;
}

// Auto-resize textarea hook
function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);
  return ref;
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useAutoResize(value);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={className}
      style={{ overflow: 'hidden', resize: 'none' }}
    />
  );
}

export default function ConsultationTable({ records, token, patientId, role, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ConsultationRecord>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newRow, setNewRow] = useState({ date: new Date().toISOString().split('T')[0], subjective_clinical_findings: '', assessment_plan: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<ConsultationRecord | null>(null);

  const startEdit = (r: ConsultationRecord) => {
    setEditingId(r.id);
    setEditData({
      subjective_clinical_findings: r.subjective_clinical_findings || '',
      assessment_plan: r.assessment_plan || '',
      reviewer_notes: r.reviewer_notes || '',
    });
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

  const inputCls = 'w-full px-2 py-1.5 bg-white border border-zinc-300 text-zinc-900 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30';

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Consultation Record</h3>
          {role === 'staff' && (
            <button
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>
        )}

        {/* New record entry box — visually separate */}
        {addingNew && (
          <div className="mb-4 border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50/50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">New Consultation Entry</span>
              <button onClick={() => setAddingNew(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-[140px_1fr_1fr] gap-3 items-start">
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Date</label>
                <input
                  type="date"
                  value={newRow.date}
                  onChange={e => setNewRow(n => ({ ...n, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Subjective / Clinical Findings</label>
                <AutoTextarea
                  value={newRow.subjective_clinical_findings}
                  onChange={v => setNewRow(n => ({ ...n, subjective_clinical_findings: v }))}
                  placeholder="Enter clinical findings..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Assessment / Plan</label>
                <AutoTextarea
                  value={newRow.assessment_plan}
                  onChange={v => setNewRow(n => ({ ...n, assessment_plan: v }))}
                  placeholder="Enter assessment and plan..."
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setAddingNew(false)} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={handleAddNew} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors">Save Entry</button>
            </div>
          </div>
        )}

        {records.length === 0 && !addingNew ? (
          <div className="text-center py-10 text-zinc-400 text-sm border border-zinc-200 rounded-xl">
            No consultation records yet
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(r => (
              <div
                key={r.id}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  r.reviewed
                    ? 'border-emerald-200 border-l-4 border-l-emerald-400'
                    : 'border-zinc-200'
                }`}
              >
                {/* Horizontal scroll wrapper for mobile */}
                <div className="overflow-x-auto">
                {/* Table header row */}
                <div className="grid grid-cols-[140px_1fr_1fr_120px] border-b border-zinc-100 bg-zinc-50" style={{ minWidth: '500px' }}>
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Date</div>
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Subjective / Clinical Findings</div>
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Assessment / Plan</div>
                  <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider"></div>
                </div>

                {/* Data row */}
                <div className={`grid grid-cols-[140px_1fr_1fr_120px] ${editingId === r.id ? 'bg-emerald-50/40' : 'bg-white hover:bg-zinc-50/60'} transition-colors`} style={{ minWidth: '500px' }}>
                  {/* Date cell */}
                  <div className="px-3 py-3 border-r border-zinc-100 align-top">
                    <div className="text-sm text-zinc-800 font-medium">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {r.reviewed && r.marked_at && (
                      <div className="flex items-center gap-1 mt-1.5 text-emerald-600">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Marked {new Date(r.marked_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Subjective cell */}
                  <div className="px-3 py-3 border-r border-zinc-100">
                    {editingId === r.id ? (
                      <AutoTextarea
                        value={editData.subjective_clinical_findings || ''}
                        onChange={v => setEditData(d => ({ ...d, subjective_clinical_findings: v }))}
                        placeholder="Clinical findings..."
                        className={inputCls}
                      />
                    ) : (
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {r.subjective_clinical_findings || <span className="text-zinc-400 italic">—</span>}
                      </p>
                    )}
                  </div>

                  {/* Assessment cell */}
                  <div className="px-3 py-3 border-r border-zinc-100">
                    {editingId === r.id ? (
                      <AutoTextarea
                        value={editData.assessment_plan || ''}
                        onChange={v => setEditData(d => ({ ...d, assessment_plan: v }))}
                        placeholder="Assessment and plan..."
                        className={inputCls}
                      />
                    ) : (
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {r.assessment_plan || <span className="text-zinc-400 italic">—</span>}
                      </p>
                    )}
                    {/* Admin doctor notes */}
                    {role === 'admin' && (
                      <div className="mt-2 pt-2 border-t border-zinc-100">
                        <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-1">Doctor Notes</p>
                        <textarea
                          defaultValue={(r as any).doctor_notes || ''}
                          onBlur={async e => {
                            try { await api(`/api/consultation-records/${r.id}/doctor-notes`, { method: 'PATCH', body: JSON.stringify({ doctor_notes: e.target.value }) }, token); }
                            catch { /* silent */ }
                          }}
                          rows={2}
                          placeholder="Private notes..."
                          className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-xs outline-none focus:border-blue-400 resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions cell */}
                  <div className="px-3 py-3 flex flex-col gap-1.5">
                    {role === 'staff' && (
                      editingId === r.id ? (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors disabled:opacity-50"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => handleMark(r.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3" /> Mark
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          {!r.reviewed && (
                            <button
                              onClick={() => handleMark(r.id)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" /> Mark
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(r)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Del
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
                </div> {/* end scroll wrapper */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Delete Consultation Record?</h3>
            </div>
            <p className="text-zinc-500 text-sm mb-1">
              Record from <span className="text-zinc-800 font-medium">
                {new Date(deleteConfirm.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </p>
            <p className="text-zinc-400 text-xs mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = deleteConfirm;
                  setDeleteConfirm(null);
                  await handleDelete(target.id);
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
