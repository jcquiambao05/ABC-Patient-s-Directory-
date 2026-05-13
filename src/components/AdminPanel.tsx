import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Archive, Shield, Trash2, RotateCcw, KeyRound,
  Loader2, AlertTriangle, CheckCircle, X, Eye, EyeOff, UserX, Mail, Plus,
  ClipboardList, MessageSquare, AlertOctagon, BookOpen
} from 'lucide-react';

interface Props {
  token: string;
  onClose: () => void;
}

interface UserAccount {
  id: string;
  email: string;
  name: string;
  display_name: string | null;
  role: string;
  mfa_enabled: boolean;
  created_at: string;
  last_login: string | null;
}

interface ArchivedPatient {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  contact_number: string | null;
  archived_at: string;
  archived_by_name: string | null;
}

type Tab = 'users' | 'archive' | 'whitelist' | 'audit' | 'faq';

interface StatusLogEntry {
  id: number;
  appointment_id: string;
  patient_name: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  change_reason: string | null;
}

interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  is_draft: boolean;
}

export default function AdminPanel({ token, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [archivedPatients, setArchivedPatients] = useState<ArchivedPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetPwShow, setResetPwShow] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  // Delete user confirm
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserAccount | null>(null);

  // Permanent delete patient confirm
  const [permDeleteTarget, setPermDeleteTarget] = useState<ArchivedPatient | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Google whitelist state
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [whitelistSaving, setWhitelistSaving] = useState(false);

  // Appointment audit state
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // FAQ management state
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqEdit, setFaqEdit] = useState<FaqEntry | null>(null);
  const [faqNew, setFaqNew] = useState(false);
  const [faqForm, setFaqForm] = useState({ category: '', question: '', answer: '', sort_order: 0 });
  const [faqSaving, setFaqSaving] = useState(false);  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/users', { headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      setUsers(await r.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token]);

  const loadArchived = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/patients/archived/list', { headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      setArchivedPatients(await r.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token]);

  const loadWhitelist = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/google-whitelist', { headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      const data = await r.json();
      setWhitelist(data.emails || []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'archive') loadArchived();
    else if (activeTab === 'whitelist') loadWhitelist();
    else if (activeTab === 'audit') loadAuditLog();
    else if (activeTab === 'faq') loadFaq();
  }, [activeTab]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const r = await fetch('/api/admin/appointment-audit/status-log', { headers: authHeaders });
      if (r.ok) setStatusLog(await r.json());
    } catch { /* silent */ }
    finally { setAuditLoading(false); }
  }, [token]);

  const loadFaq = useCallback(async () => {
    setFaqLoading(true);
    try {
      const r = await fetch('/api/faq?limit=100', { headers: authHeaders });
      if (r.ok) setFaqEntries(await r.json());
    } catch { /* silent */ }
    finally { setFaqLoading(false); }
  }, [token]);

  const handleFaqSave = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim() || !faqForm.category.trim()) return;
    setFaqSaving(true);
    try {
      if (faqEdit) {
        const r = await fetch(`/api/faq/${faqEdit.id}`, {
          method: 'PUT', headers: authHeaders,
          body: JSON.stringify({ ...faqForm, is_active: faqEdit.is_active, is_draft: false }),
        });
        if (!r.ok) throw new Error((await r.json()).error);
        flash('FAQ entry updated.');
      } else {
        const r = await fetch('/api/faq', {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ ...faqForm, is_draft: false }),
        });
        if (!r.ok) throw new Error((await r.json()).error);
        flash('FAQ entry added.');
      }
      setFaqEdit(null); setFaqNew(false);
      setFaqForm({ category: '', question: '', answer: '', sort_order: 0 });
      loadFaq();
    } catch (e) { setError((e as Error).message); }
    finally { setFaqSaving(false); }
  };

  const handleFaqDelete = async (id: string) => {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      const r = await fetch(`/api/faq/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      flash('FAQ entry deleted.');
      loadFaq();
    } catch (e) { setError((e as Error).message); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    try {
      const r = await fetch(`/api/auth/users/${deleteUserTarget.id}`, { method: 'DELETE', headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      setDeleteUserTarget(null);
      flash(`Account "${deleteUserTarget.display_name || deleteUserTarget.name}" deleted.`);
      loadUsers();
    } catch (e) { setError((e as Error).message); }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPw) return;
    setResetSaving(true);
    try {
      const r = await fetch(`/api/auth/users/${resetTarget.id}/reset-password`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ newPassword: resetPw }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setResetTarget(null); setResetPw('');
      flash(`Password reset for "${resetTarget.display_name || resetTarget.name}".`);
    } catch (e) { setError((e as Error).message); }
    finally { setResetSaving(false); }
  };

  const handleRestore = async (p: ArchivedPatient) => {
    try {
      const r = await fetch(`/api/patients/${p.id}/restore`, { method: 'POST', headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      flash(`"${p.full_name}" restored to active directory.`);
      loadArchived();
    } catch (e) { setError((e as Error).message); }
  };

  const handlePermDelete = async () => {
    if (!permDeleteTarget) return;
    try {
      const r = await fetch(`/api/patients/${permDeleteTarget.id}/permanent`, { method: 'DELETE', headers: authHeaders });
      if (!r.ok) throw new Error((await r.json()).error);
      setPermDeleteTarget(null);
      flash(`"${permDeleteTarget.full_name}" permanently deleted.`);
      loadArchived();
    } catch (e) { setError((e as Error).message); }
  };

  const handleAddWhitelistEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { setError('Enter a valid email address'); return; }
    if (whitelist.includes(email)) { setError('Email already in whitelist'); return; }
    const updated = [...whitelist, email];
    setWhitelistSaving(true);
    try {
      const r = await fetch('/api/auth/google-whitelist', {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ emails: updated }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setWhitelist(updated);
      setNewEmail('');
      flash(`${email} added to whitelist.`);
    } catch (e) { setError((e as Error).message); }
    finally { setWhitelistSaving(false); }
  };

  const handleRemoveWhitelistEmail = async (email: string) => {
    const updated = whitelist.filter(e => e !== email);
    setWhitelistSaving(true);
    try {
      const r = await fetch('/api/auth/google-whitelist', {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ emails: updated }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setWhitelist(updated);
      flash(`${email} removed from whitelist.`);
    } catch (e) { setError((e as Error).message); }
    finally { setWhitelistSaving(false); }
  };

  const roleLabel = (role: string) => {
    if (role === 'superadmin') return { label: 'Super Admin', color: 'text-amber-300 bg-amber-900/40 border-amber-700' };
    if (role === 'admin') return { label: 'Doctor', color: 'text-blue-300 bg-blue-900/40 border-blue-700' };
    return { label: 'Staff', color: 'text-emerald-300 bg-emerald-900/40 border-emerald-700' };
  };

  // Navy blue palette
  const bg = 'bg-[#0f172a]';
  const card = 'bg-[#1e293b]';
  const border = 'border-[#334155]';
  const text = 'text-slate-100';
  const muted = 'text-slate-400';

  return (
    <div className={`fixed inset-0 z-50 ${bg} flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${border} flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${text}`}>Admin Panel</h1>
            <p className={`text-xs ${muted}`}>Super Admin Controls</p>
          </div>
        </div>
        <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-700 ${muted} hover:text-white transition-colors`}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${border} px-6 flex-shrink-0 overflow-x-auto`}>
        {([
          { id: 'users', icon: Users, label: 'User Accounts' },
          { id: 'archive', icon: Archive, label: 'Patient Archive' },
          { id: 'whitelist', icon: Mail, label: 'Google Whitelist' },
          { id: 'audit', icon: ClipboardList, label: 'Appt Audit' },
          { id: 'faq', icon: BookOpen, label: 'FAQ Manager' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-amber-400 text-amber-300'
                : `border-transparent ${muted} hover:text-slate-200`
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <div className="px-6 pt-3 flex-shrink-0">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-300 text-sm mb-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-900/40 border border-emerald-700 rounded-xl text-emerald-300 text-sm mb-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin text-amber-400`} />
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-3">
            <p className={`text-xs ${muted} mb-4`}>{users.length} account{users.length !== 1 ? 's' : ''} registered</p>
            {users.map(u => {
              const { label, color } = roleLabel(u.role);
              return (
                <div key={u.id} className={`${card} border ${border} rounded-xl p-4 flex items-center gap-4`}>
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-300">
                      {(u.display_name || u.name || u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${text} truncate`}>{u.display_name || u.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
                      {u.mfa_enabled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600 text-slate-400">MFA</span>
                      )}
                    </div>
                    <p className={`text-xs ${muted} truncate`}>{u.email}</p>
                    <p className={`text-xs ${muted}`}>
                      Last login: {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setResetTarget(u); setResetPw(''); setResetPwShow(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                      title="Reset password"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset PW
                    </button>
                    {u.role !== 'superadmin' && (
                      <button
                        onClick={() => setDeleteUserTarget(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg text-xs font-medium transition-colors border border-red-800"
                        title="Delete account"
                      >
                        <UserX className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeTab === 'archive' ? (
          <div className="space-y-3">
            <p className={`text-xs ${muted} mb-4`}>
              {archivedPatients.length} archived patient{archivedPatients.length !== 1 ? 's' : ''} — restore to make visible to staff/doctor, or permanently delete
            </p>
            {archivedPatients.length === 0 ? (
              <div className={`text-center py-16 ${muted}`}>
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No archived patients</p>
              </div>
            ) : archivedPatients.map(p => (
              <div key={p.id} className={`${card} border ${border} rounded-xl p-4 flex items-center gap-4`}>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${text}`}>{p.full_name}</p>
                  <p className={`text-xs ${muted}`}>
                    {p.age ? `${p.age} yrs` : ''}{p.gender ? ` · ${p.gender}` : ''}{p.contact_number ? ` · ${p.contact_number}` : ''}
                  </p>
                  <p className={`text-xs ${muted}`}>
                    Archived {new Date(p.archived_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {p.archived_by_name ? ` by ${p.archived_by_name}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 rounded-lg text-xs font-medium transition-colors border border-emerald-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => setPermDeleteTarget(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg text-xs font-medium transition-colors border border-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'whitelist' ? (
          /* Google Whitelist Tab */
          <div className="space-y-4 max-w-lg">
            <div>
              <p className={`text-sm font-semibold ${text} mb-1`}>Google OAuth Whitelist</p>
              <p className={`text-xs ${muted} mb-4`}>
                Only these Gmail addresses can sign in via "Continue with Google". Changes take effect immediately.
              </p>
            </div>

            {/* Add new email */}
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddWhitelistEmail()}
                placeholder="user@gmail.com"
                className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl text-sm outline-none focus:border-amber-400 placeholder:text-slate-500"
              />
              <button
                onClick={handleAddWhitelistEmail}
                disabled={whitelistSaving || !newEmail.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Current whitelist */}
            {whitelist.length === 0 ? (
              <div className={`text-center py-8 ${muted} border border-dashed border-slate-700 rounded-xl`}>
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No emails whitelisted — Google sign-in is disabled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {whitelist.map(email => (
                  <div key={email} className={`${card} border ${border} rounded-xl px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className={`text-sm ${text}`}>{email}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveWhitelistEmail(email)}
                      disabled={whitelistSaving}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className={`text-xs ${muted} pt-2`}>
              Note: Changes update the server's environment. Restart the server if Google sign-in doesn't reflect changes immediately.
            </p>
          </div>
        ) : activeTab === 'audit' ? (
          /* Appointment Audit Tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={`text-xs ${muted}`}>All appointment status changes — newest first</p>
              <button onClick={loadAuditLog} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">↻ Refresh</button>
            </div>
            {auditLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
            ) : statusLog.length === 0 ? (
              <div className={`text-center py-16 ${muted}`}>
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No status changes recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {statusLog.map(entry => (
                  <div key={entry.id} className={`${card} border ${border} rounded-xl p-3`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          entry.new_status === 'confirmed' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' :
                          entry.new_status === 'pending'   ? 'bg-amber-900/50 text-amber-300 border border-amber-700' :
                          entry.new_status === 'no_show'   ? 'bg-red-900/50 text-red-300 border border-red-700' :
                          entry.new_status === 'attended'  ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                          'bg-slate-700 text-slate-300 border border-slate-600'
                        }`}>{entry.new_status}</span>
                        <span className={`text-xs ${muted}`}>← {entry.old_status}</span>
                      </div>
                      <span className={`text-[10px] ${muted}`}>{new Date(entry.changed_at).toLocaleString()}</span>
                    </div>
                    <p className={`text-sm ${text} mt-1`}>{entry.patient_name || 'Unknown patient'}</p>
                    <p className={`text-xs ${muted}`}>Changed by: <span className="text-slate-300">{entry.changed_by || 'system'}</span>
                      {entry.change_reason ? ` · ${entry.change_reason}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'faq' ? (
          /* FAQ Manager Tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={`text-xs ${muted}`}>{faqEntries.length} FAQ entries</p>
              <button
                onClick={() => { setFaqNew(true); setFaqEdit(null); setFaqForm({ category: '', question: '', answer: '', sort_order: faqEntries.length + 1 }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add FAQ
              </button>
            </div>
            {(faqNew || faqEdit) && (
              <div className={`${card} border ${border} rounded-xl p-4 space-y-3`}>
                <p className={`text-sm font-semibold ${text}`}>{faqEdit ? 'Edit FAQ Entry' : 'New FAQ Entry'}</p>
                <input value={faqForm.category} onChange={e => setFaqForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Category (e.g. Queue, Appointments, Patient Records)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm outline-none focus:border-amber-400 placeholder:text-slate-500" />
                <input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="Question"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm outline-none focus:border-amber-400 placeholder:text-slate-500" />
                <textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Answer" rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm outline-none focus:border-amber-400 placeholder:text-slate-500 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setFaqNew(false); setFaqEdit(null); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors">Cancel</button>
                  <button onClick={handleFaqSave} disabled={faqSaving}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1">
                    {faqSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {faqEdit ? 'Save Changes' : 'Add Entry'}
                  </button>
                </div>
              </div>
            )}
            {faqLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
            ) : (
              <div className="space-y-2">
                {faqEntries.map(entry => (
                  <div key={entry.id} className={`${card} border ${border} rounded-xl p-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{entry.category}</span>
                        </div>
                        <p className={`text-sm font-medium ${text}`}>{entry.question}</p>
                        <p className={`text-xs ${muted} mt-0.5 overflow-hidden`} style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden'}}>{entry.answer}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setFaqEdit(entry); setFaqNew(false); setFaqForm({ category: entry.category, question: entry.question, answer: entry.answer, sort_order: entry.sort_order }); }}
                          className={`px-2 py-1 text-xs ${muted} hover:text-amber-300 hover:bg-amber-900/30 rounded-lg transition-colors`}>Edit</button>
                        <button onClick={() => handleFaqDelete(entry.id)}
                          className={`p-1.5 ${muted} hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className={`${card} border ${border} rounded-2xl p-6 max-w-sm w-full shadow-2xl`}>
            <h3 className={`text-base font-bold ${text} mb-1`}>Reset Password</h3>
            <p className={`text-sm ${muted} mb-4`}>
              Set a new password for <span className="text-slate-200 font-medium">{resetTarget.display_name || resetTarget.name}</span>
            </p>
            <div className="relative mb-4">
              <input
                type={resetPwShow ? 'text' : 'password'}
                value={resetPw}
                onChange={e => setResetPw(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl text-sm outline-none focus:border-amber-400 pr-10"
              />
              <button onClick={() => setResetPwShow(s => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`}>
                {resetPwShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleResetPassword} disabled={resetSaving || resetPw.length < 8}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {resetSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirm */}
      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className={`${card} border ${border} rounded-2xl p-6 max-w-sm w-full shadow-2xl`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <h3 className={`text-base font-bold ${text}`}>Delete Account?</h3>
            </div>
            <p className={`text-sm ${muted} mb-1`}>
              This will permanently delete <span className="text-slate-200 font-medium">{deleteUserTarget.display_name || deleteUserTarget.name}</span>'s account.
            </p>
            <p className="text-xs text-red-400 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUserTarget(null)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleDeleteUser} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Patient Confirm */}
      {permDeleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className={`${card} border ${border} rounded-2xl p-6 max-w-sm w-full shadow-2xl`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className={`text-base font-bold ${text}`}>Permanently Delete?</h3>
            </div>
            <p className={`text-sm ${muted} mb-1`}>
              All records for <span className="text-slate-200 font-medium">{permDeleteTarget.full_name}</span> will be erased forever.
            </p>
            <p className="text-xs text-red-400 mb-5">This cannot be undone. All consultations, prescriptions, and files will be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setPermDeleteTarget(null)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handlePermDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
