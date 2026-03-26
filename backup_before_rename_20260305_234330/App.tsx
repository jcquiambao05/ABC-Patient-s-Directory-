/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  HistoryIcon,
  Users, 
  UserPlus, 
  Search, 
  FileText, 
  Upload, 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  Plus,
  X,
  Loader2,
  Activity,
  Clipboard,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Send,
  LogOut,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit3,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Login from './Login';

// --- Types ---

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  last_visit_date?: string;
}

interface EMR {
  id: string;
  patient_id: string;
  visit_date: string;
  diagnosis: string;
  treatment_plan: string;
  notes: string;
  created_at: string;
}

interface Document {
  id: string;
  patient_id: string;
  file_url: string;
  extracted_text: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface MedicalChart {
  id: string;
  patient_id: string;
  visit_date: string;
  document_type: string;
  diagnosis: string;
  treatment_plan: string;
  notes: string;
  custom_fields: any;
  metadata: any;
  confidence_score: number;
  reviewed: boolean;
  reviewer_notes: string;
  raw_ocr_text: string;
  created_at: string;
  updated_at: string;
}

interface OCRTemplate {
  id: string;
  name: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, onLogout: () => void }) => (
  <div className="w-64 bg-zinc-950 text-zinc-400 h-screen flex flex-col border-r border-zinc-800">
    <div className="p-6 flex items-center gap-3 text-white">
      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
        <Activity className="w-5 h-5 text-zinc-950" />
      </div>
      <span className="font-bold text-lg tracking-tight">ABC Patient Directory</span>
    </div>
    
    <nav className="flex-1 px-4 space-y-2 mt-4">
      {[
        { id: 'directory', icon: Users, label: 'Patient Directory' },
        { id: 'chat', icon: MessageSquare, label: 'Health Assistant' },
         { id: 'audit', icon: HistoryIcon, label: 'Audit Trail' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activeTab === item.id 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>

    <div className="p-4 border-t border-zinc-800 space-y-4">
      <div className="bg-zinc-900/50 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">System Status</p>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          AI Engine Online
        </div>
      </div>
      
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-zinc-900 hover:text-red-400 text-zinc-400"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </button>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('directory');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{ emrs: EMR[], documents: Document[], medicalCharts: MedicalChart[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAIUploadEntryModalOpen, setIsAIUploadEntryModalOpen] = useState(false);
  const [isUpdateLastVisitModalOpen, setIsUpdateLastVisitModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isDeletePatientModalOpen, setIsDeletePatientModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('patient_chart');
  const [availableTemplates, setAvailableTemplates] = useState<OCRTemplate[]>([]);
  const [selectedChart, setSelectedChart] = useState<MedicalChart | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your MediFlow assistant. How can I help you with patient records today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Debug logging
  console.log('App rendering - isAuthenticated:', isAuthenticated, 'authToken:', authToken ? 'present' : 'null');

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('mediflow_auth_token');
    console.log('Checking localStorage for token:', token ? 'found' : 'not found');
    
    if (token) {
      // Verify token is still valid
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          console.log('Token validation response:', res.status);
          if (res.ok) {
            setAuthToken(token);
            setIsAuthenticated(true);
          } else {
            console.log('Token invalid, clearing localStorage');
            localStorage.removeItem('mediflow_auth_token');
            setAuthToken(null);
            setIsAuthenticated(false);
          }
        })
        .catch((err) => {
          console.error('Token validation error:', err);
          localStorage.removeItem('mediflow_auth_token');
          setAuthToken(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  const handleLoginSuccess = async (token: string) => {
    console.log('Login success! Token received:', token.substring(0, 20) + '...');
    localStorage.setItem('mediflow_auth_token', token);
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Immediately fetch patients after successful login
    try {
      console.log('Fetching patients immediately after login...');
      const res = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Immediate fetch response:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Patients loaded immediately:', data.length);
        setPatients(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch patients immediately:', res.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching patients immediately:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mediflow_auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  // Fetch patients when authenticated
  useEffect(() => {
    if (authToken && isAuthenticated) {
      fetchPatients();
      fetchTemplates();
    }
  }, [authToken, isAuthenticated]);

  const fetchTemplates = async () => {
    if (!authToken) return;
    
    try {
      const res = await fetch('/api/ocr/templates', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchPatients = async () => {
    if (!authToken) {
      console.log('No auth token available, skipping patient fetch');
      return;
    }
    
    try {
      console.log('Fetching patients with token:', authToken?.substring(0, 20) + '...');
      console.log('Full Authorization header:', `Bearer ${authToken.substring(0, 30)}...`);
      
      const res = await fetch('/api/patients', {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fetch patients response:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch patients:', res.status, errorData);
        
        // If token is invalid, clear auth state
        if (res.status === 401 || res.status === 403) {
          console.log('Token invalid, clearing auth state');
          localStorage.removeItem('mediflow_auth_token');
          setAuthToken(null);
          setIsAuthenticated(false);
        }
        return;
      }
      
      const data = await res.json();
      console.log('Patients loaded successfully:', data.length, 'patients');
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchPatientDetails = async (id: string) => {
    if (!authToken) {
      console.error('No auth token available for fetching patient details');
      return;
    }
    
    try {
      const res = await fetch(`/api/patients/${id}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch patient details:', res.status, errorData);
        return;
      }
      
      const data = await res.json();
      console.log('Patient details loaded:', data);
      setSelectedPatient(data);
      
      // Fetch medical charts
      const chartsRes = await fetch(`/api/medical-charts/${id}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const medicalCharts = chartsRes.ok ? await chartsRes.json() : [];
      
      setPatientDetails({ 
        emrs: data.emrs, 
        documents: data.documents,
        medicalCharts: medicalCharts
      });
    } catch (error) {
      console.error('Error fetching patient details:', error);
    }
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const patientData = Object.fromEntries(formData.entries());
    
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(patientData),
    });
    
    setIsAddingPatient(false);
    fetchPatients();
  };

  const handleAIUploadEntry = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setIsProcessing(true);
    setIsAIUploadEntryModalOpen(false);
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/patients/ai-create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            imageData: base64
          }),
        });
        
        if (res.ok) {
          const result = await res.json();
          console.log('AI Upload Entry complete:', result);
          fetchPatients();
          // Optionally open the newly created patient
          if (result.patient_id) {
            fetchPatientDetails(result.patient_id);
          }
        } else {
          const error = await res.json();
          console.error('AI Upload Entry failed:', error);
          alert('Failed to create patient from document: ' + (error.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('AI Upload Entry error:', err);
        alert('Failed to process document');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedPatient) return;
    
    setIsProcessing(true);
    setIsUploadModalOpen(false);
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            imageData: base64,
            template: selectedTemplate
          }),
        });
        
        if (res.ok) {
          const result = await res.json();
          console.log('OCR processing complete:', result);
          fetchPatientDetails(selectedPatient.id);
        } else {
          const error = await res.json();
          console.error('OCR processing failed:', error);
          alert('Failed to process document: ' + (error.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload document');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleUpdateLastVisit = async () => {
    if (!selectedPatient || !authToken) {
      console.error('Cannot update last visit: missing patient or auth token');
      alert('Error: Patient or authentication token missing');
      return;
    }
    
    setIsUpdateLastVisitModalOpen(false);
    setIsProcessing(true);
    
    try {
      const patientId = selectedPatient.id;
      console.log('=== UPDATE LAST VISIT - FRONTEND ===');
      console.log('Patient ID:', patientId);
      console.log('Patient Name:', selectedPatient.first_name, selectedPatient.last_name);
      console.log('Auth token present:', !!authToken);
      console.log('Auth token (first 20 chars):', authToken.substring(0, 20) + '...');
      
      const url = `/api/patients/${encodeURIComponent(patientId)}/last-visit`;
      console.log('Request URL:', url);
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', res.status);
      console.log('Response status text:', res.statusText);
      
      if (res.ok) {
        const result = await res.json();
        console.log('✅ Last visit updated successfully:', result);
        
        // Refresh data
        console.log('Refreshing patient list...');
        await fetchPatients();
        console.log('Refreshing patient details...');
        await fetchPatientDetails(selectedPatient.id);
        console.log('✅ Data refreshed');
        
        alert('Last visit updated successfully!');
      } else {
        const errorText = await res.text();
        console.error('❌ Failed to update last visit');
        console.error('Status:', res.status);
        console.error('Response:', errorText);
        
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        alert(`Failed to update last visit: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Error updating last visit:', error);
      console.error('Error details:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      alert(`Failed to update last visit: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient({...patient});
    setIsEditPatientModalOpen(true);
  };

  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient || !authToken) return;
    
    try {
      const res = await fetch(`/api/patients/${editingPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          first_name: editingPatient.first_name,
          last_name: editingPatient.last_name,
          date_of_birth: editingPatient.date_of_birth,
          gender: editingPatient.gender,
          phone: editingPatient.phone,
          email: editingPatient.email,
          address: editingPatient.address
        })
      });
      
      if (res.ok) {
        setIsEditPatientModalOpen(false);
        setEditingPatient(null);
        await fetchPatients();
        if (selectedPatient?.id === editingPatient.id) {
          await fetchPatientDetails(editingPatient.id);
        }
        alert('Patient information updated successfully!');
      } else {
        const error = await res.json();
        alert('Failed to update patient: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient information');
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeletePatientModalOpen(true);
  };

  const confirmDeletePatient = async () => {
    if (!patientToDelete || !authToken) return;
    
    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.ok) {
        setIsDeletePatientModalOpen(false);
        setPatientToDelete(null);
        if (selectedPatient?.id === patientToDelete.id) {
          setSelectedPatient(null);
          setPatientDetails(null);
        }
        await fetchPatients();
        alert('Patient deleted successfully');
      } else {
        const error = await res.json();
        alert('Failed to delete patient: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient');
    }
  };

  const handleReviewChart = (chart: MedicalChart) => {
    setSelectedChart(chart);
    setIsReviewModalOpen(true);
  };

  const handleDeleteChart = (chartId: string) => {
    setChartToDelete(chartId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteChart = async () => {
    if (!chartToDelete || !authToken) return;
    
    try {
      const res = await fetch(`/api/medical-charts/${chartToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (res.ok) {
        setIsDeleteConfirmOpen(false);
        setChartToDelete(null);
        if (selectedPatient) {
          fetchPatientDetails(selectedPatient.id);
        }
      } else {
        alert('Failed to delete medical chart');
      }
    } catch (error) {
      console.error('Error deleting chart:', error);
      alert('Failed to delete medical chart');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedChart || !authToken) return;
    
    try {
      const res = await fetch(`/api/medical-charts/${selectedChart.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          diagnosis: selectedChart.diagnosis,
          treatment_plan: selectedChart.treatment_plan,
          notes: selectedChart.notes,
          custom_fields: selectedChart.custom_fields,
          reviewed: true,
          reviewer_notes: selectedChart.reviewer_notes
        })
      });
      
      if (res.ok) {
        setIsReviewModalOpen(false);
        if (selectedPatient) {
          fetchPatientDetails(selectedPatient.id);
        }
      }
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save review');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: Message = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: currentInput,
          history: chatMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        }),
      });
      
      const data = await res.json();
      if (data.text) {
        setChatMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        throw new Error(data.error || "No response");
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error processing your request." }]);
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group patients by Cabinet (First letter of Last Name)
  const groupedPatients = filteredPatients.reduce((acc, patient) => {
    const cabinet = patient.last_name[0].toUpperCase();
    if (!acc[cabinet]) acc[cabinet] = [];
    acc[cabinet].push(patient);
    return acc;
  }, {} as Record<string, Patient[]>);

  const cabinets = Object.keys(groupedPatients).sort();

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    console.log('Showing login screen');
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  console.log('Showing main app - patients:', patients.length);

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'directory' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Patient List */}
            <div className={`flex-1 flex flex-col border-r border-zinc-200 bg-white transition-all ${selectedPatient ? 'max-w-xl' : 'w-full'}`}>
              <header className="p-6 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Patient Archives</h1>
                  <p className="text-sm text-zinc-500">Organized by Cabinets A-Z</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAIUploadEntryModalOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    AI Upload Entry
                  </button>
                  <button 
                    onClick={() => setIsAddingPatient(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    New Entry
                  </button>
                </div>
              </header>

              <div className="px-6 py-4 bg-white border-b border-zinc-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    placeholder="Search by name or cabinet..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-zinc-50/30">
                {cabinets.length > 0 ? (
                  cabinets.map(cabinet => (
                    <div key={cabinet} className="mb-6">
                      <div className="sticky top-0 bg-zinc-100/80 backdrop-blur-sm px-6 py-2 border-y border-zinc-200 flex items-center gap-2">
                        <div className="w-6 h-6 bg-zinc-800 text-white rounded flex items-center justify-center text-xs font-bold">
                          {cabinet}
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cabinet {cabinet}</span>
                      </div>
                      
                      <div className="divide-y divide-zinc-100">
                        {groupedPatients[cabinet].map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => fetchPatientDetails(patient.id)}
                            className={`w-full text-left p-6 transition-all group flex items-start gap-4 ${
                              selectedPatient?.id === patient.id 
                                ? 'bg-emerald-50/50 ring-1 ring-inset ring-emerald-100' 
                                : 'bg-white hover:bg-zinc-50'
                            }`}
                          >
                            <div className="w-14 h-14 bg-zinc-200 rounded-2xl flex-shrink-0 flex items-center justify-center text-zinc-600 font-bold text-xl shadow-sm">
                              {patient.first_name[0]}{patient.last_name[0]}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-zinc-900 text-lg truncate">
                                  {patient.last_name}, {patient.first_name}
                                </h3>
                                <span className="text-[10px] font-bold text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  ID: {patient.id.slice(0, 4)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="flex items-center gap-2 text-zinc-500">
                                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="truncate">{patient.phone || 'No phone'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500">
                                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="truncate">{patient.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 col-span-2">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Last Visit: {patient.last_visit_date || 'No visits yet'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <ChevronRight className={`w-5 h-5 transition-transform ${selectedPatient?.id === patient.id ? 'text-emerald-500 translate-x-1' : 'text-zinc-300'}`} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-zinc-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No patients found in archives.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient Detail View */}
            <AnimatePresence mode="wait">
              {selectedPatient ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 bg-zinc-50 overflow-y-auto"
                >
                  <div className="p-8 max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex gap-6 items-center">
                        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/20">
                          {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold tracking-tight">{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                          <div className="flex gap-4 mt-2 text-zinc-500">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {selectedPatient.date_of_birth}</span>
                            <span className="flex items-center gap-1.5 capitalize"><Users className="w-4 h-4" /> {selectedPatient.gender}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditPatient(selectedPatient)}
                          className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-600"
                          title="Edit patient information"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeletePatient(selectedPatient)}
                          className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                          title="Delete patient"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setSelectedPatient(null)}
                          className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                        >
                          <X className="w-6 h-6 text-zinc-400" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                        <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Phone</p>
                        <p className="flex items-center gap-2 font-medium"><Phone className="w-4 h-4 text-emerald-500" /> {selectedPatient.phone}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                        <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Email</p>
                        <p className="flex items-center gap-2 font-medium"><Mail className="w-4 h-4 text-emerald-500" /> {selectedPatient.email}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                        <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Address</p>
                        <p className="flex items-center gap-2 font-medium truncate"><MapPin className="w-4 h-4 text-emerald-500" /> {selectedPatient.address}</p>
                      </div>
                    </div>

                    {/* EMR History */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Clipboard className="w-5 h-5 text-emerald-500" />
                          Medical Records
                        </h3>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setIsUpdateLastVisitModalOpen(true)}
                            disabled={isProcessing}
                            className="bg-amber-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calendar className="w-4 h-4" />
                            Update Last Visit
                          </button>
                          <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            disabled={isProcessing}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Upload className="w-4 h-4" />
                            AI Upload
                          </button>
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center justify-center gap-3 text-emerald-700">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          AI is analyzing document and generating medical chart...
                        </div>
                      )}

                      {/* Medical Charts (OCR Extracted) */}
                      {patientDetails?.medicalCharts && patientDetails.medicalCharts.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            AI-Extracted Medical Charts
                          </h4>
                          {patientDetails.medicalCharts
                            .filter(chart => chart.document_type !== 'Visit Update')
                            .map((chart) => (
                            <div key={chart.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                              <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-zinc-600">{chart.visit_date}</span>
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md uppercase">
                                    {chart.document_type}
                                  </span>
                                  {chart.reviewed ? (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md uppercase flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Reviewed
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md uppercase flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Needs Review
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-zinc-500">
                                    Confidence: <span className={`font-bold ${chart.confidence_score >= 0.8 ? 'text-emerald-600' : chart.confidence_score >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {(chart.confidence_score * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => handleReviewChart(chart)}
                                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600 hover:text-emerald-600"
                                    title={chart.reviewed ? "View chart" : "Review chart"}
                                  >
                                    {chart.reviewed ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteChart(chart.id)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-zinc-600 hover:text-red-600"
                                    title="Delete chart"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-6 space-y-4">
                                {chart.diagnosis && (
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Diagnosis</h4>
                                    <p className="text-lg font-semibold text-zinc-900">{chart.diagnosis}</p>
                                  </div>
                                )}
                                {chart.custom_fields && Object.keys(chart.custom_fields).length > 0 && (
                                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Extracted Data</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      {Object.entries(chart.custom_fields).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-zinc-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                          <span className="ml-2 font-medium text-zinc-900">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {chart.notes && (
                                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Additional Notes</h4>
                                    <p className="text-sm text-zinc-600 italic">{chart.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Legacy EMRs - HIDDEN per REFACTOR-PLAN.md */}
                      {/* Visit Records section removed - only medical charts should display */}
                      <div className="space-y-4">
                        {patientDetails?.emrs.length === 0 && 
                         patientDetails?.medicalCharts.filter(c => c.document_type !== 'Visit Update').length === 0 && 
                         !isProcessing && (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
                            <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                            <p className="text-zinc-500">No medical records found for this patient.</p>
                            <p className="text-sm text-zinc-400 mt-2">Upload a document to get started with AI extraction.</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Documents */}
                    {patientDetails?.documents.length! > 0 && (
                      <section className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-500" />
                          Uploaded Documents
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {patientDetails?.documents.map((doc) => (
                            <div key={doc.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center gap-4 shadow-sm">
                              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-zinc-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{doc.document_type}</p>
                                <p className="text-xs text-zinc-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                              </div>
                              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50">
                  <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                    <Users className="w-12 h-12 text-zinc-200" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900">Select a patient</h3>
                  <p>Choose a patient from the list to view their medical history</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white">
            <header className="p-6 border-b border-zinc-100">
              <h1 className="text-2xl font-bold tracking-tight">MediFlow Assistant</h1>
              <p className="text-zinc-500">AI-powered health record assistant</p>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
                      : 'bg-zinc-100 text-zinc-800'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-zinc-100">
              <div className="max-w-4xl mx-auto relative">
                <input 
                  type="text"
                  placeholder="Ask about patients, scheduling, or records..."
                  className="w-full pl-6 pr-16 py-4 bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-2xl transition-all outline-none shadow-sm"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingPatient(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Add New Patient</h2>
                <button onClick={() => setIsAddingPatient(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddPatient} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">First Name</label>
                    <input name="first_name" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Last Name</label>
                    <input name="last_name" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Date of Birth</label>
                    <input name="date_of_birth" type="date" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Gender</label>
                    <select name="gender" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Phone</label>
                    <input name="phone" type="tel" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Email</label>
                    <input name="email" type="email" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Address</label>
                  <textarea name="address" rows={2} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none" />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingPatient(false)} className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">Create Patient Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Template Selection Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Upload Medical Document</h2>
                  <p className="text-sm text-zinc-500 mt-1">Select a template and upload an image for AI extraction</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Document Template</label>
                  <select 
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="patient_chart">Patient Chart</option>
                    <option value="custom">Custom Template</option>
                  </select>
                  {selectedTemplate === 'patient_chart' && (
                    <p className="text-sm text-zinc-500 italic">
                      Standard patient medical chart (main template)
                    </p>
                  )}
                  {selectedTemplate === 'custom' && (
                    <p className="text-sm text-zinc-500 italic">
                      Flexible template for special cases
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Upload Image</label>
                  <label className="cursor-pointer block">
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-all">
                      <Upload className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                      <p className="text-zinc-600 font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-zinc-400 mt-1">JPEG, PNG, or PDF (max 10MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      accept="image/*,.pdf" 
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chart Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedChart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Review Medical Chart</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Confidence: <span className={`font-bold ${selectedChart.confidence_score >= 0.8 ? 'text-emerald-600' : selectedChart.confidence_score >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                      {(selectedChart.confidence_score * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
                <button onClick={() => setIsReviewModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Visit Date</label>
                    <input 
                      type="date"
                      value={selectedChart.visit_date}
                      onChange={(e) => setSelectedChart({...selectedChart, visit_date: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Document Type</label>
                    <input 
                      type="text"
                      value={selectedChart.document_type}
                      onChange={(e) => setSelectedChart({...selectedChart, document_type: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Diagnosis</label>
                  <textarea 
                    value={selectedChart.diagnosis || ''}
                    onChange={(e) => setSelectedChart({...selectedChart, diagnosis: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Treatment Plan</label>
                  <textarea 
                    value={selectedChart.treatment_plan || ''}
                    onChange={(e) => setSelectedChart({...selectedChart, treatment_plan: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Additional Notes</label>
                  <textarea 
                    value={selectedChart.notes || ''}
                    onChange={(e) => setSelectedChart({...selectedChart, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Reviewer Notes</label>
                  <textarea 
                    value={selectedChart.reviewer_notes || ''}
                    onChange={(e) => setSelectedChart({...selectedChart, reviewer_notes: e.target.value})}
                    rows={2}
                    placeholder="Add any corrections or observations..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                {selectedChart.raw_ocr_text && (
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Raw OCR Text</h4>
                    <p className="text-sm text-zinc-600 font-mono whitespace-pre-wrap">{selectedChart.raw_ocr_text}</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-100 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsReviewModalOpen(false)} 
                  className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveReview}
                  className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save & Mark Reviewed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Delete Medical Chart?</h2>
                <p className="text-zinc-600 mb-6">
                  Are you sure you want to delete this AI-extracted medical chart? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteChart}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Upload Entry Modal */}
      <AnimatePresence>
        {isAIUploadEntryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAIUploadEntryModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">AI Upload Entry</h2>
                  <p className="text-sm text-zinc-500 mt-1">Create new patient + medical record from document</p>
                </div>
                <button onClick={() => setIsAIUploadEntryModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will automatically create a new patient record and their first medical chart from the uploaded document using AI extraction.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Upload Patient Chart Image</label>
                  <label className="cursor-pointer block">
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                      <Upload className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                      <p className="text-zinc-600 font-medium">Click to upload patient chart</p>
                      <p className="text-sm text-zinc-400 mt-1">JPEG, PNG, or PDF (max 10MB)</p>
                      <p className="text-xs text-blue-600 mt-2">Will extract: Name, DOB, Gender, Phone, Email, Address, Diagnosis</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleAIUploadEntry} 
                      accept="image/*,.pdf" 
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Last Visit Confirmation Modal */}
      <AnimatePresence>
        {isUpdateLastVisitModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdateLastVisitModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Update Last Visit?</h2>
                <p className="text-zinc-600 mb-2">
                  Update last visit date for <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong> to:
                </p>
                <p className="text-lg font-bold text-amber-600 mb-6">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsUpdateLastVisitModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateLastVisit}
                    className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Patient Modal */}
      <AnimatePresence>
        {isEditPatientModalOpen && editingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditPatientModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Edit Patient Information</h2>
                  <p className="text-sm text-zinc-500 mt-1">Update patient details</p>
                </div>
                <button onClick={() => setIsEditPatientModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <form onSubmit={handleSavePatient} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">First Name</label>
                    <input 
                      value={editingPatient.first_name}
                      onChange={(e) => setEditingPatient({...editingPatient, first_name: e.target.value})}
                      required 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Last Name</label>
                    <input 
                      value={editingPatient.last_name}
                      onChange={(e) => setEditingPatient({...editingPatient, last_name: e.target.value})}
                      required 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Date of Birth</label>
                    <input 
                      type="date"
                      value={editingPatient.date_of_birth}
                      onChange={(e) => setEditingPatient({...editingPatient, date_of_birth: e.target.value})}
                      required 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Gender</label>
                    <select 
                      value={editingPatient.gender}
                      onChange={(e) => setEditingPatient({...editingPatient, gender: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Phone</label>
                    <input 
                      type="tel"
                      value={editingPatient.phone || ''}
                      onChange={(e) => setEditingPatient({...editingPatient, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase">Email</label>
                    <input 
                      type="email"
                      value={editingPatient.email || ''}
                      onChange={(e) => setEditingPatient({...editingPatient, email: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">Address</label>
                  <textarea 
                    value={editingPatient.address || ''}
                    onChange={(e) => setEditingPatient({...editingPatient, address: e.target.value})}
                    rows={2} 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none" 
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditPatientModalOpen(false)} 
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Patient Confirmation Modal */}
      <AnimatePresence>
        {isDeletePatientModalOpen && patientToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeletePatientModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Delete Patient?</h2>
                <p className="text-zinc-600 mb-2">
                  Are you sure you want to permanently delete:
                </p>
                <p className="text-lg font-bold text-red-600 mb-2">
                  {patientToDelete.first_name} {patientToDelete.last_name}
                </p>
                <p className="text-sm text-zinc-500 mb-6">
                  This will delete all medical records, documents, and data associated with this patient. This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDeletePatientModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeletePatient}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
