import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Plus, X, Trash2, Loader2, Bell, CheckCircle2, RefreshCw, Settings, List } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../hooks/useToast';
import AppointmentModal from './AppointmentModal';
import DoctorSchedulePanel from './DoctorSchedulePanel';

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
  const [calView, setCalView] = useState<'calendar' | 'schedule'>('calendar');

  // Cancel confirmation modal state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Resend token result modal state
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [resendCopied, setResendCopied] = useState(false);

  // Monthly appointments list modal
  const [showMonthList, setShowMonthList] = useState(false);
  const [monthListTab, setMonthListTab] = useState<'confirmed' | 'pending' | 'cancelled'>('confirmed');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayStr = today.toISOString().split('T')[0];

  // Doctor unavailability — schedule blocks for the current month
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  const loadMonth = useCallback(async () => {
    try {
      const [apptData, blockData] = await Promise.all([
        api(`/api/appointments?month=${monthKey}`, {}, token),
        api(`/api/schedule-blocks`, {}, token).catch(() => []),
      ]);
      setAppointments(apptData);
      const blocked = new Set<string>(
        (blockData as any[]).map((b: any) => b.block_date?.split('T')[0] ?? b.block_date)
      );
      setBlockedDates(blocked);
    } catch (err) {
      toast.warn('Could not load appointments. Check connection.');
    }
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
    } catch (err) {
      toast.error('Could not load appointments for this day.');
    }
    finally { setLoadingDay(false); }
  }, [token]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    loadDay(dateStr);
  };

  const handleCancelAppointment = async (id: string) => {
    setCancelTarget(id);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(`/api/appointments/${cancelTarget}`, { method: 'DELETE' }, token);
      if (selectedDate) loadDay(selectedDate);
      loadMonth();
      toast.success('Appointment cancelled.');
    } catch (err) {
      toast.error('Could not cancel appointment.');
    }
    finally { setCancelling(false); setCancelTarget(null); }
  };

  const handleMarkAttended = async (id: string) => {
    try {
      await api(`/api/appointments/${id}/attend`, { method: 'PATCH', body: '{}' }, token);
      if (selectedDate) loadDay(selectedDate);
      loadMonth();
      toast.success('Appointment marked as attended.');
    } catch (err) {
      toast.error('Could not mark as attended.');
    }
  };

  const handleResendToken = async (id: string) => {
    try {
      const result = await api(`/api/appointments/${id}/resend-token`, { method: 'POST', body: '{}' }, token);
      if (result.confirm_link) {
        await navigator.clipboard.writeText(result.confirm_link).catch(() => {});
        setResendLink(result.confirm_link);
        setResendCopied(true);
      }
    } catch (err) { toast.error('Could not generate confirmation link.'); }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true); setReminderMsg('');
    try {
      const r = await api('/api/appointments/send-reminders', { method: 'POST', body: '{}' }, token);
      const msg = `Sent ${r.sent} reminder${r.sent !== 1 ? 's' : ''} for ${r.targetDate}.`;
      setReminderMsg(msg);
      toast.success(msg);
      setTimeout(() => setReminderMsg(''), 5000);
    } catch (err) {
      const msg = (err as Error).message;
      setReminderMsg(msg);
      toast.error(`Reminders failed: ${msg}`);
    }
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
      <div className="flex-1 flex flex-col lg:flex-row lg:items-start overflow-y-auto p-3 md:p-5 gap-3 md:gap-4 min-h-full">

      {/* Left: Mini navigator + actions — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 sticky top-0">
        {/* View switcher */}
        <div className="flex bg-white border border-zinc-200 rounded-xl p-1 gap-1">
          <button onClick={() => setCalView('calendar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${calView === 'calendar' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:text-zinc-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
          {(role === 'admin' || role === 'superadmin') && (
            <button onClick={() => setCalView('schedule')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${calView === 'schedule' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:text-zinc-700'}`}>
              <Settings className="w-3.5 h-3.5" /> Schedule
            </button>
          )}
        </div>

        {/* New appointment button */}
        <button
          onClick={() => { setNewModalDate(todayStr); setShowNewModal(true); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Appointment
        </button>

        {/* View all appointments for this month */}
        <button
          onClick={() => setShowMonthList(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <List className="w-4 h-4" /> View All — {MONTHS_SHORT[month]}
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
              const isSundayMini = new Date(ds + 'T12:00:00').getDay() === 0;
              const isBlockedMini = blockedDates.has(ds);
              const isUnavailableMini = isSundayMini || isBlockedMini;
              return (
                <button key={day} onClick={() => !isUnavailableMini && handleDayClick(ds)}
                  disabled={isUnavailableMini}
                  className={`w-full aspect-square flex items-center justify-center rounded text-[10px] font-medium transition-colors relative ${
                    isUnavailableMini ? 'text-zinc-300 cursor-not-allowed' :
                    isToday ? 'bg-emerald-500 text-white' :
                    isSelected ? 'bg-emerald-100 text-emerald-700' :
                    'hover:bg-zinc-100 text-zinc-600'
                  }`}>
                  {day}
                  {hasAppt && !isToday && !isUnavailableMini && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
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
      {calView === 'schedule' ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex-1 p-5 md:p-6" style={{ minWidth: 0, maxWidth: '1000px' }}>
          <DoctorSchedulePanel token={token} role={role} />
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col flex-1" style={{ minWidth: 0, maxWidth: '1000px' }}>
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
            <div key={`empty-${i}`} className="border-r border-b border-zinc-100 h-[140px] bg-zinc-50/40" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayAppts = apptByDate[dateStr] || [];
            const isPast = dateStr < todayStr;
            const isSunday = new Date(dateStr + 'T12:00:00').getDay() === 0;
            const isBlocked = blockedDates.has(dateStr);
            const isUnavailable = isSunday || isBlocked;

            return (
              <div key={day}
                onClick={() => !isUnavailable && handleDayClick(dateStr)}
                title={isSunday ? 'Closed — Sunday' : isBlocked ? 'Doctor unavailable' : undefined}
                className={`border-r border-b border-zinc-100 h-[140px] overflow-hidden p-1 md:p-2 transition-colors ${
                  isUnavailable
                    ? 'bg-zinc-100 cursor-not-allowed'
                    : isSelected ? 'bg-emerald-50 cursor-pointer' : isPast ? 'bg-zinc-50/30 hover:bg-zinc-50 cursor-pointer' : 'hover:bg-zinc-50 cursor-pointer'
                }`}>
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                  isUnavailable ? 'text-zinc-400' :
                  isToday ? 'bg-emerald-500 text-white' : isSelected ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-600'
                }`}>
                  {day}
                </div>
                {isUnavailable ? (
                  <div className="text-[9px] text-zinc-400 px-1 mt-1">
                    {isSunday ? 'Closed' : 'Unavailable'}
                  </div>
                ) : (
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
                )}
              </div>
            );
          })}
        </div>
      </div>
      )} {/* end calView === 'calendar' */}

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
                      {/* Status badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'pending'   ? 'bg-amber-100 text-amber-700' :
                        a.status === 'attended'  ? 'bg-blue-100 text-blue-700' :
                        a.status === 'no_show'   ? 'bg-red-100 text-red-600' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {a.status === 'confirmed' ? ' Confirmed' :
                         a.status === 'pending'   ? ' Pending' :
                         a.status === 'attended'  ? ' Attended' :
                         a.status === 'no_show'   ? ' No-show' :
                         a.status}
                      </span>
                      {freqLabel(a) && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{freqLabel(a)}</span>
                      )}
                      {a.sms_sent && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">SMS ✓</span>
                      )}
                    </div>
                    {a.notes && <p className="mt-1 text-[10px] text-zinc-400 italic">{a.notes}</p>}
                    {/* Mark Attended — only for confirmed appointments on today or past dates */}
                    {a.status === 'confirmed' && a.appointment_date <= todayStr && (
                      <button
                        onClick={e => { e.stopPropagation(); handleMarkAttended(a.id); }}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark Attended
                      </button>
                    )}
                    {/* Resend confirmation link — only for pending appointments */}
                    {a.status === 'pending' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleResendToken(a.id); }}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Confirmation Link
                      </button>
                    )}
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
            // Do NOT close here — AppointmentModal shows the confirmation link screen
            // and closes itself when the user clicks "Done"
          }}
        />
      )}

      {/* Cancel appointment confirmation modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 text-center mb-1">Cancel Appointment?</h3>
              <p className="text-sm text-zinc-500 text-center mb-6">
                This appointment will be marked as cancelled. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Keep It
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resend confirmation link modal */}
      {resendLink && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 text-center mb-1">New Confirmation Link Ready</h3>
              <p className="text-sm text-zinc-500 text-center mb-4">
                {resendCopied ? 'Link copied to clipboard.' : 'Send this link to the patient via SMS or messaging app.'}
              </p>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-zinc-600 font-mono break-all leading-relaxed">{resendLink}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resendLink).catch(() => {});
                    setResendCopied(true);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {resendCopied ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {resendCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => { setResendLink(null); setResendCopied(false); }}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly appointments list modal */}
      {showMonthList && (() => {
        const confirmed = appointments.filter(a => a.status === 'confirmed' || a.status === 'attended');
        const pending = appointments.filter(a => a.status === 'pending');
        const cancelled = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show');

        const tabData = monthListTab === 'confirmed' ? confirmed : monthListTab === 'pending' ? pending : cancelled;

        const statusBadge = (status: string) => {
          if (status === 'confirmed') return <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">Confirmed</span>;
          if (status === 'attended') return <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">Attended</span>;
          if (status === 'pending') return <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Pending</span>;
          if (status === 'cancelled') return <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-full font-semibold">Cancelled</span>;
          if (status === 'no_show') return <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">No-show</span>;
          return null;
        };

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Appointments — {MONTHS_FULL[month]} {year}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {confirmed.length} confirmed · {pending.length} pending · {cancelled.length} cancelled/no-show
                  </p>
                </div>
                <button onClick={() => setShowMonthList(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-100">
                {([
                  { id: 'confirmed', label: 'Confirmed', count: confirmed.length, color: 'text-emerald-600 border-emerald-500' },
                  { id: 'pending', label: 'Pending', count: pending.length, color: 'text-amber-600 border-amber-500' },
                  { id: 'cancelled', label: 'Cancelled / No-show', count: cancelled.length, color: 'text-zinc-500 border-zinc-400' },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setMonthListTab(tab.id)}
                    className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
                      monthListTab === tab.id ? tab.color : 'text-zinc-400 border-transparent hover:text-zinc-600'
                    }`}>
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      monthListTab === tab.id ? 'bg-zinc-100' : 'bg-zinc-50'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4">
                {tabData.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No {monthListTab} appointments this month</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tabData
                      .slice()
                      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
                      .map(a => (
                        <div key={a.id} className="flex items-center gap-4 p-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors">
                          {/* Date block */}
                          <div className="w-12 flex-shrink-0 text-center">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">
                              {new Date(a.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-xl font-bold text-zinc-900 leading-none">
                              {new Date(a.appointment_date + 'T12:00:00').getDate()}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {new Date(a.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                          </div>

                          {/* Patient avatar */}
                          <div className="w-9 h-9 rounded-xl bg-zinc-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {a.profile_photo_path
                              ? <img src={`/${a.profile_photo_path}`} className="w-full h-full object-cover" alt="" />
                              : <User className="w-4 h-4 text-zinc-400" />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{a.patient_name}</p>
                            <p className="text-xs text-zinc-500 truncate">{a.title}</p>
                          </div>

                          {/* Time + status */}
                          <div className="flex-shrink-0 text-right">
                            {a.appointment_time && (
                              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" /> {a.appointment_time.slice(0, 5)}
                              </p>
                            )}
                            <div className="mt-0.5">{statusBadge(a.status)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-zinc-100">
                <button onClick={() => setShowMonthList(false)}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </div>
  );
}
