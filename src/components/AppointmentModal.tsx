import { useState, useEffect } from 'react';
import { X, Calendar, RotateCcw, Loader2, Search, AlertCircle, Copy, CheckCircle2, Link, Clock } from 'lucide-react';
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
interface Doctor { id: string; name: string; display_name: string | null; }
interface Slot { time: string; available: boolean; appointment_count: number; }

const FREQ_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AppointmentModal({ token, patientId: prefillId, patientName: prefillName, defaultDate, onClose, onSaved }: Props) {
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
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState(prefillName || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    prefillId && prefillName ? { id: prefillId, full_name: prefillName } : null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  // Slot picker state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsBlocked, setSlotsBlocked] = useState(false);
  const [slotsNoSchedule, setSlotsNoSchedule] = useState(false);

  useEffect(() => {
    if (prefillId) return;
    api('/api/patients', {}, token).then(setPatients).catch(() => {});
  }, [token, prefillId]);

  // Load doctors for slot picker
  useEffect(() => {
    api('/api/doctors', {}, token)
      .then((data: Doctor[]) => {
        setDoctors(data);
        if (data.length === 1) setSelectedDoctorId(data[0].id);
      })
      .catch(() => {});
  }, [token]);

  // Load available slots when date or doctor changes
  useEffect(() => {
    if (!selectedDoctorId || !form.appointment_date) {
      setSlots([]); return;
    }
    setSlotsLoading(true); setSlotsBlocked(false); setSlotsNoSchedule(false);
    api(`/api/available-slots?doctor_id=${selectedDoctorId}&date=${form.appointment_date}`, {}, token)
      .then((data: { blocked?: boolean; no_schedule?: boolean; slots: Slot[] }) => {
        if (data.blocked) { setSlotsBlocked(true); setSlots([]); return; }
        if (data.no_schedule) { setSlotsNoSchedule(true); setSlots([]); return; }
        setSlots(data.slots || []);
        // Auto-clear time if it's no longer available
        if (form.appointment_time && !data.slots?.find((s: Slot) => s.time === form.appointment_time && s.available)) {
          set({ appointment_time: '' });
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctorId, form.appointment_date, token]);

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const set = (patch: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...patch }));
    const keys = Object.keys(patch);
    setErrors(e => { const next = { ...e }; keys.forEach(k => delete next[k]); return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const pid = selectedPatient?.id || prefillId;
    if (!pid) errs.patient = 'Please select a patient.';
    if (!form.appointment_date) { errs.date = 'Date is required.'; }
    else if (form.appointment_date < today) { errs.date = 'Appointment date cannot be in the past.'; }
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (form.frequency !== 'once') {
      if (form.frequency_every < 1) errs.frequency_every = 'Must be at least 1.';
      if (form.end_date && form.end_date <= form.appointment_date) errs.end_date = 'End date must be after the appointment date.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const pid = selectedPatient?.id || prefillId;
    setSaving(true);
    try {
      const result = await api('/api/appointments', {
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
      if (result.confirm_link) {
        setConfirmLink(result.confirm_link);
      } else {
        onClose();
      }
    } catch (err) {
      setErrors({ _general: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!confirmLink) return;
    navigator.clipboard.writeText(confirmLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const inputCls = (field?: string) =>
    `w-full px-3 py-2 bg-white border rounded-xl text-sm outline-none focus:ring-1 text-zinc-900 transition-colors ${
      field && errors[field]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
        : 'border-zinc-200 focus:border-emerald-400 focus:ring-emerald-400/20'
    }`;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  // ── Confirmation link screen (shown after successful save) ─────────────
  if (confirmLink) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Appointment Saved</h2>
                <p className="text-xs text-zinc-500">Status: Pending patient confirmation</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                <Link className="w-4 h-4" /> Patient Confirmation Link
              </p>
              <p className="text-xs text-emerald-700 mb-3">
                Send this link to the patient via SMS or messaging app. They tap it to confirm their appointment. The link expires in 48 hours.
              </p>
              <div className="flex items-start gap-2 p-3 bg-white border border-emerald-300 rounded-lg">
                <p className="flex-1 text-xs text-zinc-600 font-mono break-all leading-relaxed">{confirmLink}</p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors mt-0.5"
                >
                  {copied
                    ? <><CheckCircle2 className="w-3 h-3" /> Copied!</>
                    : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500 space-y-1">
              <p>• Appointment is <strong className="text-zinc-700">pending</strong> until the patient confirms</p>
              <p>• If not confirmed in 48h, a reminder will be sent automatically</p>
              <p>• You can view the status in the Appointments calendar</p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <button onClick={onClose} className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main appointment form ──────────────────────────────────────────────
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
          {errors._general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors._general}
            </div>
          )}

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

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input value={form.title} onChange={e => set({ title: e.target.value })} className={inputCls('title')} placeholder="Follow-up Consultation" />
            <FieldError field="title" />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input type="date" value={form.appointment_date} min={today}
              onChange={e => set({ appointment_date: e.target.value })} className={inputCls('date')} />
            <FieldError field="date" />
          </div>

          {/* Slot picker — shows available slots from doctor schedule; falls back to free-form time */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time Slot
            </label>
            {doctors.length > 1 && (
              <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}
                className={`${inputCls()} mb-2`}>
                <option value="">Select doctor...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.display_name || d.name}</option>
                ))}
              </select>
            )}
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading available slots...
              </div>
            ) : slotsBlocked ? (
              <p className="text-xs text-red-500 py-2">This date is blocked — no consultations scheduled.</p>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map(s => (
                  <button key={s.time} type="button"
                    disabled={!s.available}
                    onClick={() => set({ appointment_time: s.time })}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                      form.appointment_time === s.time
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : s.available
                          ? 'bg-white text-zinc-700 border-zinc-200 hover:border-emerald-300'
                          : 'bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed line-through'
                    }`}>
                    {s.time}
                    {s.appointment_count > 0 && s.available && (
                      <span className="block text-[9px] opacity-60">{s.appointment_count} booked</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* No schedule set or no doctor selected — free-form time fallback */
              <input type="time" value={form.appointment_time}
                onChange={e => set({ appointment_time: e.target.value })} className={inputCls()} />
            )}
          </div>

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

          {form.frequency !== 'once' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">
                  Every ({form.frequency === 'weekly' ? 'weeks' : form.frequency === 'monthly' ? 'months' : 'years'})
                </label>
                <input type="number" min={1} max={52} value={form.frequency_every}
                  onChange={e => set({ frequency_every: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={inputCls('frequency_every')} />
                <FieldError field="frequency_every" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">End Date</label>
                <input type="date" value={form.end_date} min={form.appointment_date || today}
                  onChange={e => set({ end_date: e.target.value })} className={inputCls('end_date')} />
                <FieldError field="end_date" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={2}
              placeholder="Any special instructions..." className={`${inputCls()} resize-none`} />
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
