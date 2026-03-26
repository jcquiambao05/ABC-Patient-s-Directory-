import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileImage, Image as ImageIcon, Loader2, Phone, User, Mail, MapPin, Users } from 'lucide-react';
import type { ChartImage, ConsultationRecord, Patient, PatientMedicalHistory } from '../types/index';

type PatientDetailResponse = Patient & {
  medical_history: PatientMedicalHistory | null;
  consultation_records: ConsultationRecord[];
  chart_images: ChartImage[];
};

function toUploadUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  return `/${cleaned}`;
}

function formatISODate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatLastVisit(lastVisit?: string | null): string {
  if (!lastVisit) return 'No visits yet';
  const d = new Date(lastVisit);
  if (Number.isNaN(d.getTime())) return 'No visits yet';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DetailPanel({
  patientId,
  authToken,
  onClose,
}: {
  patientId: string | null;
  authToken: string | null;
  onClose?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'general' | 'consultations' | 'charts'>('general');
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUploadingChart, setIsUploadingChart] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId || !authToken) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Failed to load patient (${res.status})`);
        }
        return (await res.json()) as PatientDetailResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message || 'Failed to load patient');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, authToken]);

  useEffect(() => {
    setActiveTab('general');
  }, [patientId]);

  const profileInitials = useMemo(() => {
    const fullName = data?.full_name || '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [data?.full_name]);

  const chartImagesSorted = useMemo(() => {
    const arr = data?.chart_images ?? [];
    return [...arr].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }, [data?.chart_images]);

  const consultationsSorted = useMemo(() => {
    const arr = data?.consultation_records ?? [];
    return [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data?.consultation_records]);

  async function handleChartUpload(file: File) {
    if (!patientId || !authToken) return;
    setIsUploadingChart(true);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/chart-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Upload failed (${res.status})`);
      }

      // Refresh the panel so the uploaded image appears.
      const refreshed = await fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!refreshed.ok) return;
      setData((await refreshed.json()) as PatientDetailResponse);
    } catch (e) {
      setUploadError((e as Error).message || 'Chart upload failed');
    } finally {
      setIsUploadingChart(false);
    }
  }

  if (!patientId) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-50 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
          <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
            <Users className="w-12 h-12 text-zinc-200" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900">Select a patient</h3>
          <p>Choose a patient from the directory to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 overflow-y-auto border-l border-zinc-200">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/20">
              {data?.profile_photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toUploadUrl(data.profile_photo_path)}
                  alt={`${data.full_name} profile`}
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <span>{profileInitials}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                {data?.full_name || 'Loading...'}
              </h2>
              <div className="flex flex-wrap gap-3 mt-2 text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatISODate(data?.date_of_birth)}
                </span>
                <span className="flex items-center gap-1.5 capitalize">
                  <User className="w-4 h-4" />
                  {data?.gender || '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatLastVisit(data?.last_visit_date ?? null)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                aria-label="Close details"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-2 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === 'general' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consultations')}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === 'consultations' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Consultation Records
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === 'charts' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Chart Images
          </button>
        </div>

        {isLoading && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-zinc-700 font-medium">Loading patient details...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
            <p className="font-semibold">Failed to load patient</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!isLoading && !error && data && activeTab === 'general' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Phone</p>
                <p className="flex items-center gap-2 font-medium">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  {data.contact_number || '—'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Email</p>
                <p className="flex items-center gap-2 font-medium">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  {'—'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Address</p>
                <p className="flex items-center gap-2 font-medium truncate">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {data.address || '—'}
                </p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-zinc-900">Patient Overview</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Civil Status</p>
                  <p className="font-medium text-zinc-800">{data.civil_status || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Occupation</p>
                  <p className="font-medium text-zinc-800">{data.occupation || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Referred By</p>
                  <p className="font-medium text-zinc-800">{data.referred_by || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && data && activeTab === 'consultations' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900">
              <FileImage className="w-5 h-5 text-emerald-500" />
              Consultation Records
            </h3>

            {consultationsSorted.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-8 text-center">
                <p className="text-zinc-600 font-medium">No consultation records yet.</p>
              </div>
            ) : (
              consultationsSorted.map((cr) => (
                <div key={cr.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Date
                      </p>
                      <p className="font-bold text-zinc-900">{formatISODate(cr.date)}</p>
                    </div>
                    <div>
                      {cr.reviewed ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md uppercase">
                          Reviewed
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md uppercase">
                          Needs Review
                        </span>
                      )}
                    </div>
                  </div>

                  {cr.subjective_clinical_findings && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Findings</p>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap">{cr.subjective_clinical_findings}</p>
                    </div>
                  )}

                  {cr.assessment_plan && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assessment / Plan</p>
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap">{cr.assessment_plan}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!isLoading && !error && data && activeTab === 'charts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                Chart Images
              </h3>

              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  disabled={isUploadingChart}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleChartUpload(f);
                    // Allow selecting same file again.
                    e.currentTarget.value = '';
                  }}
                />
                {isUploadingChart ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Chart'}
              </label>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm">
                {uploadError}
              </div>
            )}

            {chartImagesSorted.length === 0 ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-8 text-center">
                <p className="text-zinc-600 font-medium">No chart images uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {chartImagesSorted.map((img) => {
                  const url = toUploadUrl(img.file_path);
                  const isImage = (img.file_type || '').startsWith('image/');

                  return (
                    <div key={img.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-zinc-50 p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">
                            {img.file_type || 'file'}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Uploaded {formatISODate(img.uploaded_at)}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md uppercase shrink-0">
                          {isImage ? 'Image' : 'PDF'}
                        </span>
                      </div>

                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="Chart preview" className="w-full h-48 object-cover bg-zinc-100" />
                      ) : (
                        <div className="w-full h-48 bg-zinc-100 flex items-center justify-center">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-semibold hover:underline"
                          >
                            Open document
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

