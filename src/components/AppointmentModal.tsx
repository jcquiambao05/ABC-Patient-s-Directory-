import React, { useState, useEffect } from 'react';
import { X, Calendar, RotateCcw, Loader2, Search, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  token: string;
  patientId?: string;
  patientName?: string;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Patient { id: string; full_name: string; }

const FREQ_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AppointmentModal({ token, patientId: prefillId, patientName: prefillName, defaultDate, onClose, onSaved }: Props) {
  // Use today as the minimum — allow today itself
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;

  const [form, setForm] = useState({
    title: 'Follow-up Consultation',
    appointment_date: defaultDate && defaultDate >= today ? defaultDate : today,
    appointment_time: '09:00',
    frequency: 'once',
    frequency_every: 1,
    end_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Patient search
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState(prefillName || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    prefillId && prefillName ? { id: prefillId, full_name: prefillName } : null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (prefillId) return;
    api('/api/patients', {}, token).then(setPatients).catch(() => {});
  }, [token, prefillId]);

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const set = (patch: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...patch }));
    // Clear related errors on change
    const keys = Object.keys(patch);
    setErrors(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const pid = selectedPatient?.id || prefillId;

    if (!pid) errs.patient = 'Please select a patient.';
    if (!form.appointment_date) {
      errs.date = 'Date is required.';
    } else if (form.appointment_date < today) {
      errs.date = 'Appointment date cannot be in the past.';
    }
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (form.frequency !== 'once') {
      if (form.frequency_every < 1) errs.frequency_every = 'Must be at least 1.';
      if (form.end_date && form.end_date <= form.appointment_date) {
        errs.end_date = 'End date must be after the appointment date.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const pid = selectedPatient?.id || prefillId;
    setSaving(true);
    try {
      await api('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: pid,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time || null,
          frequency: form.frequency,
          frequency_every: form.frequency_every,
          end_date: form.frequency !== 'once' && form.end_date ? form.end_date : null,
        }),
      }, token);
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ _general: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field?: string) =>
    `w-full px-3 py-2 bg-white border rounded-xl text-sm outline-none focus:ring-1 text-zinc-900 transition-colors ${
      field && errors[field]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
        : 'border-zinc-200 focus:border-emerald-400 focus:ring-emerald-400/20'
    }`;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Schedule Appointment</h2>
              {(selectedPatient || prefillName) && (
                <p className="text-xs text-zinc-500">{selectedPatient?.full_name || prefillName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* General error */}
          {errors._general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors._general}
            </div>
          )}

          {/* Patient search — only when not pre-filled */}
          {!prefillId && (
            <div className="relative">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                Patient <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedPatient(null); setShowDropdown(true); setErrors(er => { const n={...er}; delete n.patient; return n; }); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search patient name..."
                  className={`${inputCls('patient')} pl-9`}
                />
              </div>
              {showDropdown && filtered.length > 0 && !selectedPatient && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                  {filtered.map(p => (
                    <button key={p.id} type="button"
                      onMouseDown={() => { setSelectedPatient(p); setSearch(p.full_name); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      {p.full_name}
                    </button>
                  ))}
                </div>
              )}
              <FieldError field="patient" />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input value={form.title} onChange={e => set({ title: e.target.value })} className={inputCls('title')} placeholder="Follow-up Consultation" />
            <FieldError field="title" />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.appointment_date}
                min={today}
                onChange={e => set({ appointment_date: e.target.value })}
                className={inputCls('date')}
              />
              <FieldError field="date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Time</label>
              <input type="time" value={form.appointment_time} onChange={e => set({ appointment_time: e.target.value })} className={inputCls()} />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Recurrence
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {FREQ_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set({ frequency: opt.value })}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                    form.frequency === opt.value
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-emerald-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring options */}
          {form.frequency !== 'once' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">
                  Every ({form.frequency === 'weekly' ? 'weeks' : form.frequency === 'monthly' ? 'months' : 'years'})
                </label>
                <input
                  type="number" min={1} max={52}
                  value={form.frequency_every}
                  onChange={e => set({ frequency_every: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={inputCls('frequency_every')}
                />
                <FieldError field="frequency_every" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.appointment_date || today}
                  onChange={e => set({ end_date: e.target.value })}
                  className={inputCls('end_date')}
                />
                <FieldError field="end_date" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set({ notes: e.target.value })}
              rows={2}
              placeholder="Any special instructions..."
              className={`${inputCls()} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Appointment
          </button>
        </div>
      </div>
    </div>
  );
}
