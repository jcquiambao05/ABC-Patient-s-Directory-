import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Plus, Upload, FileText, Image, CheckCircle, Camera } from 'lucide-react';
import { api } from '../lib/api';
import ConsultationTable from './ConsultationTable';
import type { Patient, ChartImage, Procedure, Prescription } from '../types/index';

interface Props {
  patient: Patient;
  token: string;
  role: string | null;
  onClose: () => void;
  onRefresh: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function DetailPanel({ patient, token, role, onClose, onRefresh, isExpanded, onToggleExpand }: Props) {
  const [fullData, setFullData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'history' | 'consultations' | 'charts'>('general');
  const [chartImages, setChartImages] = useState<ChartImage[]>([]);
  const [uploadingChart, setUploadingChart] = useState(false);
  const [chartUploadError, setChartUploadError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pd, ci] = await Promise.all([
        api(`/api/patients/${patient.id}`, {}, token),
        api(`/api/patients/${patient.id}/chart-images`, {}, token),
      ]);
      setFullData(pd);
      setChartImages(ci);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [patient.id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChartImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingChart(true); setChartUploadError('');
    try {
      const fd = new FormData(); fd.append('file', f);
      const res = await fetch(`/api/patients/${patient.id}/chart-image`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      await loadData();
    } catch (err) { setChartUploadError((err as Error).message); }
    finally { setUploadingChart(false); }
  };

  const mh = fullData?.medical_history;
  const pmLabels: Record<string, string> = { hypertension: 'Hypertension', heart_disease: 'Heart Disease', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', tuberculosis: 'Tuberculosis', chronic_kidney_disease: 'Chronic Kidney Disease', thyroid_disease: 'Thyroid Disease', allergies: 'Allergies', surgeries: 'Surgeries', others: 'Others' };
  const psLabels: Record<string, string> = { smoker: 'Smoker', alcohol_intake: 'Alcohol Intake', exposures: 'Exposures', others: 'Others' };
  const fhLabels: Record<string, string> = { hypertension: 'Hypertension', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', cancer: 'Cancer', others: 'Others' };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'history', label: 'Medical History' },
    { id: 'consultations', label: 'Consultations' },
    { id: 'charts', label: 'Chart Images' },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center gap-3 bg-white sticky top-0 z-10">
        <button onClick={onToggleExpand} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {patient.profile_photo_path
              ? <img src={`/${patient.profile_photo_path}`} alt="" className="w-full h-full object-cover" />
              : <span className="font-bold text-zinc-600 text-sm">{patient.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-zinc-900 truncate">{patient.full_name}</h2>
            <p className="text-xs text-zinc-500">
              {patient.gender || ''}{patient.age ? ` · ${patient.age} yrs` : ''}{patient.civil_status ? ` · ${patient.civil_status}` : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X className="w-4 h-4" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === t.id ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
        ) : (
          <>
            {/* General Data */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Patient Name', patient.full_name],
                    ['Age / Gender', `${patient.age || '—'} / ${patient.gender || '—'}`],
                    ['Date of Birth', patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—'],
                    ['Civil Status', patient.civil_status || '—'],
                    ['Contact Number', patient.contact_number || '—'],
                    ['Occupation', patient.occupation || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-zinc-50 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-zinc-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-0.5">Address</p>
                  <p className="text-sm font-medium text-zinc-900">{patient.address || '—'}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-0.5">Referred By</p>
                  <p className="text-sm font-medium text-zinc-900">{patient.referred_by || '—'}</p>
                </div>
                {patient.privacy_consent_at && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl p-3">
                    <CheckCircle className="w-4 h-4" />
                    <span>Consent signed {new Date(patient.privacy_consent_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Medical History */}
            {activeTab === 'history' && mh && (
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-zinc-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Past Medical History</h4>
                  <div className="space-y-1.5">
                    {Object.entries(mh.past_medical || {}).map(([key, val]: any) => (
                      <div key={key}>
                        <div className={`flex items-center gap-2 text-xs ${val.checked ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          <span className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center ${val.checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'}`}>
                            {val.checked && <span className="text-white text-[8px]">✓</span>}
                          </span>
                          {pmLabels[key] || key}
                        </div>
                        {val.checked && val.notes && <p className="text-xs text-zinc-500 ml-5 mt-0.5">{val.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Maintenance Medications</h4>
                    <p className="text-xs text-zinc-700 whitespace-pre-wrap">{mh.maintenance_medications_text || '—'}</p>
                    {mh.maintenance_medications_image_path && (
                      <img src={`/${mh.maintenance_medications_image_path}`} alt="Medication" className="mt-2 rounded-lg max-h-32 object-contain" />
                    )}
                  </div>
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Travel History</h4>
                    <p className="text-xs text-zinc-700 whitespace-pre-wrap">{mh.travel_history || '—'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Personal / Social History</h4>
                    <div className="space-y-1.5">
                      {Object.entries(mh.personal_social_history || {}).map(([key, val]: any) => (
                        <div key={key} className={`flex items-center gap-2 text-xs ${val ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          <span className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center ${val ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'}`}>
                            {val && <span className="text-white text-[8px]">✓</span>}
                          </span>
                          {psLabels[key] || key}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Family History</h4>
                    <div className="space-y-1.5">
                      {Object.entries(mh.family_history || {}).map(([key, val]: any) => (
                        <div key={key} className={`flex items-center gap-2 text-xs ${val ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          <span className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center ${val ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'}`}>
                            {val && <span className="text-white text-[8px]">✓</span>}
                          </span>
                          {fhLabels[key] || key}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Consultations */}
            {activeTab === 'consultations' && (
              <ConsultationTable
                records={fullData?.consultation_records || []}
                token={token}
                patientId={patient.id}
                role={role}
                onRefresh={loadData}
              />
            )}

            {/* Chart Images */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-700">Physical Chart Images</h3>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs cursor-pointer transition-colors">
                    {uploadingChart ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload Chart
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleChartImageUpload} disabled={uploadingChart} />
                  </label>
                </div>
                {chartUploadError && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{chartUploadError}</div>}
                {chartImages.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">No chart images uploaded yet</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {chartImages.map(ci => (
                      <a key={ci.id} href={`/${ci.file_path}`} target="_blank" rel="noopener noreferrer"
                        className="border border-zinc-200 rounded-xl p-3 hover:border-emerald-300 transition-colors">
                        <div className="flex items-center gap-2">
                          {ci.file_type === 'application/pdf' ? <FileText className="w-8 h-8 text-red-400" /> : <Image className="w-8 h-8 text-blue-400" />}
                          <div>
                            <p className="text-xs font-medium text-zinc-700">{ci.file_type === 'application/pdf' ? 'PDF' : 'Image'}</p>
                            <p className="text-xs text-zinc-400">{new Date(ci.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
