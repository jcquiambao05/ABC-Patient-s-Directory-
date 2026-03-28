/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Medical chart and consultation record types
 * Extracted from App.tsx for reusability
 */

export interface MedicalChart {
  id: string;
  patient_id: string;
  visit_date: string;
  document_type: string;
  diagnosis: string;
  treatment_plan: string;
  notes: string;
  custom_fields: any;
  metadata: any;
  confidence_score: number;
  reviewed: boolean;
  reviewer_notes: string;
  raw_ocr_text: string;
  created_at: string;
  updated_at: string;
}

export interface OCRTemplate {
  id: string;
  name: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
}

export interface ConsultationRecord extends MedicalChart {}
