import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface ExtractedData {
  patient_name: string | null;
  age: number | null;
  gender: string | null;
  date_of_birth: string | null;
  civil_status: string | null;
  address: string | null;
  contact_number: string | null;
  occupation: string | null;
  referred_by: string | null;
  diagnosis: string | null;
  visit_date: string | null;
  chief_complaint: string | null;
}

interface Props {
  token: string;
  onClose: () => void;
  onSaved: (patientId: string) => void;
}

export default function AIUploadPreviewModal({ token, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'preview' | 'saving'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ExtractedData>({
    patient_name: null, age: null, gender: null, date_of_birth: null,
    civil_status: null, address: null, contact_number: null,
    occupation: null, referred_by: null, diagnosis: null,
    visit_date: null, chief_complaint: null,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setStep('extracting');

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      setImagePreview(imageData);
      try {
        const result = await api('/api/patients/ai-extract', {
          method: 'POST',
          body: JSON.stringify({ imageData }),
        }, token);
        if (result.success && result.extracted_data) {
          setExtracted(result.extracted_data);
          setForm(result.extracted_data);
          setStep('preview');
        } else {
          setError(result.error || 'Extraction failed');
          setStep('upload');
        }
      } catch (err) {
        setError((err as Error).message);
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.patient_name?.trim()) {
      setError('Patient name is required before saving.');
      return;
    }
    setStep('saving');
    setError('');
    try {
      // Create patient with extracted data
      const fd = new FormData();
      fd.append('full_name', form.patient_name || 'Unknown Patient');
      if (form.age) fd.append('age', String(form.age));
      if (form.gender) fd.append('gender', form.gender);
      if (form.date_of_birth) fd.append('date_of_birth', form.date_of_birth);
      if (form.civil_status) fd.append('civil_status', form.civil_status);
      if (form.address) fd.append('address', form.address);
      if (form.contact_number) fd.append('contact_number', form.contact_number);
      if (form.occupation) fd.append('occupation', form.occupation);
      if (form.referred_by) fd.append('referred_by', form.referred_by);

      const pRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!pRes.ok) { const e = await pRes.json(); throw new Error(e.error); }
      const patient = await pRes.json();

      // If diagnosis extracted, create a consultation record
      if (form.diagnosis || form.chief_complaint) {
        await api('/api/consultation-records', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patient.id,
            date: form.visit_date || new Date().toISOString().split('T')[0],
            subjective_clinical_findings: form.chief_complaint || null,
            assessment_plan: form.diagnosis || null,
          }),
        }, token);
      }

      onSaved(patient.id);
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    }
  };

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof ExtractedData; type?: string }) => {
    const val = form[field];
    const isEmpty = val === null || val === '';
    return (
      <div>
        <label className="text-xs text-zinc-500 mb-0.5 block">
          {label}
          {isEmpty && <span className="ml-1 text-amber-500 text-[10px]">⚠ not found</span>}
        </label>
        <input
          type={type}
          value={val ?? ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value || null }))}
          className={`w-full px-3 py-1.5 rounded-lg text-sm outline-none border ${
            isEmpty ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-zinc-50'
          } focus:border-emerald-400`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">AI Chart Upload</h2>
            <p className="text-xs text-zinc-500">
              {step === 'upload' && 'Select a chart image to extract patient data'}
              {step === 'extracting' && 'Reading chart with AI vision...'}
              {step === 'preview' && 'Review extracted data before saving'}
              {step === 'saving' && 'Saving patient record...'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="text-center py-8">
              <label className="cursor-pointer inline-flex flex-col items-center gap-3 px-8 py-6 border-2 border-dashed border-zinc-300 hover:border-emerald-400 rounded-2xl transition-colors">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-700">Click to select chart image</p>
                  <p className="text-xs text-zinc-400 mt-1">JPEG, PNG — photo or scan of physical chart</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleFileSelect} />
              </label>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Extracting step */}
          {step === 'extracting' && (
            <div className="text-center py-12">
              {imagePreview && (
                <img src={imagePreview} alt="Chart" className="max-h-40 mx-auto rounded-xl mb-6 object-contain border border-zinc-200" />
              )}
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
              <p className="text-zinc-600 font-medium">AI is reading the chart...</p>
              <p className="text-zinc-400 text-sm mt-1">This may take 15–30 seconds</p>
            </div>
          )}

          {/* Preview step */}
          {(step === 'preview' || step === 'saving') && (
            <div className="space-y-4">
              {imagePreview && (
                <img src={imagePreview} alt="Chart" className="max-h-32 rounded-xl object-contain border border-zinc-200" />
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <p className="text-xs text-zinc-500">Fields marked ⚠ were not found — fill them in manually.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Patient Name *" field="patient_name" />
                <Field label="Age" field="age" type="number" />
                <Field label="Gender" field="gender" />
                <Field label="Date of Birth" field="date_of_birth" type="date" />
                <Field label="Civil Status" field="civil_status" />
                <Field label="Contact Number" field="contact_number" />
                <Field label="Occupation" field="occupation" />
                <Field label="Referred By" field="referred_by" />
              </div>
              <Field label="Address" field="address" />
              <Field label="Chief Complaint" field="chief_complaint" />
              <Field label="Diagnosis / Assessment" field="diagnosis" />
              <Field label="Visit Date" field="visit_date" type="date" />
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'saving') && (
          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={step === 'saving'}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {step === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Confirm & Save</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
