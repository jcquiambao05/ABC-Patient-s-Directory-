import React, { useState, useRef, useEffect } from 'react';
import { Plus, Save, CheckCircle, Edit3, Trash2, X, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../hooks/useToast';
import { Tooltip, TOOLTIPS } from './Tooltip';
import type { ConsultationRecord } from '../types/index';

interface Props {
  records: ConsultationRecord[];
  token: string;
  patientId: string;
  role: string | null;
  onRefresh: () => void;
}

interface Vitals {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  temp_celsius: number | null;
  heart_rate: number | null;
  spo2: number | null;
  weight_kg: number | null;
  height_cm: number | null;
}

const emptyVitals = (): Vitals => ({
  bp_systolic: null, bp_diastolic: null, temp_celsius: null,
  heart_rate: null, spo2: null, weight_kg: null, height_cm: null,
});

// VitalsInputRow — standalone component outside ConsultationTable.
// Local string state prevents parent re-renders on every keystroke.
// Commits to parent only on onBlur (when user leaves the field).
interface VitalsInputRowProps { vitals: Vitals; onChange: (v: Vitals) => void; }

function VitalsInputRow({ vitals, onChange }: VitalsInputRowProps) {
  const [local, setLocal] = useState<Record<keyof Vitals, string>>({
    bp_systolic:  vitals.bp_systolic  != null ? String(vitals.bp_systolic)  : '',
    bp_diastolic: vitals.bp_diastolic != null ? String(vitals.bp_diastolic) : '',
    temp_celsius: vitals.temp_celsius != null ? String(vitals.temp_celsius) : '',
    heart_rate:   vitals.heart_rate   != null ? String(vitals.heart_rate)   : '',
    spo2:         vitals.spo2         != null ? String(vitals.spo2)         : '',
    weight_kg:    vitals.weight_kg    != null ? String(vitals.weight_kg)    : '',
    height_cm:    vitals.height_cm    != null ? String(vitals.height_cm)    : '',
  });

  // Only sync on mount — we own local state after that
  useEffect(() => {
    setLocal({
      bp_systolic:  vitals.bp_systolic  != null ? String(vitals.bp_systolic)  : '',
      bp_diastolic: vitals.bp_diastolic != null ? String(vitals.bp_diastolic) : '',
      temp_celsius: vitals.temp_celsius != null ? String(vitals.temp_celsius) : '',
      heart_rate:   vitals.heart_rate   != null ? String(vitals.heart_rate)   : '',
      spo2:         vitals.spo2         != null ? String(vitals.spo2)         : '',
      weight_kg:    vitals.weight_kg    != null ? String(vitals.weight_kg)    : '',
      height_cm:    vitals.height_cm    != null ? String(vitals.height_cm)    : '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (field: keyof Vitals, raw: string) => {
    const num = raw.trim() === '' ? null : Number(raw);
    onChange({ ...vitals, [field]: (num !== null && isNaN(num)) ? null : num });
  };

  const inp = (key: keyof Vitals, placeholder: string, step = '1') => (
    <input
      type="number"
      step={step}
      placeholder={placeholder}
      value={local[key]}
      onChange={e => setLocal(l => ({ ...l, [key]: e.target.value }))}
      onBlur={e => commit(key, e.target.value)}
      className="w-full px-3 py-3 bg-white border border-zinc-200 rounded-xl text-xl font-bold text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-center placeholder:text-zinc-300 placeholder:font-normal placeholder:text-sm"
    />
  );

  return (
    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
      <div className="flex items-center gap-1.5 mb-4">
        <Activity className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vitals</span>
        <span className="text-[10px] text-zinc-400 ml-1">— committed on blur, saved when you click Save</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">Blood Pressure<Tooltip text={TOOLTIPS.bp} position="bottom" /></p>
          <div className="flex items-center gap-1">
            {inp('bp_systolic', '120')}
            <span className="text-zinc-400 font-bold text-xl flex-shrink-0">/</span>
            {inp('bp_diastolic', '80')}
          </div>
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">mmHg</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">Temperature<Tooltip text={TOOLTIPS.temp} position="bottom" /></p>
          {inp('temp_celsius', '36.5', '0.1')}
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">°C</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">Heart Rate<Tooltip text={TOOLTIPS.hr} position="bottom" /></p>
          {inp('heart_rate', '72')}
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">bpm</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">SpO2<Tooltip text={TOOLTIPS.spo2} position="bottom" /></p>
          {inp('spo2', '98')}
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">%</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">Weight<Tooltip text={TOOLTIPS.weight} position="bottom" /></p>
          {inp('weight_kg', '60', '0.1')}
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">kg</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2 flex items-center justify-center">Height<Tooltip text={TOOLTIPS.height} position="bottom" /></p>
          {inp('height_cm', '165')}
          <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">cm</p>
        </div>
      </div>
    </div>
  );
}

// VitalsDisplay — read-only large-number cards on saved rows
function VitalsDisplay({ vitals }: { vitals: Record<string, number> }) {
  const cards: { label: string; value: string; unit: string; color: string; bg: string }[] = [];
  if (vitals.bp_systolic && vitals.bp_diastolic)
    cards.push({ label: 'BP', value: `${vitals.bp_systolic}/${vitals.bp_diastolic}`, unit: 'mmHg', color: 'text-red-600', bg: 'bg-red-50 border-red-100' });
  if (vitals.temp_celsius)
    cards.push({ label: 'Temp', value: `${vitals.temp_celsius}`, unit: '°C', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' });
  if (vitals.heart_rate)
    cards.push({ label: 'HR', value: `${vitals.heart_rate}`, unit: 'bpm', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100' });
  if (vitals.spo2)
    cards.push({ label: 'SpO2', value: `${vitals.spo2}`, unit: '%', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' });
  if (vitals.weight_kg)
    cards.push({ label: 'Weight', value: `${vitals.weight_kg}`, unit: 'kg', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' });
  if (vitals.height_cm)
    cards.push({ label: 'Height', value: `${vitals.height_cm}`, unit: 'cm', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' });
  if (cards.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-zinc-100">
      <div className="flex items-center gap-1 mb-2">
        <Activity className="w-3 h-3 text-zinc-400" />
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Vitals</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.map(c => (
          <div key={c.label} className={`flex flex-col items-center border rounded-xl px-3 py-2 min-w-[60px] ${c.bg}`}>
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">{c.label}</span>
            <span className={`text-lg font-bold leading-none ${c.color}`}>{c.value}</span>
            <span className="text-[9px] text-zinc-400 mt-0.5">{c.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Auto-resize textarea
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

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const ref = useAutoResize(value);
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={1} className={className}
      style={{ overflow: 'hidden', resize: 'none' }} />
  );
}

export default function ConsultationTable({ records, token, patientId, role, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ConsultationRecord>>({});
  const [editVitals, setEditVitals] = useState<Vitals>(emptyVitals());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newRow, setNewRow] = useState({ date: new Date().toISOString().split('T')[0], subjective_clinical_findings: '', assessment_plan: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<ConsultationRecord | null>(null);

  const inputCls = 'w-full px-2 py-1.5 bg-white border border-zinc-300 text-zinc-900 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30';

  const startEdit = (r: ConsultationRecord) => {
    setEditingId(r.id);
    setEditData({
      subjective_clinical_findings: r.subjective_clinical_findings || '',
      assessment_plan: r.assessment_plan || '',
      reviewer_notes: r.reviewer_notes || '',
    });
    const v = (r as any).vitals || {};
    setEditVitals({
      bp_systolic: v.bp_systolic ?? null, bp_diastolic: v.bp_diastolic ?? null,
      temp_celsius: v.temp_celsius ?? null, heart_rate: v.heart_rate ?? null,
      spo2: v.spo2 ?? null, weight_kg: v.weight_kg ?? null, height_cm: v.height_cm ?? null,
    });
    setError('');
  };

  const cleanVitals = (v: Vitals): Record<string, number> | null => {
    const cleaned: Record<string, number> = {};
    (Object.keys(v) as (keyof Vitals)[]).forEach(k => {
      if (v[k] !== null && v[k] !== undefined) cleaned[k] = v[k] as number;
    });
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true); setError('');
    try {
      await api(`/api/consultation-records/${editingId}/save`, {
        method: 'PUT',
        body: JSON.stringify({ ...editData, vitals: cleanVitals(editVitals) }),
      }, token);
      setEditingId(null); onRefresh();
      toast.success('Consultation record saved.');
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(`Save failed: ${msg}`);
    }
    finally { setSaving(false); }
  };

  const handleMark = async (id: string) => {
    setSaving(true); setError('');
    try {
      await api(`/api/consultation-records/${id}/mark`, { method: 'PUT', body: '{}' }, token);
      setEditingId(null); onRefresh();
      toast.success('Record marked as reviewed.');
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(`Mark failed: ${msg}`);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api(`/api/consultation-records/${id}`, { method: 'DELETE' }, token); onRefresh(); toast.warn('Consultation record deleted.'); }
    catch (err) { toast.error(`Delete failed: ${(err as Error).message}`); }
  };

  const handleAddNew = async () => {
    try {
      await api('/api/consultation-records', {
        method: 'POST', body: JSON.stringify({ patient_id: patientId, ...newRow }),
      }, token);
      setAddingNew(false);
      setNewRow({ date: new Date().toISOString().split('T')[0], subjective_clinical_findings: '', assessment_plan: '' });
      onRefresh();
      toast.success('New consultation record created.');
    } catch (err) { toast.error(`Could not create record: ${(err as Error).message}`); }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Consultation Record</h3>
          {role === 'staff' && (
            <button onClick={() => setAddingNew(true)}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </button>
          )}
        </div>

        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>}

        {addingNew && (
          <div className="mb-4 border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50/50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">New Consultation Entry</span>
              <button onClick={() => setAddingNew(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-[140px_1fr_1fr] gap-3 items-start">
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Date</label>
                <input type="date" value={newRow.date}
                  onChange={e => setNewRow(n => ({ ...n, date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Subjective / Clinical Findings</label>
                <AutoTextarea value={newRow.subjective_clinical_findings}
                  onChange={v => setNewRow(n => ({ ...n, subjective_clinical_findings: v }))}
                  placeholder="Enter clinical findings..." className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">Assessment / Plan</label>
                <AutoTextarea value={newRow.assessment_plan}
                  onChange={v => setNewRow(n => ({ ...n, assessment_plan: v }))}
                  placeholder="Enter assessment and plan..." className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setAddingNew(false)}
                className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={handleAddNew}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors">Save Entry</button>
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
              <div key={r.id} className={`border rounded-xl overflow-hidden transition-colors ${
                r.reviewed ? 'border-emerald-200 border-l-4 border-l-emerald-400' : 'border-zinc-200'
              }`}>

                {editingId === r.id ? (
                  /* EDIT MODE — full-width stacked, no column cramping */
                  <div className="bg-emerald-50/40 p-4 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">
                          {new Date(r.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        {r.reviewed && r.marked_at && (
                          <div className="flex items-center gap-1 mt-0.5 text-emerald-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-[10px] font-medium">Marked {new Date(r.marked_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={handleSave} disabled={saving}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50">
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                        <button onClick={() => handleMark(r.id)} disabled={saving}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Mark
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-sm transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>

                    <VitalsInputRow vitals={editVitals} onChange={setEditVitals} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Subjective / Clinical Findings</label>
                        <AutoTextarea value={editData.subjective_clinical_findings || ''}
                          onChange={v => setEditData(d => ({ ...d, subjective_clinical_findings: v }))}
                          placeholder="Clinical findings..." className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Assessment / Plan</label>
                        <AutoTextarea value={editData.assessment_plan || ''}
                          onChange={v => setEditData(d => ({ ...d, assessment_plan: v }))}
                          placeholder="Assessment and plan..." className={inputCls} />
                      </div>
                    </div>

                    {role === 'admin' && (
                      <div>
                        <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-1">Doctor Notes</p>
                        <textarea defaultValue={(r as any).doctor_notes || ''}
                          onBlur={async e => {
                            try { await api(`/api/consultation-records/${r.id}/doctor-notes`, { method: 'PATCH', body: JSON.stringify({ doctor_notes: e.target.value }) }, token); }
                            catch { /* silent */ }
                          }}
                          rows={2} placeholder="Private notes..."
                          className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-xs outline-none focus:border-blue-400 resize-none" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* READ-ONLY MODE — original table layout */
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-[140px_1fr_1fr_120px] border-b border-zinc-100 bg-zinc-50" style={{ minWidth: '500px' }}>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Date</div>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Subjective / Clinical Findings</div>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200">Assessment / Plan</div>
                      <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider"></div>
                    </div>
                    <div className="grid grid-cols-[140px_1fr_1fr_120px] bg-white hover:bg-zinc-50/60 transition-colors" style={{ minWidth: '500px' }}>
                      <div className="px-3 py-3 border-r border-zinc-100">
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
                      <div className="px-3 py-3 border-r border-zinc-100">
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          {r.subjective_clinical_findings || <span className="text-zinc-400 italic">—</span>}
                        </p>
                        {(r as any).vitals && Object.keys((r as any).vitals).length > 0 && (
                          <VitalsDisplay vitals={(r as any).vitals} />
                        )}
                      </div>
                      <div className="px-3 py-3 border-r border-zinc-100">
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          {r.assessment_plan || <span className="text-zinc-400 italic">—</span>}
                        </p>
                        {role === 'admin' && (
                          <div className="mt-2 pt-2 border-t border-zinc-100">
                            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-1">Doctor Notes</p>
                            <textarea defaultValue={(r as any).doctor_notes || ''}
                              onBlur={async e => {
                                try { await api(`/api/consultation-records/${r.id}/doctor-notes`, { method: 'PATCH', body: JSON.stringify({ doctor_notes: e.target.value }) }, token); }
                                catch { /* silent */ }
                              }}
                              rows={2} placeholder="Private notes..."
                              className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-xs outline-none focus:border-blue-400 resize-none" />
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-3 flex flex-col gap-1.5">
                        {role === 'staff' && (
                          <>
                            <button onClick={() => startEdit(r)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors">
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            {!r.reviewed && (
                              <button onClick={() => handleMark(r.id)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors">
                                <CheckCircle className="w-3 h-3" /> Mark
                              </button>
                            )}
                            <button onClick={() => setDeleteConfirm(r)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-medium flex items-center gap-1 justify-center transition-colors">
                              <Trash2 className="w-3 h-3" /> Del
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={async () => { const t = deleteConfirm; setDeleteConfirm(null); await handleDelete(t.id); }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
