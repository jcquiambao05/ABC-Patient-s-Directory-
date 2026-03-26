export interface Patient {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  date_of_birth: string | null;
  civil_status: string | null;
  address: string | null;
  contact_number: string | null;
  occupation: string | null;
  referred_by: string | null;
  profile_photo_path: string | null;
  privacy_consent_signature_path: string | null;
  privacy_consent_at: string | null;
  created_at: string;
  last_visit_date?: string | null;
}

export interface PastMedicalJSON {
  hypertension: { checked: boolean; notes: string };
  heart_disease: { checked: boolean; notes: string };
  diabetes_mellitus: { checked: boolean; notes: string };
  bronchial_asthma: { checked: boolean; notes: string };
  tuberculosis: { checked: boolean; notes: string };
  chronic_kidney_disease: { checked: boolean; notes: string };
  thyroid_disease: { checked: boolean; notes: string };
  allergies: { checked: boolean; notes: string };
  surgeries: { checked: boolean; notes: string };
  others: { checked: boolean; notes: string };
}

export interface PersonalSocialJSON {
  smoker: boolean;
  alcohol_intake: boolean;
  exposures: boolean;
  others: boolean;
}

export interface FamilyHistoryJSON {
  hypertension: boolean;
  diabetes_mellitus: boolean;
  bronchial_asthma: boolean;
  cancer: boolean;
  others: boolean;
}

export interface PatientMedicalHistory {
  id: string;
  patient_id: string;
  past_medical: PastMedicalJSON;
  maintenance_medications_text: string | null;
  maintenance_medications_image_path: string | null;
  travel_history: string | null;
  personal_social_history: PersonalSocialJSON;
  family_history: FamilyHistoryJSON;
}

export interface ConsultationRecord {
  id: string;
  patient_id: string;
  date: string;
  subjective_clinical_findings: string | null;
  assessment_plan: string | null;
  reviewed: boolean;
  marked_at: string | null;
  reviewer_notes: string | null;
  raw_ocr_text: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  profile_photo_path: string | null;
  position: number;
  status: 'waiting' | 'in_consultation' | 'done';
  remarks: string | null;
  queued_date: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface Procedure {
  id: string;
  patient_id: string;
  procedure_type: 'counseling' | 'surgery' | 'immunization';
  consent_form_data: Record<string, unknown>;
  signature_path: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  type: 'typed' | 'photo';
  medication_name: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface ChartImage {
  id: string;
  patient_id: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  performed_by: string;
  created_at: string;
}
