import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Upload, FileText, Image, CheckCircle, Edit3, Trash2, Printer } from 'lucide-react';
import { api } from '../lib/api';
import ConsultationTable from './ConsultationTable';
import EditPatientModal from './EditPatientModal';
import ProcedureModal from './ProcedureModal';
import PrescriptionSection from './PrescriptionSection';
import type { Patient, ChartImage, Procedure } from '../types/index';

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
  const [activeTab, setActiveTab] = useState<'general' | 'history' | 'consultations' | 'charts' | 'procedures' | 'prescriptions'>('general');
  const [chartImages, setChartImages] = useState<ChartImage[]>([]);
  const [uploadingChart, setUploadingChart] = useState(false);
  const [chartUploadError, setChartUploadError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<ChartImage | null>(null);
  const [deleteConfirmImage, setDeleteConfirmImage] = useState<ChartImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pd, ci, pr] = await Promise.all([
        api(`/api/patients/${patient.id}`, {}, token),
        api(`/api/patients/${patient.id}/chart-images`, {}, token),
        api(`/api/procedures/${patient.id}`, {}, token),
      ]);
      setFullData(pd);
      setChartImages(ci);
      setProcedures(pr);
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

  const handlePrint = () => {
    if (!fullData) return;
    const mh = fullData.medical_history;
    const records = fullData.consultation_records || [];

    const pmLabelsLocal: Record<string, string> = { hypertension: 'Hypertension', heart_disease: 'Heart Disease', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', tuberculosis: 'Tuberculosis', chronic_kidney_disease: 'Chronic Kidney Disease', thyroid_disease: 'Thyroid Disease', allergies: 'Allergies', surgeries: 'Surgeries', others: 'Others' };

    const checkedPM = mh?.past_medical ? Object.entries(mh.past_medical).filter(([, v]: any) => v.checked).map(([k]: any) => pmLabelsLocal[k] || k) : [];
    const checkedPS = mh?.personal_social_history ? Object.entries(mh.personal_social_history).filter(([, v]) => v).map(([k]) => k.replace('_', ' ')) : [];
    const checkedFH = mh?.family_history ? Object.entries(mh.family_history).filter(([, v]) => v).map(([k]) => pmLabelsLocal[k] || k) : [];

    const html = `<!DOCTYPE html><html><head><title>Patient Record — ${patient.full_name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; background: #f0f0f0; padding: 4px 8px; margin: 16px 0 8px; border-left: 3px solid #10b981; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 8px; }
  .field label { font-size: 10px; color: #666; text-transform: uppercase; display: block; }
  .field span { font-weight: bold; }
  .clinic { font-size: 11px; color: #666; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f0f0f0; padding: 4px 8px; text-align: left; border: 1px solid #ddd; }
  td { padding: 4px 8px; border: 1px solid #ddd; vertical-align: top; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
  @media print { body { margin: 10px; } }
</style></head><body>
<div class="clinic">ABC Patient Directory — Printed ${new Date().toLocaleString()}</div>
<h1>${patient.full_name}</h1>
<p style="color:#555;margin:0 0 12px">${patient.gender || ''}${patient.age ? ` · ${patient.age} yrs` : ''}${patient.civil_status ? ` · ${patient.civil_status}` : ''}</p>

<h2>General Data</h2>
<div class="grid">
  <div class="field"><label>Date of Birth</label><span>${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}</span></div>
  <div class="field"><label>Contact Number</label><span>${patient.contact_number || '—'}</span></div>
  <div class="field"><label>Occupation</label><span>${patient.occupation || '—'}</span></div>
  <div class="field"><label>Referred By</label><span>${patient.referred_by || '—'}</span></div>
  <div class="field" style="grid-column:1/-1"><label>Address</label><span>${patient.address || '—'}</span></div>
</div>

${mh ? `
<h2>Medical History</h2>
<div class="grid">
  <div class="field"><label>Past Medical Conditions</label>
    ${checkedPM.length ? `<div class="tags">${checkedPM.map(c => `<span class="tag">${c}</span>`).join('')}</div>` : '<span>None checked</span>'}
  </div>
  <div class="field"><label>Personal / Social History</label>
    ${checkedPS.length ? `<div class="tags">${checkedPS.map(c => `<span class="tag">${c}</span>`).join('')}</div>` : '<span>None checked</span>'}
  </div>
  <div class="field"><label>Family History</label>
    ${checkedFH.length ? `<div class="tags">${checkedFH.map(c => `<span class="tag">${c}</span>`).join('')}</div>` : '<span>None checked</span>'}
  </div>
  <div class="field"><label>Maintenance Medications</label><span>${mh.maintenance_medications_text || '—'}</span></div>
  <div class="field" style="grid-column:1/-1"><label>Travel History</label><span>${mh.travel_history || '—'}</span></div>
</div>` : ''}

${records.length ? `
<h2>Consultation Records (${records.length})</h2>
<table>
  <thead><tr><th>Date</th><th>Subjective / Clinical Findings</th><th>Assessment / Plan</th><th>Status</th></tr></thead>
  <tbody>
    ${records.map((r: any) => `<tr>
      <td>${new Date(r.date).toLocaleDateString()}</td>
      <td>${r.subjective_clinical_findings || '—'}</td>
      <td>${r.assessment_plan || '—'}</td>
      <td>${r.reviewed ? `Reviewed ${r.marked_at ? new Date(r.marked_at).toLocaleDateString() : ''}` : 'Pending'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

</body></html>`;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };
  const pmLabels: Record<string, string> = { hypertension: 'Hypertension', heart_disease: 'Heart Disease', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', tuberculosis: 'Tuberculosis', chronic_kidney_disease: 'Chronic Kidney Disease', thyroid_disease: 'Thyroid Disease', allergies: 'Allergies', surgeries: 'Surgeries', others: 'Others' };
  const psLabels: Record<string, string> = { smoker: 'Smoker', alcohol_intake: 'Alcohol Intake', exposures: 'Exposures', others: 'Others' };
  const fhLabels: Record<string, string> = { hypertension: 'Hypertension', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', cancer: 'Cancer', others: 'Others' };
  const mh = fullData?.medical_history;

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'history', label: 'Medical History' },
    { id: 'consultations', label: 'Consultations' },
    { id: 'charts', label: 'Chart Images' },
    { id: 'procedures', label: 'Procedures' },
    { id: 'prescriptions', label: 'Prescriptions' },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center gap-3 bg-white sticky top-0 z-10">
        <button onClick={onToggleExpand} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {patient.profile_photo_path
              ? <img src={`/${patient.profile_photo_path}`} alt="" className="w-full h-full object-cover" />
              : <span className="font-bold text-zinc-600 text-sm">{patient.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 truncate">{patient.full_name}</h2>
            <p className="text-sm text-zinc-500">
              {patient.gender || ''}{patient.age ? ` · ${patient.age} yrs` : ''}{patient.civil_status ? ` · ${patient.civil_status}` : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X className="w-4 h-4" /></button>
      </div>

      {/* Staff actions */}
      {role === 'staff' && (
        <div className="px-4 py-2 border-b border-zinc-100 flex gap-2 bg-zinc-50">
          <button onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 hover:border-emerald-400 text-zinc-700 hover:text-emerald-600 rounded-lg text-sm font-medium transition-colors">
            <Edit3 className="w-3.5 h-3.5" /> Edit Patient
          </button>
          <button onClick={async () => {
            if (!confirm(`Delete ${patient.full_name}? This cannot be undone.`)) return;
            try { await api(`/api/patients/${patient.id}`, { method: 'DELETE' }, token); onRefresh(); onClose(); }
            catch (err) { alert((err as Error).message); }
          }} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 hover:border-red-400 text-zinc-700 hover:text-red-600 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 rounded-lg text-sm font-medium transition-colors ml-auto">
            <Printer className="w-3.5 h-3.5" /> Print Record
          </button>
        </div>
      )}
      {role === 'admin' && (
        <div className="px-4 py-2 border-b border-zinc-100 flex gap-2 bg-zinc-50 justify-end">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print Record
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === t.id ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-zinc-500 hover:text-zinc-700'}`}>
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
                    <div key={label} className="bg-zinc-50 rounded-xl p-4">
                      <p className="text-sm text-zinc-500 mb-0.5">{label}</p>
                      <p className="text-base font-medium text-zinc-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-sm text-zinc-500 mb-0.5">Address</p>
                  <p className="text-base font-medium text-zinc-900">{patient.address || '—'}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-sm text-zinc-500 mb-0.5">Referred By</p>
                  <p className="text-base font-medium text-zinc-900">{patient.referred_by || '—'}</p>
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
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Past Medical History</h4>
                  <div className="space-y-1.5">
                    {Object.entries(mh.past_medical || {}).map(([key, val]: any) => (
                      <div key={key}>
                        <div className={`flex items-center gap-2 text-sm ${val.checked ? 'text-zinc-900' : 'text-zinc-400'}`}>
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
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Maintenance Medications</h4>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{mh.maintenance_medications_text || '—'}</p>
                    {mh.maintenance_medications_image_path && (
                      <img src={`/${mh.maintenance_medications_image_path}`} alt="Medication" className="mt-2 rounded-lg max-h-32 object-contain" />
                    )}
                  </div>
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Travel History</h4>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{mh.travel_history || '—'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Personal / Social History</h4>
                    <div className="space-y-1.5">
                      {Object.entries(mh.personal_social_history || {}).map(([key, val]: any) => (
                        <div key={key} className={`flex items-center gap-2 text-sm ${val ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          <span className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center ${val ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'}`}>
                            {val && <span className="text-white text-[8px]">✓</span>}
                          </span>
                          {psLabels[key] || key}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-zinc-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Family History</h4>
                    <div className="space-y-1.5">
                      {Object.entries(mh.family_history || {}).map(([key, val]: any) => (
                        <div key={key} className={`flex items-center gap-2 text-sm ${val ? 'text-zinc-900' : 'text-zinc-400'}`}>
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
                  {role === 'staff' && (
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs cursor-pointer transition-colors">
                      {uploadingChart ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Upload Chart
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleChartImageUpload} disabled={uploadingChart} />
                    </label>
                  )}
                </div>
                {chartUploadError && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{chartUploadError}</div>}
                {chartImages.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">No chart images uploaded yet</div>
                ) : (
                  <div className="space-y-6">
                    {chartImages.map(ci => (
                      <div key={ci.id} className="border border-zinc-200 rounded-xl overflow-hidden">
                        {/* Header bar — filename + date + delete */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                          <div className="flex items-center gap-2">
                            {ci.file_type === 'application/pdf'
                              ? <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                              : <Image className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            <span className="text-sm font-medium text-zinc-700">
                              {ci.file_type === 'application/pdf' ? 'PDF Chart' : 'Chart Image'}
                            </span>
                            <span className="text-xs text-zinc-400">·</span>
                            <span className="text-sm text-zinc-500">
                              {new Date(ci.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={`/${ci.file_path}`} target="_blank" rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-medium transition-colors">
                              Open
                            </a>
                            {role === 'staff' && (
                              <button
                                onClick={() => setDeleteConfirmImage(ci)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Full-width preview */}
                        {ci.file_type === 'application/pdf' ? (
                          <div className="w-full bg-zinc-100 flex items-center justify-center py-12">
                            <div className="text-center">
                              <FileText className="w-16 h-16 text-red-300 mx-auto mb-2" />
                              <p className="text-sm text-zinc-500">PDF document</p>
                              <a href={`/${ci.file_path}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-emerald-600 hover:underline mt-1 inline-block">Click to open</a>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={`/${ci.file_path}`}
                            alt={`Chart uploaded ${new Date(ci.uploaded_at).toLocaleDateString()}`}
                            className="w-full object-cover bg-zinc-50 cursor-zoom-in"
                            style={{ height: '220px' }}
                            onClick={() => setLightboxImage(ci)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Procedures */}
            {activeTab === 'procedures' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-700">Procedures</h3>
                  <button onClick={() => setShowProcedureModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors">
                    + New Procedure
                  </button>
                </div>
                {procedures.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-sm">No procedures recorded</div>
                ) : (
                  <div className="space-y-2">
                    {procedures.map(p => (
                      <div key={p.id} className="border border-zinc-200 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-base text-zinc-800 capitalize">{p.procedure_type}</span>
                          <span className="text-sm text-zinc-400">{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                        {p.signature_path && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Consent signed
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prescriptions */}
            {activeTab === 'prescriptions' && (
              <PrescriptionSection patientId={patient.id} token={token} role={role} />
            )}
          </>
        )}
      </div>

      {showEditModal && (
        <EditPatientModal
          patient={patient}
          token={token}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { loadData(); onRefresh(); setShowEditModal(false); }}
        />
      )}

      {showProcedureModal && (
        <ProcedureModal
          token={token}
          patientId={patient.id}
          onClose={() => setShowProcedureModal(false)}
          onSaved={loadData}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmImage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Chart Image?</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-1">
              Chart image from <span className="text-zinc-200 font-medium">
                {new Date(deleteConfirmImage.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </p>
            <p className="text-zinc-500 text-xs mb-5">This cannot be undone. The file will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmImage(null)}
                className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = deleteConfirmImage;
                  setDeleteConfirmImage(null);
                  try {
                    const res = await fetch(`/api/chart-images/${target.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || `Server error ${res.status}`);
                    }
                    await loadData();
                  } catch (err) { alert((err as Error).message); }
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal for chart image preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center"
            style={{ width: '40vw', height: '40vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`/${lightboxImage.file_path}`}
              alt="Chart preview"
              className="w-full h-full object-contain"
            />
            <p className="absolute bottom-2 left-3 text-zinc-400 text-xs">
              {new Date(lightboxImage.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}