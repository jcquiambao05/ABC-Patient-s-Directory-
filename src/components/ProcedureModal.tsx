import React, { useState } from 'react';
import { X, ChevronRight, Loader2, CheckCircle, MessageSquare, Stethoscope, Pill, Plus, Syringe, Heart, Eye, Bone, Brain } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../hooks/useToast';
import ESignatureCanvas from './ESignatureCanvas';

interface Props {
  token: string;
  patientId: string;
  role: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type BuiltInType = 'counseling' | 'surgery' | 'immunization';

interface ProcedureTypeOption {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  border: string;
  isCustom?: boolean;
}

const builtInTypes: ProcedureTypeOption[] = [
  { id: 'counseling',   label: 'Counseling',   icon: MessageSquare, color: 'text-blue-400',    border: 'hover:border-blue-400' },
  { id: 'surgery',      label: 'Surgery',       icon: Stethoscope,   color: 'text-red-400',     border: 'hover:border-red-400' },
  { id: 'immunization', label: 'Immunization',  icon: Pill,          color: 'text-emerald-400', border: 'hover:border-emerald-400' },
];

const extraTypes: ProcedureTypeOption[] = [
  { id: 'injection',    label: 'Injection',     icon: Syringe,       color: 'text-violet-400',  border: 'hover:border-violet-400' },
  { id: 'checkup',      label: 'Check-up',      icon: Heart,         color: 'text-pink-400',    border: 'hover:border-pink-400' },
  { id: 'eye_exam',     label: 'Eye Exam',       icon: Eye,           color: 'text-cyan-400',    border: 'hover:border-cyan-400' },
  { id: 'xray',         label: 'X-Ray',          icon: Bone,          color: 'text-amber-400',   border: 'hover:border-amber-400' },
  { id: 'neuro',        label: 'Neuro Consult',  icon: Brain,         color: 'text-indigo-400',  border: 'hover:border-indigo-400' },
];

export default function ProcedureModal({ token, patientId, role, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'select' | 'consent' | 'sign'>('select');
  const [procedureType, setProcedureType] = useState<string | null>(null);
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [description, setDescription] = useState('');
  const [consentNotes, setConsentNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The display label for the selected type
  const getDisplayLabel = () => {
    if (procedureType === 'custom') return customTypeLabel || 'Custom Procedure';
    const all = [...builtInTypes, ...extraTypes];
    return all.find(t => t.id === procedureType)?.label || procedureType || '';
  };

  const handleSelectType = (id: string) => {
    setProcedureType(id);
    setStep('consent');
  };

  const handleCustomSubmit = () => {
    if (!customTypeLabel.trim()) return;
    setProcedureType('custom');
    setStep('consent');
  };

  const handleSubmit = async () => {
    if (!procedureType || !signature) return;
    setSaving(true);
    try {
      await api('/api/procedures', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          procedure_type: procedureType,
          custom_type: procedureType === 'custom' ? customTypeLabel.trim() : undefined,
          description: description.trim() || undefined,
          consent_form_data: { notes: consentNotes },
          signature_data_url: signature,
        }),
      }, token);
      onSaved();
      toast.success('Procedure logged successfully.');
      onClose();
    } catch (err) { toast.error(`Failed to save procedure: ${(err as Error).message}`); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm outline-none focus:border-emerald-500 resize-none placeholder:text-zinc-500';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Patient Procedure</h2>
            {procedureType && step !== 'select' && (
              <p className="text-xs text-zinc-400 mt-0.5 capitalize">{getDisplayLabel()}</p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Step 1: Select procedure type ── */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 mb-2">Select the procedure type:</p>

              {/* Built-in types */}
              {builtInTypes.map(pt => (
                <button key={pt.id} onClick={() => handleSelectType(pt.id)}
                  className={`w-full flex items-center gap-4 p-4 border border-zinc-700 ${pt.border} rounded-xl transition-colors text-left`}>
                  <pt.icon className={`w-6 h-6 ${pt.color}`} />
                  <span className="font-medium text-white">{pt.label}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
                </button>
              ))}

              {/* More types toggle */}
              <button onClick={() => setShowExtra(e => !e)}
                className="w-full flex items-center gap-2 px-4 py-2.5 border border-dashed border-zinc-600 hover:border-zinc-400 rounded-xl text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                <Plus className="w-4 h-4" />
                {showExtra ? 'Show less' : 'More procedure types'}
              </button>

              {showExtra && (
                <div className="space-y-2">
                  {extraTypes.map(pt => (
                    <button key={pt.id} onClick={() => handleSelectType(pt.id)}
                      className={`w-full flex items-center gap-4 p-3.5 border border-zinc-700 ${pt.border} rounded-xl transition-colors text-left`}>
                      <pt.icon className={`w-5 h-5 ${pt.color}`} />
                      <span className="font-medium text-white text-sm">{pt.label}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* Custom type — doctor only */}
              {(role === 'admin' || role === 'superadmin') && (
                <div className="border border-dashed border-zinc-600 rounded-xl p-4">
                  <button onClick={() => setShowCustomInput(e => !e)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors w-full">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Add custom procedure type</span>
                  </button>
                  {showCustomInput && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={customTypeLabel}
                        onChange={e => setCustomTypeLabel(e.target.value)}
                        placeholder="e.g. Wound Dressing, ECG, Ultrasound..."
                        className={inputCls}
                        onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                        autoFocus
                      />
                      <button
                        onClick={handleCustomSubmit}
                        disabled={!customTypeLabel.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Details + Consent ── */}
          {step === 'consent' && procedureType && (
            <div className="space-y-4">
              {/* Procedure description */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Procedure Description <span className="text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder={`Describe what this ${getDisplayLabel().toLowerCase()} involves...`}
                  className={inputCls}
                />
              </div>

              {/* Consent text */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                <h3 className="font-bold text-white mb-2 capitalize">{getDisplayLabel()} — Informed Consent</h3>
                <p>I hereby give my informed consent to undergo the <strong className="text-white">{getDisplayLabel()}</strong> procedure. I have been fully informed of the nature, risks, benefits, and alternatives of this procedure and voluntarily agree to proceed.</p>
                {procedureType === 'immunization' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="font-semibold text-white mb-1">Immunization Consent</p>
                    <p>I consent to the administration of the recommended vaccine(s) and acknowledge that I have been informed of potential side effects and contraindications.</p>
                  </div>
                )}
                {procedureType === 'surgery' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="font-semibold text-white mb-1">Surgical Consent</p>
                    <p>I understand that surgery involves inherent risks including anesthesia complications, infection, and unexpected outcomes. I consent to the procedure and any necessary modifications during surgery.</p>
                  </div>
                )}
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                  Additional Notes <span className="text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={consentNotes}
                  onChange={e => setConsentNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes or special conditions..."
                  className={inputCls}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('select')}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors">
                  Back
                </button>
                <button onClick={() => setStep('sign')}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors">
                  Proceed to Signature
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: E-signature ── */}
          {step === 'sign' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Patient / Guardian Signature</p>
                <button onClick={() => setStep('consent')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back</button>
              </div>
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
