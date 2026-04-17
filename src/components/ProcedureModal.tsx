import React, { useState } from 'react';
import { X, ChevronRight, Loader2, CheckCircle, MessageSquare, Stethoscope, Pill } from 'lucide-react';
import { api } from '../lib/api';
import ESignatureCanvas from './ESignatureCanvas';

interface Props {
  token: string;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

type ProcedureType = 'counseling' | 'surgery' | 'immunization';

const procedureTypes = [
  { id: 'counseling' as ProcedureType, label: 'Counseling', icon: MessageSquare, color: 'text-blue-400', border: 'hover:border-blue-400' },
  { id: 'surgery' as ProcedureType, label: 'Surgery', icon: Stethoscope, color: 'text-red-400', border: 'hover:border-red-400' },
  { id: 'immunization' as ProcedureType, label: 'Immunization', icon: Pill, color: 'text-emerald-400', border: 'hover:border-emerald-400' },
];

export default function ProcedureModal({ token, patientId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'select' | 'consent' | 'sign'>('select');
  const [procedureType, setProcedureType] = useState<ProcedureType | null>(null);
  const [consentNotes, setConsentNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!procedureType || !signature) return;
    setSaving(true);
    try {
      await api('/api/procedures', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          procedure_type: procedureType,
          consent_form_data: { notes: consentNotes },
          signature_data_url: signature,
        })
      }, token);
      onSaved();
      onClose();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Patient Procedure</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          {/* Step 1: Select procedure type */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 mb-4">Select the procedure type:</p>
              {procedureTypes.map(pt => (
                <button key={pt.id} onClick={() => { setProcedureType(pt.id); setStep('consent'); }}
                  className={`w-full flex items-center gap-4 p-4 border border-zinc-700 ${pt.border} rounded-xl transition-colors text-left`}>
                  <pt.icon className={`w-6 h-6 ${pt.color}`} />
                  <span className="font-medium text-white">{pt.label}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Consent form */}
          {step === 'consent' && procedureType && (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                <h3 className="font-bold text-white mb-2 capitalize">{procedureType} — Informed Consent</h3>
                <p>I hereby give my informed consent to undergo the {procedureType} procedure. I have been fully informed of the nature, risks, benefits, and alternatives of this procedure and voluntarily agree to proceed.</p>
                {procedureType === 'immunization' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="font-semibold text-white mb-1">Immunization Consent</p>
                    <p>I consent to the administration of the recommended vaccine(s) and acknowledge that I have been informed of potential side effects and contraindications.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-400">Additional notes (optional)</label>
                <textarea value={consentNotes} onChange={e => setConsentNotes(e.target.value)} rows={2}
                  className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 resize-none" />
              </div>
              <button onClick={() => setStep('sign')}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors">
                Proceed to Signature
              </button>
            </div>
          )}

          {/* Step 3: E-signature */}
          {step === 'sign' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">Patient / Guardian Signature</p>
              <ESignatureCanvas onConfirm={setSignature} onReset={() => setSignature(null)} />
              {signature && (
                <button onClick={handleSubmit} disabled={saving}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle className="w-4 h-4" />Confirm & Save</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
