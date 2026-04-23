import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Login from './Login';
import SignupPage from './SignupPage';
import Sidebar from './Sidebar';
import PatientCard from './PatientCard';
import DetailPanel from './DetailPanel';
import AddPatientModal from './AddPatientModal';
import QueuePage from './QueuePage';
import DashboardPage from './DashboardPage';
import ChatPage from './ChatPage';
import AuditPage from './AuditPage';
import SettingsPanel from './SettingsPanel';
import AdminPanel from './AdminPanel';
import AIUploadPreviewModal from './AIUploadPreviewModal';
import CalendarPage from './CalendarPage';
import { api } from '../lib/api';
import type { Patient } from '../types/index';
import {
  PreferencesContext,
  defaultPreferences,
  applyPreferences,
  getSmartDefaults,
  type Preferences,
} from '../hooks/usePreferences';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('directory');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIUpload, setShowAIUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [showSignup, setShowSignup] = useState(false);

  // Listen for signup trigger from Login's SignupLink sub-component
  useEffect(() => {
    const handler = () => setShowSignup(true);
    window.addEventListener('abccare:show-signup', handler);
    return () => window.removeEventListener('abccare:show-signup', handler);
  }, []);

  // Apply preferences to DOM whenever they change
  useEffect(() => { applyPreferences(preferences); }, [preferences]);

  // Validate stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem('mediflow_auth_token');
    if (!stored) { setIsLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setToken(stored);
        setRole(data.user.role);
        setDisplayName(data.user.display_name || data.user.name || null);
        setIsAuthenticated(true);
        // Load saved preferences
        if (data.user.preferences && Object.keys(data.user.preferences).length > 0) {
          const prefs = { ...defaultPreferences, ...data.user.preferences };
          setPreferences(prefs);
          setActiveTab(prefs.defaultTab);
        } else {
          // First login — apply smart role-based defaults
          const smart = getSmartDefaults(data.user.role);
          const prefs = { ...defaultPreferences, ...smart };
          setPreferences(prefs);
          setActiveTab(prefs.defaultTab);
        }
      })
      .catch(() => localStorage.removeItem('mediflow_auth_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<Preferences>, tok: string) => {
    const updated = { ...preferences, ...patch };
    setPreferences(updated);
    try {
      await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ preferences: updated }),
      });
    } catch (err) { console.error('Failed to save preferences', err); }
  }, [preferences]);

  const handleLoginSuccess = async (newToken: string) => {
    localStorage.setItem('mediflow_auth_token', newToken);
    setToken(newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setRole(payload.role || 'staff');
    } catch { setRole('staff'); }
    setIsAuthenticated(true);
    // Load preferences from /api/auth/me
    try {
      const meData = await api('/api/auth/me', {}, newToken);
      setDisplayName(meData.user.display_name || meData.user.name || null);
      if (meData.user.preferences && Object.keys(meData.user.preferences).length > 0) {
        const prefs = { ...defaultPreferences, ...meData.user.preferences };
        setPreferences(prefs);
        setActiveTab(prefs.defaultTab);
      } else {
        const smart = getSmartDefaults(meData.user.role);
        const prefs = { ...defaultPreferences, ...smart };
        setPreferences(prefs);
        setActiveTab(prefs.defaultTab);
      }
    } catch { /* use defaults */ }
    try { const data = await api('/api/patients', {}, newToken); setPatients(data); }
    catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('mediflow_auth_token');
    setToken(null); setRole(null); setDisplayName(null); setIsAuthenticated(false);
    setSelectedPatient(null); setIsExpanded(false);
    setPreferences(defaultPreferences);
  };

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    // superadmin can view directory in read-only mode
    if (role === 'superadmin') {
      try { const data = await api('/api/patients', {}, token); setPatients(data); }
      catch (err) { console.error(err); }
      return;
    }
    try { const data = await api('/api/patients', {}, token); setPatients(data); }
    catch (err) { console.error(err); }
  }, [token, role]);

  useEffect(() => { if (isAuthenticated && token) fetchPatients(); }, [isAuthenticated, token, fetchPatients]);

  const handleAIUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !token) return;
    setIsProcessing(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api('/api/patients/ai-create', { method: 'POST', body: JSON.stringify({ imageData: reader.result }) }, token);
        await fetchPatients();
        if (result.patient_id) {
          const p = await api(`/api/patients/${result.patient_id}`, {}, token);
          setSelectedPatient(p);
        }
      } catch (err) { alert('AI Upload failed: ' + (err as Error).message); }
      finally { setIsProcessing(false); }
    };
    reader.readAsDataURL(file);
  };

  const filtered = patients.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const grouped = filtered.reduce((acc, p) => {
    // Group by first letter of LAST name (last word in full_name)
    const words = p.full_name.trim().split(/\s+/);
    const lastName = words[words.length - 1] || p.full_name;
    const key = lastName[0]?.toUpperCase() || '#';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, Patient[]>);
  // Sort patients within each cabinet by last name
  Object.values(grouped).forEach(list =>
    list.sort((a, b) => {
      const lastA = a.full_name.trim().split(/\s+/).pop()!.toLowerCase();
      const lastB = b.full_name.trim().split(/\s+/).pop()!.toLowerCase();
      return lastA.localeCompare(lastB);
    })
  );
  const cabinets = Object.keys(grouped).sort();

  if (isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  if (!isAuthenticated) return showSignup
    ? <SignupPage onBack={() => setShowSignup(false)} onSignupSuccess={() => { setShowSignup(false); }} />
    : <Login onLoginSuccess={handleLoginSuccess} onShowSignup={() => setShowSignup(true)} />;

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden" style={{ fontSize: 'var(--app-font-size, 14px)' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={t => { setActiveTab(t); setSelectedPatient(null); setIsExpanded(false); }}
          onLogout={handleLogout}
          role={role}
          displayName={displayName}
          sidebarCompact={preferences.sidebarCompact}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAdmin={role === 'superadmin' ? () => setShowAdminPanel(true) : undefined}
        />

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col pb-[88px] md:pb-0">
          {activeTab === 'directory' && (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Patient list — hidden on mobile when a patient is selected */}
              <motion.div
                animate={{ width: isExpanded ? 0 : (selectedPatient ? '40%' : '100%'), opacity: isExpanded ? 0 : 1 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className={`flex flex-col border-r border-zinc-200 bg-white overflow-hidden ${selectedPatient ? 'hidden md:flex' : 'flex'}`}
                style={{ minWidth: 0 }}
              >
                <header className="p-5 md:p-6 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Patient Archives</h1>
                    <p className="text-sm text-zinc-500">Organized A–Z</p>
                  </div>
                  <div className="flex gap-2">
                    {role === 'staff' && (
                      <>
                        <button onClick={() => setShowAIUpload(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 md:px-3 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium">
                          <Upload className="w-4 h-4" />
                          <span className="hidden sm:inline">AI Upload</span>
                        </button>
                        <button onClick={() => setIsAddingPatient(true)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 md:px-3 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium">
                          <UserPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">New Entry</span>
                        </button>
                      </>
                    )}
                    {role === 'superadmin' && (
                      <span className="text-xs text-amber-500 bg-amber-900/20 border border-amber-800/50 px-3 py-1.5 rounded-xl font-medium">
                        Read-only view
                      </span>
                    )}
                  </div>
                </header>

                <div className="px-4 md:px-5 py-3 bg-white border-b border-zinc-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search patients..."
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {cabinets.length === 0 ? (
                    <div className="text-center py-16 text-zinc-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No patients found</p>
                    </div>
                  ) : cabinets.map(cab => (
                    <div key={cab}>
                      <div className="sticky top-0 bg-zinc-100/90 backdrop-blur-sm px-4 md:px-5 py-1.5 border-y border-zinc-200 flex items-center gap-2">
                        <div className="w-5 h-5 bg-zinc-600 text-white rounded flex items-center justify-center text-[10px] font-bold">{cab}</div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cabinet {cab}</span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {grouped[cab].map(p => (
                          <PatientCard key={p.id} patient={p} isSelected={selectedPatient?.id === p.id}
                            onClick={() => { setSelectedPatient(p); setIsExpanded(false); }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence>
                {selectedPatient && (
                  <motion.div
                    key={selectedPatient.id}
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1, width: isExpanded ? '100%' : '60%' }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="absolute right-0 top-0 h-full bg-white shadow-xl z-10 w-full md:w-auto"
                    style={{ minWidth: 0 }}
                  >
                    <DetailPanel
                      patient={selectedPatient}
                      token={token!}
                      role={role}
                      onClose={() => { setSelectedPatient(null); setIsExpanded(false); }}
                      onRefresh={fetchPatients}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(e => !e)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'queue' && token && <QueuePage token={token} role={role} />}
          {activeTab === 'calendar' && token && <CalendarPage token={token} role={role} />}
          {activeTab === 'dashboard' && token && <DashboardPage token={token} />}
          {activeTab === 'chat' && token && <ChatPage token={token} />}
          {activeTab === 'audit' && token && <AuditPage token={token} />}
        </main>

        {isAddingPatient && token && (
          <AddPatientModal token={token} onClose={() => setIsAddingPatient(false)} onSaved={fetchPatients} />
        )}

        {showSettings && token && (
          <SettingsPanel token={token} onClose={() => setShowSettings(false)} />
        )}

        {showAdminPanel && token && role === 'superadmin' && (
          <AdminPanel token={token} onClose={() => setShowAdminPanel(false)} />
        )}

        {showAIUpload && token && (
          <AIUploadPreviewModal
            token={token}
            onClose={() => setShowAIUpload(false)}
            onSaved={async (patientId) => {
              setShowAIUpload(false);
              await fetchPatients();
              const p = await api(`/api/patients/${patientId}`, {}, token);
              setSelectedPatient(p);
              setActiveTab('directory');
            }}
          />
        )}
      </div>
    </PreferencesContext.Provider>
  );
}
