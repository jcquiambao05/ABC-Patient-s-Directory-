/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
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
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

interface Message {
  role: 'user' | 'model';
  text: string;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => (
  <div className="w-64 bg-zinc-950 text-zinc-400 h-screen flex flex-col border-r border-zinc-800">
    <div className="p-6 flex items-center gap-3 text-white">
      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
        <Activity className="w-5 h-5 text-zinc-950" />
      </div>
      <span className="font-bold text-lg tracking-tight">MediFlow AI</span>
    </div>
    
    <nav className="flex-1 px-4 space-y-2 mt-4">
      {[
        { id: 'directory', icon: Users, label: 'Patient Directory' },
        { id: 'chat', icon: MessageSquare, label: 'Health Assistant' },
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

    <div className="p-4 border-t border-zinc-800">
      <div className="bg-zinc-900/50 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">System Status</p>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          AI Engine Online
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('directory');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<{ emrs: EMR[], documents: Document[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your MediFlow assistant. How can I help you with patient records today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Fetch patients
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data);
  };

  const fetchPatientDetails = async (id: string) => {
    const res = await fetch(`/api/patients/${id}`);
    const data = await res.json();
    setSelectedPatient(data);
    setPatientDetails({ emrs: data.emrs, documents: data.documents });
  };

  const handleAddPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const patientData = Object.fromEntries(formData.entries());
    
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    
    setIsAddingPatient(false);
    fetchPatients();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedPatient) return;
    
    setIsProcessing(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            imageData: base64,
            mimeType: file.type
          }),
        });
        
        if (res.ok) {
          fetchPatientDetails(selectedPatient.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
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
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
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
                <button 
                  onClick={() => setIsAddingPatient(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  New Entry
                </button>
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
                                  <span>Born: {patient.date_of_birth}</span>
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
                      <button 
                        onClick={() => setSelectedPatient(null)}
                        className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                      >
                        <X className="w-6 h-6 text-zinc-400" />
                      </button>
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
                        <div className="flex gap-2">
                          <label className="cursor-pointer bg-zinc-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors font-medium">
                            <Upload className="w-4 h-4" />
                            AI Upload
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                          </label>
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center justify-center gap-3 text-emerald-700">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          AI is analyzing document and generating EMR...
                        </div>
                      )}

                      <div className="space-y-4">
                        {patientDetails?.emrs.map((emr) => (
                          <div key={emr.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200 flex justify-between items-center">
                              <span className="font-semibold text-zinc-600">{emr.visit_date}</span>
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md uppercase">Visit</span>
                            </div>
                            <div className="p-6 space-y-4">
                              <div>
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Diagnosis</h4>
                                <p className="text-lg font-semibold text-zinc-900">{emr.diagnosis}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Treatment Plan</h4>
                                <p className="text-zinc-700">{emr.treatment_plan}</p>
                              </div>
                              {emr.notes && (
                                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Notes</h4>
                                  <p className="text-sm text-zinc-600 italic">{emr.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {patientDetails?.emrs.length === 0 && !isProcessing && (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
                            <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                            <p className="text-zinc-500">No medical records found for this patient.</p>
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
    </div>
  );
}
