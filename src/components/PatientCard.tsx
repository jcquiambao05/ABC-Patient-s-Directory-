import React from 'react';
import { Calendar, Phone } from 'lucide-react';
import type { Patient } from '../types/index';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatLastVisit(lastVisitDate?: string | null): string {
  if (!lastVisitDate) return 'No visits yet';
  const d = new Date(lastVisitDate);
  if (Number.isNaN(d.getTime())) return 'No visits yet';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toUploadUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  return `/${cleaned}`;
}

export default function PatientCard({
  patient,
  selected,
  onSelect,
}: {
  patient: Patient;
  selected: boolean;
  onSelect: (patientId: string) => void;
}) {
  const initials = getInitials(patient.full_name || '');
  const lastVisitLabel = formatLastVisit(patient.last_visit_date ?? null);
  const avatarUrl = patient.profile_photo_path ? toUploadUrl(patient.profile_photo_path) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(patient.id)}
      className={`w-full text-left p-5 transition-all group flex items-start gap-4 rounded-2xl ${
        selected ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-200' : 'bg-white hover:bg-zinc-50'
      }`}
    >
      <div className="relative">
        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`${patient.full_name} profile`} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-zinc-700 text-xl">{initials}</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 mb-1">
          <h3 className="font-bold text-zinc-900 text-lg truncate">{patient.full_name}</h3>
          <span className="text-[10px] font-bold text-zinc-400 border border-zinc-200 px-2 py-0.5 rounded uppercase tracking-tighter shrink-0">
            ID: {patient.id.slice(0, 4)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-zinc-600 col-span-2">
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate">{patient.contact_number || 'No phone'}</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-600 col-span-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate">{lastVisitLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {/* Small affordance; actual interaction is the whole card */}
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            selected ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
          }`}
        >
          <span className={`font-bold text-sm ${selected ? 'text-emerald-600' : 'text-zinc-500'}`}>›</span>
        </span>
      </div>
    </button>
  );
}

