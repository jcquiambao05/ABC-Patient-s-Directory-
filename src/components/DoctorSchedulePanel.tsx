import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../hooks/useToast';

interface Props {
  token: string;
  role: string | null;
}

interface Schedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_patients_per_slot: number;
  is_active: boolean;
}

interface ScheduleBlock {
  id: string;
  doctor_id: string;
  block_date: string;
  reason: string | null;
}

// Safe date formatter — handles 'YYYY-MM-DD' and full ISO timestamps from DB
function formatBlockDate(raw: string): string {
  const dateOnly = raw.split('T')[0];
  const d = new Date(dateOnly + 'T12:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLINIC_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat

export default function DoctorSchedulePanel({ token, role }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [dayForms, setDayForms] = useState<Record<number, {
    enabled: boolean;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    max_patients_per_slot: number;
  }>>({});

  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sched, blk] = await Promise.all([
        api('/api/doctor-schedules', {}, token),
        api('/api/schedule-blocks', {}, token),
      ]);
      setSchedules(sched);
      setBlocks(blk);

      const forms: typeof dayForms = {};
      CLINIC_DAYS.forEach(day => {
        const existing = sched.find((s: Schedule) => s.day_of_week === day);
        forms[day] = existing ? {
          enabled: existing.is_active,
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time.slice(0, 5),
          slot_duration_minutes: existing.slot_duration_minutes,
          max_patients_per_slot: existing.max_patients_per_slot,
        } : {
          enabled: false,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
          max_patients_per_slot: 1,
        };
      });
      setDayForms(forms);
    } catch (err) { setError((err as Error).message); toast.error(`Load failed: ${(err as Error).message}`); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSaveDay = async (day: number) => {
    const form = dayForms[day];
    if (!form) return;
    setSaving(day); setError('');
    try {
      if (!form.enabled) {
        const existing = schedules.find(s => s.day_of_week === day);
        if (existing) await api(`/api/doctor-schedules/${existing.id}`, { method: 'DELETE' }, token);
      } else {
        await api('/api/doctor-schedules', {
          method: 'POST',
          body: JSON.stringify({
            day_of_week: day,
            start_time: form.start_time,
            end_time: form.end_time,
            slot_duration_minutes: form.slot_duration_minutes,
            max_patients_per_slot: form.max_patients_per_slot,
            is_active: true,
          }),
        }, token);
      }
      await load();
      toast.success('Schedule saved.');
    } catch (err) { setError((err as Error).message); toast.error(`Save failed: ${(err as Error).message}`); }
    finally { setSaving(null); }
  };

  const handleAddBlock = async () => {
    if (!blockDate) return;
    setAddingBlock(true); setError('');
    try {
      await api('/api/schedule-blocks', {
        method: 'POST',
        body: JSON.stringify({ block_date: blockDate, reason: blockReason || null }),
      }, token);
      setBlockDate(''); setBlockReason('');
      await load();
      toast.success('Date blocked successfully.');
    } catch (err) { setError((err as Error).message); toast.error(`Could not block date: ${(err as Error).message}`); }
    finally { setAddingBlock(false); }
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await api(`/api/schedule-blocks/${id}`, { method: 'DELETE' }, token);
      await load();
      toast.success('Date unblocked.');
    } catch (err) { toast.error(`Could not remove block: ${(err as Error).message}`); }
  };

  const updateForm = (day: number, patch: Partial<typeof dayForms[number]>) => {
    setDayForms(f => ({ ...f, [day]: { ...f[day], ...patch } }));
  };

  const slotCount = (day: number) => {
    const form = dayForms[day];
    if (!form || !form.enabled) return 0;
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) return 0;
    return Math.floor(totalMin / form.slot_duration_minutes);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
    </div>
  );

  // Read-only view for staff
  if (role === 'staff') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 mb-1">Doctor's Schedule</h2>
          <p className="text-xs text-zinc-500">Available consultation days and hours.</p>
        </div>
        {schedules.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 text-sm">No schedule set yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {schedules.filter(s => s.is_active).map(s => (
              <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4">
                <p className="font-semibold text-zinc-900 text-sm">{DAYS[s.day_of_week]}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {s.slot_duration_minutes} min slots · {s.max_patients_per_slot} patient{s.max_patients_per_slot !== 1 ? 's' : ''}/slot
                </p>
              </div>
            ))}
          </div>
        )}
        {blocks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Blocked Dates</p>
            <div className="space-y-1.5">
              {blocks.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{formatBlockDate(b.block_date)}</p>
                    {b.reason && <p className="text-xs text-zinc-500">{b.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full editor for admin/doctor
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-zinc-900 mb-1">My Schedule</h2>
        <p className="text-xs text-zinc-500">Set your available days, hours, and slot duration. Staff will see these slots when booking appointments.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {/* Weekly schedule grid */}
      <div className="space-y-3">
        {CLINIC_DAYS.map(day => {
          const form = dayForms[day] || { enabled: false, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30, max_patients_per_slot: 1 };
          const slots = slotCount(day);
          const isSaving = saving === day;

          return (
            <div key={day} className={`border rounded-2xl p-4 transition-colors ${form.enabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Toggle — inline styles to guarantee correct thumb position */}
                  <button
                    type="button"
                    onClick={() => updateForm(day, { enabled: !form.enabled })}
                    style={{
                      position: 'relative', width: '44px', height: '24px',
                      borderRadius: '12px', border: 'none', cursor: 'pointer',
                      flexShrink: 0, transition: 'background-color 0.2s',
                      backgroundColor: form.enabled ? '#10b981' : '#d1d5db',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '4px',
                      left: form.enabled ? '24px' : '4px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                  <span className={`font-semibold text-sm ${form.enabled ? 'text-zinc-900' : 'text-zinc-400'}`}>{DAYS[day]}</span>
                  {form.enabled && slots > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">{slots} slots/day</span>
                  )}
                </div>
                {form.enabled && (
                  <button type="button" onClick={() => handleSaveDay(day)} disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Save
                  </button>
                )}
                {!form.enabled && schedules.find(s => s.day_of_week === day) && (
                  <button type="button" onClick={() => handleSaveDay(day)} disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Remove
                  </button>
                )}
              </div>

              {form.enabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Start Time</label>
                    <input type="time" value={form.start_time}
                      onChange={e => updateForm(day, { start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">End Time</label>
                    <input type="time" value={form.end_time}
                      onChange={e => updateForm(day, { end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Slot Duration</label>
                    <select value={form.slot_duration_minutes}
                      onChange={e => updateForm(day, { slot_duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400">
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Max Patients/Slot</label>
                    <select value={form.max_patients_per_slot}
                      onChange={e => updateForm(day, { max_patients_per_slot: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-emerald-400">
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocked dates */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-zinc-900">Blocked Dates</h3>
          <p className="text-xs text-zinc-500">Holidays, leave, or any day you won't be available.</p>
        </div>

        <div className="flex gap-2 mb-3">
          <input type="date" value={blockDate} min={todayStr}
            onChange={e => setBlockDate(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-red-400" />
          <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-red-400" />
          <button
            type="button"
            onClick={handleAddBlock}
            disabled={!blockDate || addingBlock}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {addingBlock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Block
          </button>
        </div>

        {blocks.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">No blocked dates</p>
        ) : (
          <div className="space-y-2">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{formatBlockDate(b.block_date)}</p>
                    {b.reason && <p className="text-xs text-zinc-500">{b.reason}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBlock(b.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
