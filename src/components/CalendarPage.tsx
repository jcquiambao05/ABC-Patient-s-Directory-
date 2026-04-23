import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Plus, X, Trash2, Loader2, Bell } from 'lucide-react';
import { api } from '../lib/api';
import AppointmentModal from './AppointmentModal';

interface Props {
  token: string;
  role: string | null;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string | null;
  profile_photo_path: string | null;
  title: string;
  notes: string | null;
  appointment_date: string;
  appointment_time: string | null;
  frequency: string;
  frequency_every: number;
  end_date: string | null;
  status: string;
  sms_sent: boolean;
  created_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage({ token, role }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newModalDate, setNewModalDate] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayStr = today.toISOString().split('T')[0];

  const loadMonth = useCallback(async () => {
    try {
      const data = await api(`/api/appointments?month=${monthKey}`, {}, token);
      setAppointments(data);
    } catch (err) { console.error(err); }
  }, [monthKey, token]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Reload when page becomes visible (e.g. navigating back from queue)
  useEffect(() => {
    const handleFocus = () => loadMonth();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadMonth]);

  const loadDay = useCallback(async (dateStr: string) => {
    setLoadingDay(true);
    try {
      const data = await api(`/api/appointments?date=${dateStr}`, {}, token);
      setDayAppointments(data);
    } catch (err) { console.error(err); }
    finally { setLoadingDay(false); }
  }, [token]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    loadDay(dateStr);
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api(`/api/appointments/${id}`, { method: 'DELETE' }, token);
      if (selectedDate) loadDay(selectedDate);
      loadMonth();
    } catch (err) { alert((err as Error).message); }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true); setReminderMsg('');
    try {
      const r = await api('/api/appointments/send-reminders', { method: 'POST', body: '{}' }, token);
      setReminderMsg(`Sent ${r.sent} reminder${r.sent !== 1 ? 's' : ''} for ${r.targetDate}.`);
      setTimeout(() => setReminderMsg(''), 5000);
    } catch (err) { setReminderMsg((err as Error).message); }
    finally { setSendingReminders(false); }
  };

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const apptByDate: Record<string, Appointment[]> = {};
  appointments.forEach(a => {
    // appointment_date is now always YYYY-MM-DD string from server
    const d = typeof a.appointment_date === 'string'
      ? a.appointment_date.split('T')[0]
      : new Date(a.appointment_date).toISOString().split('T')[0];
    if (!apptByDate[d]) apptByDate[d] = [];
    apptByDate[d].push(a);
  });

  const freqLabel = (a: Appointment) => {
    if (a.frequency === 'once') return null;
    const unit = a.frequency === 'weekly' ? 'wk' : a.frequency === 'monthly' ? 'mo' : 'yr';
    return `Every ${a.frequency_every > 1 ? a.frequency_every + ' ' : ''}${unit}`;
  };

  return (
    <div className="flex-1 flex bg-zinc-100 overflow-hidden" style={{ height: '100%' }}>
      {/* Scrollable content area — stacks vertically on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-start justify-center overflow-y-auto p-3 md:p-5 gap-3 md:gap-4 min-h-full">

      {/* Left: Mini navigator + actions — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 sticky top-0">
        {/* New appointment button */}
        <button
          onClick={() => { setNewModalDate(todayStr); setShowNewModal(true); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Appointment
        </button>

        {/* Mini month navigator */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-700">{MONTHS_SHORT[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Mini grid */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-bold text-zinc-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              const hasAppt = !!apptByDate[ds]?.length;
              return (
                <button key={day} onClick={() => handleDayClick(ds)}
                  className={`w-full aspect-square flex items-center justify-center rounded text-[10px] font-medium transition-colors relative ${
                    isToday ? 'bg-emerald-500 text-white' :
                    isSelected ? 'bg-emerald-100 text-emerald-700' :
                    'hover:bg-zinc-100 text-zinc-600'
                  }`}>
                  {day}
                  {hasAppt && !isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
          {/* Quick year jump */}
          <div className="mt-3 pt-2 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400 font-medium mb-1.5 uppercase tracking-wider">Jump to month</p>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m, i) => (
                <button key={m} onClick={() => setViewDate(new Date(year, i, 1))}
                  className={`text-[10px] py-1 rounded font-medium transition-colors ${
                    i === month ? 'bg-emerald-500 text-white' : 'hover:bg-zinc-100 text-zinc-600'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <button onClick={() => setViewDate(new Date(year - 1, month, 1))} className="flex-1 text-[10px] py-1 rounded hover:bg-zinc-100 text-zinc-500 font-medium transition-colors">
                ← {year - 1}
              </button>
              <button onClick={() => setViewDate(new Date(year + 1, month, 1))} className="flex-1 text-[10px] py-1 rounded hover:bg-zinc-100 text-zinc-500 font-medium transition-colors">
                {year + 1} →
              </button>
            </div>
          </div>
        </div>

        {/* SMS reminders */}
        {(role === 'admin' || role === 'superadmin') && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3">
            <p className="text-xs font-semibold text-zinc-600 mb-2">SMS Reminders</p>
            <p className="text-[10px] text-zinc-400 mb-2">Send reminders to patients with appointments in 2 days.</p>
            {reminderMsg && <p className="text-[10px] text-emerald-600 mb-2">{reminderMsg}</p>}
            <button onClick={handleSendReminders} disabled={sendingReminders}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              {sendingReminders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              Send Reminders
            </button>
          </div>
        )}
      </div>

      {/* Center: Main calendar box — full width on mobile/tablet */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col w-full lg:w-auto" style={{ minWidth: 0, maxWidth: '820px' }}>
        {/* Calendar header */}
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-zinc-900 w-40 text-center">{MONTHS_FULL[month]} {year}</h2>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); handleDayClick(todayStr); }}
            className="text-xs font-medium text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-l border-t border-zinc-100 flex-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b border-zinc-100 min-h-[80px] md:min-h-[130px] bg-zinc-50/40" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayAppts = apptByDate[dateStr] || [];
            const isPast = dateStr < todayStr;

            return (
              <div key={day}
                onClick={() => handleDayClick(dateStr)}
                className={`border-r border-b border-zinc-100 min-h-[80px] md:min-h-[130px] p-1 md:p-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50' : isPast ? 'bg-zinc-50/30 hover:bg-zinc-50' : 'hover:bg-zinc-50'
                }`}>
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                  isToday ? 'bg-emerald-500 text-white' : isSelected ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-600'
                }`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a.id} className="text-[9px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded truncate font-medium leading-tight">
                      {a.appointment_time ? a.appointment_time.slice(0, 5) + ' ' : ''}{a.patient_name.split(' ')[0]}
                    </div>
                  ))}
                  {dayAppts.length > 2 && (
                    <div className="text-[9px] text-zinc-400 px-1">+{dayAppts.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Day detail panel — full width on mobile, fixed width on lg+ */}
      <div className="w-full lg:w-72 flex-shrink-0 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col lg:sticky lg:top-0" style={{ maxHeight: 'calc(100vh - 2.5rem)', minHeight: '200px' }}>
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
            <div>
              {selectedDate ? (
                <>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                </>
              ) : (
                <p className="text-xs text-zinc-400 font-medium">Select a day</p>
              )}
            </div>
            <div className="flex gap-1">
              {selectedDate && (
                <>
                  <button onClick={() => { setNewModalDate(selectedDate); setShowNewModal(true); }}
                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors" title="Add">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!selectedDate ? (
              <div className="text-center py-10 text-zinc-300">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Click a day to view appointments</p>
              </div>
            ) : loadingDay ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
            ) : dayAppointments.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No appointments</p>
                <button onClick={() => { setNewModalDate(selectedDate); setShowNewModal(true); }}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  + Schedule one
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map(a => (
                  <div key={a.id} className="border border-zinc-200 rounded-xl p-2.5 hover:border-emerald-200 transition-colors">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {a.profile_photo_path
                            ? <img src={`/${a.profile_photo_path}`} className="w-full h-full object-cover" alt="" />
                            : <User className="w-3.5 h-3.5 text-zinc-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{a.patient_name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{a.title}</p>
                        </div>
                      </div>
                      <button onClick={() => handleCancelAppointment(a.id)}
                        className="p-1 text-zinc-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {a.appointment_time && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                          <Clock className="w-2.5 h-2.5" /> {a.appointment_time.slice(0, 5)}
                        </span>
                      )}
                      {freqLabel(a) && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{freqLabel(a)}</span>
                      )}
                      {a.sms_sent && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">SMS ✓</span>
                      )}
                    </div>
                    {a.notes && <p className="mt-1 text-[10px] text-zinc-400 italic">{a.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* New appointment modal */}
      {showNewModal && (
        <AppointmentModal
          token={token}
          defaultDate={newModalDate || undefined}
          onClose={() => setShowNewModal(false)}
          onSaved={() => {
            loadMonth();
            if (selectedDate) loadDay(selectedDate);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
    </div>
  );
}
