import React, { useState } from 'react';
import { X, Plus, Loader2, AlertCircle, Camera, CheckCircle, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import ESignatureCanvas from './ESignatureCanvas';
import type { PastMedicalJSON, PersonalSocialJSON, FamilyHistoryJSON } from '../types/index';

interface Props {
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const defaultPastMedical = (): PastMedicalJSON => ({
  hypertension: { checked: false, notes: '' }, heart_disease: { checked: false, notes: '' },
  diabetes_mellitus: { checked: false, notes: '' }, bronchial_asthma: { checked: false, notes: '' },
  tuberculosis: { checked: false, notes: '' }, chronic_kidney_disease: { checked: false, notes: '' },
  thyroid_disease: { checked: false, notes: '' }, allergies: { checked: false, notes: '' },
  surgeries: { checked: false, notes: '' }, others: { checked: false, notes: '' },
});
const defaultPersonalSocial = (): PersonalSocialJSON => ({ smoker: false, alcohol_intake: false, exposures: false, others: false });
const defaultFamilyHistory = (): FamilyHistoryJSON => ({ hypertension: false, diabetes_mellitus: false, bronchial_asthma: false, cancer: false, others: false });

const pmLabels: Record<keyof PastMedicalJSON, string> = { hypertension: 'Hypertension', heart_disease: 'Heart Disease', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', tuberculosis: 'Tuberculosis', chronic_kidney_disease: 'Chronic Kidney Disease', thyroid_disease: 'Thyroid Disease', allergies: 'Allergies', surgeries: 'Surgeries', others: 'Others' };
const psLabels: Record<keyof PersonalSocialJSON, string> = { smoker: 'Smoker', alcohol_intake: 'Alcohol Intake', exposures: 'Exposures', others: 'Others', others_notes: '' };
const fhLabels: Record<keyof FamilyHistoryJSON, string> = { hypertension: 'Hypertension', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', cancer: 'Cancer', others: 'Others', others_notes: '' };

export default function AddPatientModal({ token, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'general' | 'history' | 'consent'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [consentSig, setConsentSig] = useState<string | null>(null);
  const [medicationFile, setMedicationFile] = useState<File | null>(null);
  const [general, setGeneral] = useState({ full_name: '', age: '', gender: '', date_of_birth: '', civil_status: '', address: '', contact_number: '', occupation: '', referred_by: '' });
  const [pastMedical, setPastMedical] = useState<PastMedicalJSON>(defaultPastMedical());
  const [maintenanceMedsText, setMaintenanceMedsText] = useState('');
  const [travelHistory, setTravelHistory] = useState('');
  const [personalSocial, setPersonalSocial] = useState<PersonalSocialJSON>(defaultPersonalSocial());
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryJSON>(defaultFamilyHistory());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);

  // Check for duplicates when name or contact changes
  const checkDuplicate = async (name: string, contact: string) => {
    if (!name.trim() || name.trim().length < 3) { setDuplicateWarning(null); return; }
    try {
      const patients = await api('/api/patients', {}, token);
      const nameLower = name.trim().toLowerCase();
      const match = patients.find((p: any) =>
        p.full_name.toLowerCase() === nameLower ||
        (contact.trim() && p.contact_number && p.contact_number.replace(/\D/g,'') === contact.replace(/\D/g,''))
      );
      if (match) {
        setDuplicateWarning(`A patient named "${match.full_name}" already exists${match.contact_number ? ` (${match.contact_number})` : ''}. Are you sure this is a different person?`);
      } else {
        setDuplicateWarning(null);
      }
    } catch { setDuplicateWarning(null); }
  };

  const handleSubmit = async () => {
    if (!general.full_name.trim()) { setError('Patient name is required'); setTab('general'); return; }
    if (duplicateWarning && !forceSubmit) {
      setError('Possible duplicate detected. Review the warning above, then click "Save Anyway" to proceed.');
      setTab('general');
      return;
    }
    setSaving(true); setError('');
    try {
      const patient = await api('/api/patients', { method: 'POST', body: JSON.stringify({ ...general, age: general.age ? parseInt(general.age) : null }) }, token);
      if (profileFile) {
        const fd = new FormData(); fd.append('photo', profileFile);
        await fetch(`/api/patients/${patient.id}/profile-photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      await api(`/api/patients/${patient.id}/medical-history`, { method: 'POST', body: JSON.stringify({ past_medical: pastMedical, maintenance_medications_text: maintenanceMedsText, travel_history: travelHistory, personal_social_history: personalSocial, family_history: familyHistory }) }, token);
      if (medicationFile) {
        const fd = new FormData(); fd.append('image', medicationFile);
        await fetch(`/api/patients/${patient.id}/medical-history/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      // All uploads done — now refresh the list so photo appears immediately
      await onSaved();
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = 'mt-1 w-full px-3 py-2.5 bg-white border border-zinc-200 text-zinc-900 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-sm placeholder:text-zinc-400';
  const labelCls = 'text-xs font-semibold text-zinc-500 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white border border-zinc-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl sm:max-h-[90vh] flex flex-col" style={{ maxHeight: '95dvh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900">New Patient</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-zinc-100">
          {(['general', 'history', 'consent'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-zinc-400 hover:text-zinc-700'}`}>
              {t === 'general' ? 'General Data' : t === 'history' ? 'Medical History' : 'Consent'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {tab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-emerald-400 transition-colors"
                  onClick={() => document.getElementById('profile-upload')?.click()}>
                  {profilePreview ? <img src={profilePreview} className="w-full h-full object-cover" alt="" /> : <Camera className="w-6 h-6 text-zinc-400" />}
                  <input id="profile-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setProfileFile(f); setProfilePreview(URL.createObjectURL(f)); } }} />
                </div>
                <div><p className="text-sm text-zinc-500 mt-2">Profile Photo <span className="text-zinc-400">(optional)</span></p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-1 sm:col-span-2"><label className={labelCls}>Patient Name *</label><input value={general.full_name} onChange={e => { setGeneral(g => ({ ...g, full_name: e.target.value })); setForceSubmit(false); checkDuplicate(e.target.value, general.contact_number); }} className={inputCls} placeholder="Full name" /></div>
                <div><label className={labelCls}>Age</label><input type="number" value={general.age} onChange={e => setGeneral(g => ({ ...g, age: e.target.value }))} className={inputCls} placeholder="Auto-fills from DOB" /></div>
                <div><label className={labelCls}>Gender</label>
                  <select value={general.gender} onChange={e => setGeneral(g => ({ ...g, gender: e.target.value }))} className={inputCls}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div><label className={labelCls}>Date of Birth</label><input type="date" value={general.date_of_birth} onChange={e => {
                  const dob = e.target.value;
                  const age = dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : '';
                  setGeneral(g => ({ ...g, date_of_birth: dob, age }));
                }} className={inputCls} /></div>
                <div><label className={labelCls}>Civil Status</label>
                  <select value={general.civil_status} onChange={e => setGeneral(g => ({ ...g, civil_status: e.target.value }))} className={inputCls}>
                    <option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Address</label><input value={general.address} onChange={e => setGeneral(g => ({ ...g, address: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Contact Number</label><input value={general.contact_number} onChange={e => setGeneral(g => ({ ...g, contact_number: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Occupation</label><input value={general.occupation} onChange={e => setGeneral(g => ({ ...g, occupation: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Referred By</label><input value={general.referred_by} onChange={e => setGeneral(g => ({ ...g, referred_by: e.target.value }))} className={inputCls} /></div>
            </div>
          )}

          {tab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-zinc-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Past Medical History</h3>
                <div className="space-y-2">
                  {(Object.keys(defaultPastMedical()) as (keyof PastMedicalJSON)[]).map(key => (
                    <div key={key}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button type="button" onClick={() => setPastMedical(p => ({ ...p, [key]: { ...p[key], checked: !p[key].checked } }))} className="text-zinc-400 hover:text-emerald-500 flex-shrink-0">
                          {pastMedical[key].checked ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-zinc-700">{pmLabels[key]}</span>
                      </label>
                      {pastMedical[key].checked && (
                        <input value={pastMedical[key].notes} onChange={e => setPastMedical(p => ({ ...p, [key]: { ...p[key], notes: e.target.value } }))}
                          className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded text-xs outline-none focus:border-emerald-400" placeholder="Notes..." />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-zinc-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Maintenance Medications</h3>
                  <textarea value={maintenanceMedsText} onChange={e => setMaintenanceMedsText(e.target.value)} rows={5}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl outline-none focus:border-emerald-500 text-sm resize-none" placeholder="List medications..." />
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-zinc-500 hover:text-emerald-600">
                    <Camera className="w-4 h-4" /><span>Attach image</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setMedicationFile(e.target.files?.[0] || null)} />
                  </label>
                  {medicationFile && <p className="text-xs text-emerald-600 mt-1">{medicationFile.name}</p>}
                </div>
                <div className="border border-zinc-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Travel History</h3>
                  <textarea value={travelHistory} onChange={e => setTravelHistory(e.target.value)} rows={3}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl outline-none focus:border-emerald-500 text-sm resize-none" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-zinc-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Personal / Social History</h3>
                  <div className="space-y-2">
                    {(['smoker', 'alcohol_intake', 'exposures', 'others'] as const).map(key => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <button type="button" onClick={() => setPersonalSocial(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-500">
                            {personalSocial[key] ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className="text-xs text-zinc-700">{psLabels[key]}</span>
                        </label>
                        {key === 'others' && personalSocial.others && (
                          <input
                            value={personalSocial.others_notes || ''}
                            onChange={e => setPersonalSocial(p => ({ ...p, others_notes: e.target.value }))}
                            placeholder="Please specify..."
                            className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded text-xs outline-none focus:border-emerald-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-zinc-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Family History</h3>
                  <div className="space-y-2">
                    {(['hypertension', 'diabetes_mellitus', 'bronchial_asthma', 'cancer', 'others'] as const).map(key => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <button type="button" onClick={() => setFamilyHistory(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-500">
                            {familyHistory[key] ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className="text-xs text-zinc-700">{fhLabels[key]}</span>
                        </label>
                        {key === 'others' && familyHistory.others && (
                          <input
                            value={familyHistory.others_notes || ''}
                            onChange={e => setFamilyHistory(p => ({ ...p, others_notes: e.target.value }))}
                            placeholder="Please specify..."
                            className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded text-xs outline-none focus:border-emerald-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'consent' && (
            <div className="space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-600 leading-relaxed">
                <h3 className="font-bold text-zinc-900 mb-2">Data Privacy Consent</h3>
                <p>By signing below, the patient consents to the collection, use, and storage of their personal and medical information by ABC Clinic for the purpose of providing healthcare services. This information will be kept confidential and will not be shared with third parties without explicit consent, except as required by law.</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-2">Patient / Guardian Signature</p>
                <ESignatureCanvas onConfirm={setConsentSig} onReset={() => setConsentSig(null)} />
                {consentSig
                  ? <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signature captured</p>
                  : <p className="text-xs text-zinc-400 mt-1">Signature is optional but recommended</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 space-y-3">
          {duplicateWarning && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
              <div className="flex-1">
                <p className="text-sm text-amber-700 font-medium">Possible Duplicate Patient</p>
                <p className="text-xs text-amber-600 mt-0.5">{duplicateWarning}</p>
              </div>
              <button onClick={() => setForceSubmit(true)} className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium flex-shrink-0">
                Save Anyway
              </button>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-zinc-800 font-medium transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Add Patient</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
