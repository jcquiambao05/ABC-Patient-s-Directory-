/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Data normalization utilities
 * Extracted from App.tsx
 */

import { Patient } from '../types/patients';

/**
 * Normalize patient data from backend response
 * Converts new schema fields to legacy UI format
 * 
 * Compatibility: After clinic overhaul, backend returns `full_name`
 * and `consultation_records` instead of legacy `first_name/last_name`
 * and medical-chart endpoints. The UI expects legacy fields, so we
 * normalize server responses into the legacy shape.
 */
export function normalizePatient(p: any): Patient {
  const fullName =
    (typeof p?.full_name === 'string' ? p.full_name : null) ||
    [p?.first_name, p?.last_name].filter((x: any) => typeof x === 'string' && x.trim()).join(' ');

  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts.slice(1).join(' ') : '';

  const lastVisit = p?.last_visit_date ?? null;

  const contactNumber =
    p?.contact_number != null
      ? String(p.contact_number)
      : p?.phone != null
        ? String(p.phone)
        : null;

  const age =
    typeof p?.age === 'number'
      ? p.age
      : p?.age != null
        ? Number(p.age)
        : null;

  return {
    id: String(p?.id ?? ''),
    full_name: String(fullName || '').trim(),
    age: typeof age === 'number' && !Number.isNaN(age) ? age : null,
    gender: p?.gender != null ? String(p.gender) : '',
    first_name: first,
    last_name: last,
    date_of_birth: p?.date_of_birth ? String(p.date_of_birth) : '',
    civil_status: p?.civil_status != null ? String(p.civil_status) : null,
    address: p?.address != null ? String(p.address) : '',
    contact_number: contactNumber,
    occupation: p?.occupation != null ? String(p.occupation) : null,
    referred_by: p?.referred_by != null ? String(p.referred_by) : null,
    profile_photo_path: p?.profile_photo_path != null ? String(p.profile_photo_path) : null,
    privacy_consent_signature_path:
      p?.privacy_consent_signature_path != null ? String(p.privacy_consent_signature_path) : null,
    privacy_consent_at: p?.privacy_consent_at != null ? String(p.privacy_consent_at) : null,
    created_at: p?.created_at ? String(p.created_at) : '',
    last_visit_date: lastVisit ? String(lastVisit) : null,

    // Legacy
    phone: contactNumber ?? '',
    email: p?.email ? String(p.email) : '',
  };
}
