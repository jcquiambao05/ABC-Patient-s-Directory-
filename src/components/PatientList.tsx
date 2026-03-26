import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Patient } from '../types/index';
import PatientCard from './PatientCard';

function getCabinetLetter(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const lastWord = parts.length > 0 ? parts[parts.length - 1] : '';
  const ch = lastWord[0] || fullName.trim()[0] || '?';
  return ch.toUpperCase();
}

export default function PatientList({
  patients,
  selectedPatientId,
  onSelectPatient,
  headerActions,
}: {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  headerActions?: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || '').toLowerCase().includes(q));
  }, [patients, searchQuery]);

  const groupedPatients = useMemo(() => {
    const map: Record<string, Patient[]> = {};
    for (const p of filteredPatients) {
      const cabinet = getCabinetLetter(p.full_name || '');
      map[cabinet] ??= [];
      map[cabinet].push(p);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }
    return map;
  }, [filteredPatients]);

  const cabinets = useMemo(() => Object.keys(groupedPatients).sort(), [groupedPatients]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <header className="p-6 border-b border-zinc-100 bg-white sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patient Archives</h1>
            <p className="text-sm text-zinc-500">Organized by Cabinets A-Z</p>
          </div>
          {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
        </div>
      </header>

      <div className="px-6 py-4 bg-white border-b border-zinc-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-4">
        {cabinets.length > 0 ? (
          cabinets.map((cabinet) => (
            <div key={cabinet} className="mb-6">
              <div className="sticky top-0 bg-white/80 backdrop-blur-sm px-4 py-2 border-y border-zinc-200 flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-500 text-white rounded flex items-center justify-center text-xs font-bold">
                  {cabinet}
                </div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cabinet {cabinet}</span>
              </div>

              <div className="space-y-3 mt-3">
                {groupedPatients[cabinet].map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    selected={selectedPatientId === patient.id}
                    onSelect={onSelectPatient}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-zinc-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No patients found in archives.</p>
          </div>
        )}
      </div>
    </div>
  );
}

