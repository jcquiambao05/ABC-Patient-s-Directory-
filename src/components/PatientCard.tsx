import React from 'react';
import { Phone, Clock } from 'lucide-react';
import type { Patient } from '../types/index';

interface Props {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
}

export default function PatientCard({ patient, isSelected, onClick }: Props) {
  const initials = patient.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <button onClick={onClick}
      className={`w-full text-left p-5 transition-all flex items-start gap-4 ${
        isSelected ? 'bg-emerald-50/5 ring-1 ring-inset ring-emerald-800' : 'bg-white hover:bg-zinc-50'
      }`}>
      <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-zinc-600 font-bold text-xl shadow-sm overflow-hidden bg-zinc-200">
        {patient.profile_photo_path
          ? <img src={`/${patient.profile_photo_path}`} alt="" className="w-full h-full object-cover" />
          : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-base text-zinc-900 truncate">{patient.full_name}</h3>
          <span className="text-xs font-bold text-zinc-400 border border-zinc-200 px-2 py-1 rounded uppercase ml-2 flex-shrink-0">
            {patient.id.slice(0, 4)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-base text-zinc-500">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="truncate">{patient.contact_number || 'No phone'}</span>
          </div>
          {patient.date_of_birth && (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-zinc-300">·</span>
              <span>{new Date(patient.date_of_birth).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{patient.last_visit_date ? new Date(patient.last_visit_date).toLocaleDateString() : 'No visits yet'}</span>
        </div>
      </div>
    </button>
  );
}
