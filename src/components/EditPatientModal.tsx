import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Camera, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import type { Patient, PastMedicalJSON, PersonalSocialJSON, FamilyHistoryJSON, PatientMedicalHistory } from '../types/index';

interface Props {
  patient: Patient;
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

export default function EditPatientModal({ patient, token, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'general' | 'history'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(patient.profile_photo_path ? `/${patient.profile_photo_path}` : null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [medicationFile, setMedicationFile] = useState<File | null>(null);

  const [general, setGeneral] = useState({
    full_name: patient.full_name || '',
    age: patient.age?.toString() || '',
    gender: patient.gender || '',
    date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
    civil_status: patient.civil_status || '',
    address: patient.address || '',
    contact_number: patient.contact_number || '',
    occupation: patient.occupation || '',
    referred_by: patient.referred_by || '',
  });

  const [pastMedical, setPastMedical] = useState<PastMedicalJSON>(defaultPastMedical());
  const [maintenanceMedsText, setMaintenanceMedsText] = useState('');
  const [travelHistory, setTravelHistory] = useState('');
  const [personalSocial, setPersonalSocial] = useState<PersonalSocialJSON>(defaultPersonalSocial());
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryJSON>(defaultFamilyHistory());
  const [existingMedImage, setExistingMedImage] = useState<string | null>(null);

  // Load existing medical history
  useEffect(() => {
    api(`/api/patients/${patient.id}/medical-history`, {}, token)
      .then((mh: PatientMedicalHistory) => {
        if (!mh) return;
        if (mh.past_medical && Object.keys(mh.past_medical).length) setPastMedical(mh.past_medical);
        if (mh.maintenance_medications_text) setMaintenanceMedsText(mh.maintenance_medications_text);
        if (mh.travel_history) setTravelHistory(mh.travel_history);
        if (mh.personal_social_history && Object.keys(mh.personal_social_history).length) setPersonalSocial(mh.personal_social_history);
        if (mh.family_history && Object.keys(mh.family_history).length) setFamilyHistory(mh.family_history);
        if (mh.maintenance_medications_image_path) setExistingMedImage(`/${mh.maintenance_medications_image_path}`);
      })
      .catch(console.error);
  }, [patient.id, token]);

  const handleSubmit = async () => {
    if (!general.full_name.trim()) { setError('Patient name is required'); setTab('general'); return; }
    setSaving(true); setError('');
    try {
      await api(`/api/patients/${patient.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...general, age: general.age ? parseInt(general.age) : null })
      }, token);

      if (profileFile) {
        const fd = new FormData(); fd.append('photo', profileFile);
        await fetch(`/api/patients/${patient.id}/profile-photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }

      await api(`/api/patients/${patient.id}/medical-history`, {
        method: 'POST',
        body: JSON.stringify({ past_medical: pastMedical, maintenance_medications_text: maintenanceMedsText, travel_history: travelHistory, personal_social_history: personalSocial, family_history: familyHistory })
      }, token);

      if (medicationFile) {
        const fd = new FormData(); fd.append('image', medicationFile);
        await fetch(`/api/patients/${patient.id}/medical-history/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }

      // All uploads done — refresh list so photo appears immediately
      await onSaved();
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = 'mt-1 w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl outline-none focus:border-emerald-500 text-sm';
  const labelCls = 'text-xs font-semibold text-zinc-400 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Edit Patient — {patient.full_name}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-zinc-800">
          {(['general', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
              {t === 'general' ? 'General Data' : 'Medical History'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {tab === 'general' && (
            <div className="space-y-4">
              {/* Profile photo — larger in edit mode */}
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer relative"
                  onClick={() => document.getElementById('edit-profile-upload')?.click()}>
                  {profilePreview
                    ? <img src={profilePreview} className="w-full h-full object-cover" alt="" />
                    : <Camera className="w-8 h-8 text-zinc-500" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input id="edit-profile-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setProfileFile(f); setProfilePreview(URL.createObjectURL(f)); } }} />
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Profile Photo</p>
                  <p className="text-xs text-zinc-500 mt-1">Click to replace. JPEG or PNG only.</p>
                  {profileFile && <p className="text-xs text-emerald-400 mt-1">New photo selected: {profileFile.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelCls}>Patient Name *</label><input value={general.full_name} onChange={e => setGeneral(g => ({ ...g, full_name: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Age</label><input type="number" value={general.age} onChange={e => setGeneral(g => ({ ...g, age: e.target.value }))} className={inputCls} /></div>
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
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl outline-none focus:border-emerald-500 text-sm resize-none" />
                  {existingMedImage && !medicationFile && (
                    <div className="mt-2"><p className="text-xs text-zinc-500 mb-1">Current image:</p><img src={existingMedImage} alt="Medication" className="rounded-lg max-h-20 object-contain" /></div>
                  )}
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-emerald-400">
                    <Camera className="w-4 h-4" /><span>{existingMedImage ? 'Replace image' : 'Attach image'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setMedicationFile(e.target.files?.[0] || null)} />
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
                    {(['smoker', 'alcohol_intake', 'exposures', 'others'] as const).map(key => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <button type="button" onClick={() => setPersonalSocial(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-400">
                            {personalSocial[key] ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className="text-xs text-zinc-300">{psLabels[key]}</span>
                        </label>
                        {key === 'others' && personalSocial.others && (
                          <input
                            value={personalSocial.others_notes || ''}
                            onChange={e => setPersonalSocial(p => ({ ...p, others_notes: e.target.value }))}
                            placeholder="Please specify..."
                            className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-800 border border-zinc-600 text-white rounded text-xs outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Family History</h3>
                  <div className="space-y-2">
                    {(['hypertension', 'diabetes_mellitus', 'bronchial_asthma', 'cancer', 'others'] as const).map(key => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <button type="button" onClick={() => setFamilyHistory(p => ({ ...p, [key]: !p[key] }))} className="text-zinc-400 hover:text-emerald-400">
                            {familyHistory[key] ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className="text-xs text-zinc-300">{fhLabels[key]}</span>
                        </label>
                        {key === 'others' && familyHistory.others && (
                          <input
                            value={familyHistory.others_notes || ''}
                            onChange={e => setFamilyHistory(p => ({ ...p, others_notes: e.target.value }))}
                            placeholder="Please specify..."
                            className="mt-1 ml-6 w-[calc(100%-1.5rem)] px-2 py-1 bg-zinc-800 border border-zinc-600 text-white rounded text-xs outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
