/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Queue management types
 * NEW: From design.md clinic overhaul
 */

export interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  position: number;
  status: 'waiting' | 'in_consultation' | 'done';
  remarks: string | null;
  queued_date: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface QueueState {
  entries: QueueEntry[];
  isLoading: boolean;
  error: string | null;
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
