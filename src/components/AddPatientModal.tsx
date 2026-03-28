import React, { useState } from 'react';
import { X, Plus, Loader2, AlertCircle, Camera, CheckCircle, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import ESignatureCanvas from './ESignatureCanvas';
import type { PastMedicalJSON, PersonalSocialJSON, FamilyHistoryJSON } from '../types/index';

interface Props {
  token: string;
  onClose: () => void;
  onSaved: () => void;
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
const psLabels: Record<keyof PersonalSocialJSON, string> = { smoker: 'Smoker', alcohol_intake: 'Alcohol Intake', exposures: 'Exposures', others: 'Others' };
const fhLabels: Record<keyof FamilyHistoryJSON, string> = { hypertension: 'Hypertension', diabetes_mellitus: 'Diabetes Mellitus', bronchial_asthma: 'Bronchial Asthma', cancer: 'Cancer', others: 'Others' };

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

  const handleSubmit = async () => {
    if (!general.full_name.trim()) { setError('Patient name is required'); setTab('general'); return; }
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
      onSaved(); onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = 'mt-1 w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl outline-none focus:border-emerald-500 text-sm';
  const labelCls = 'text-xs font-semibold text-zinc-400 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">New Patient</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-zinc-800">
          {(['general', 'history', 'consent'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
              {t === 'general' ? 'General Data' : t === 'history' ? 'Medical History' : 'Consent'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {tab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => document.getElementById('profile-upload')?.click()}>
                  {profilePreview ? <img src={profilePreview} className="w-full h-full object-cover" alt="" /> : <Camera className="w-6 h-6 text-zinc-500" />}
                  <input id="profile-upload" type="file" accept="image/jpeg,image/png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setProfileFile(f); setProfilePreview(URL.createObjectURL(f)); } }} />
                </div>
                <div><p className="text-sm text-zinc-400">Profile Photo <span className="text-zinc-600">(optional)</span></p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelCls}>Patient Name *</label><input value={general.full_name} onChange={e => setGeneral(g => ({ ...g, full_name: e.target.value }))} className={inputCls} placeholder="Full name" /></div>
                <div><label className={labelCls}>Age</label><input type="number" value={general.age} onChange={e => setGeneral(g => ({ ...g, age: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Gender</label>
                  <select value={general.gender} onChange={e => setGeneral(g => ({ ...g, gender: e.target.value }))} className={inputCls}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div><label className={labelCls}>Date of Birth</label><input type="date" value={general.date_of_birth} onChange={e => setGeneral(g => ({ ...g, date_of_birth: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Civil Status</label>
                  <select value={general.civil_status} onChange={e => setGeneral(g => ({ ...g, civil_status: e.target.value }))} className={inputCls}>
                    <option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Address</label><input value={general.address} onChange={e => setGeneral(g => ({ ...g, address: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Contact Number</label><input value={general.contact_number} onChange={e => setGeneral(g => ({ ...g, contact_number: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Occupation</label><input value={general.occupation} onChange={e => setGeneral(g => ({ ...g, occupation: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Referred By</label><input value={general.referred_by} onChange={e => setGeneral(g => ({ ...g, referred_by: e.target.value }))} className={inputCls} /></div>
            </div>
          )}

          {tab === 'history' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-zinc-700 rounded-xl p-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Past Medical History</h3>
                <div className="space-y-2">
                  {(Object.keys(defaultPastMedical()) as (keyof PastMedicalJSON)[]).map(key => (
                    <div key={key}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button type="button" onClick={() => setPastMedical(p => ({ ...p, [key]: { ...p[key], checked: !p[key].checked } }))} className="text-zinc-400 hover:text-emerald-400 flex-shrink-0">
                          {pastMedical[key].checked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-zinc-300">{pmLabels[key]}</span>
                      </label>
                      {pastMedical[key].checked && (
                        <input value={pastMedical[key].notes} onChange={e => setPastMedical(p => ({ ...p, [key]: { ...p[key], notes: e.target.value } }))}
                          className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded text-xs outline-none" placeholder="Notes..." />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Maintenance Medications</h3>
                  <textarea value={maintenanceMedsText} onChange={e => setMaintenanceMedsText(e.target.value)} rows={5}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl outline-none focus:border-emerald-500 text-sm resize-none" placeholder="List medications..." />
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-emerald-400">
                    <Camera className="w-4 h-4" /><span>Attach image</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => setMedicationFile(e.target.files?.[0] || null)} />
                  </label>
                  {medicationFile && <p className="text-xs text-emerald-400 mt-1">{medicationFile.name}</p>}
                </div>
                <div className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Travel History</h3>
                  <textarea value={travelHistory} onChange={e => setTravelHistory(e.target.value)} rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl outline-none focus:border-emerald-500 text-sm resize-none" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Personal / Social History</h3>
                  <div className="space-y-2">
                    {(Object.keys(defaultPersonalSocial()) as (keyof PersonalSocialJSON)[]).map(key => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <button type="button" onClick={() => setPersonalSocial(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-400">
                          {personalSocial[key] ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-zinc-300">{psLabels[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Family History</h3>
                  <div className="space-y-2">
                    {(Object.keys(defaultFamilyHistory()) as (keyof FamilyHistoryJSON)[]).map(key => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <button type="button" onClick={() => setFamilyHistory(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-400">
                          {familyHistory[key] ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-zinc-300">{fhLabels[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'consent' && (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                <h3 className="font-bold text-white mb-2">Data Privacy Consent</h3>
                <p>By signing below, the patient consents to the collection, use, and storage of their personal and medical information by ABC Clinic for the purpose of providing healthcare services. This information will be kept confidential and will not be shared with third parties without explicit consent, except as required by law.</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-2">Patient / Guardian Signature</p>
                <ESignatureCanvas onConfirm={setConsentSig} onReset={() => setConsentSig(null)} />
                {consentSig
                  ? <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signature captured</p>
                  : <p className="text-xs text-zinc-500 mt-1">Signature is optional but recommended</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Add Patient</>}
          </button>
        </div>
      </div>
    </div>
  );
}
