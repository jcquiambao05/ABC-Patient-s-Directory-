/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Patient-related data types
 * Extracted from App.tsx for reusability
 */

export interface Patient {
  id: string;
  full_name: string;
  age: number | null;
  gender: string;
  date_of_birth: string;
  civil_status: string | null;
  address: string;
  contact_number: string | null;
  occupation: string | null;
  referred_by: string | null;
  profile_photo_path: string | null;
  privacy_consent_signature_path: string | null;
  privacy_consent_at: string | null;
  created_at: string;
  last_visit_date?: string | null;

  // Legacy fields (kept temporarily for existing modals/UI)
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface EMR {
  id: string;
  patient_id: string;
  visit_date: string;
  diagnosis: string;
  treatment_plan: string;
  notes: string;
  created_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  file_url: string;
  extracted_text: string;
  document_type: string;
  status: string;
  created_at: string;
}

export interface PatientDetails {
  emrs: EMR[];
  documents: Document[];
  medicalCharts: any[];
}
