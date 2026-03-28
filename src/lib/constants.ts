/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global constants and configuration
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  
  // Patients
  PATIENTS_LIST: '/api/patients',
  PATIENTS_GET: (id: string) => `/api/patients/${id}`,
  PATIENTS_CREATE: '/api/patients',
  PATIENTS_UPDATE: (id: string) => `/api/patients/${id}`,
  PATIENTS_DELETE: (id: string) => `/api/patients/${id}`,
  PATIENTS_AI_CREATE: '/api/patients/ai-create',
  PATIENTS_AI_EXTRACT: '/api/patients/ai-extract',
  
  // Medical History
  MEDICAL_HISTORY_GET: (patientId: string) => `/api/patients/${patientId}/medical-history`,
  MEDICAL_HISTORY_UPDATE: (patientId: string) => `/api/patients/${patientId}/medical-history`,
  
  // Consultation Records
  CONSULTATION_RECORDS_LIST: (patientId: string) => `/api/patients/${patientId}/consultation-records`,
  CONSULTATION_RECORDS_CREATE: '/api/consultation-records',
  CONSULTATION_RECORDS_SAVE: (id: string) => `/api/consultation-records/${id}/save`,
  CONSULTATION_RECORDS_MARK: (id: string) => `/api/consultation-records/${id}/mark`,
  CONSULTATION_RECORDS_DELETE: (id: string) => `/api/consultation-records/${id}`,
  
  // Queue
  QUEUE_LIST: '/api/queue',
  QUEUE_ADD: '/api/queue',
  QUEUE_REORDER: '/api/queue/reorder',
  QUEUE_UPDATE_STATUS: (id: string) => `/api/queue/${id}/status`,
  QUEUE_DONE: (id: string) => `/api/queue/${id}/done`,
  QUEUE_RESET: '/api/queue/reset',
  QUEUE_ARCHIVE: '/api/queue/archive',
  
  // Prescriptions
  PRESCRIPTIONS_LIST: (patientId: string) => `/api/prescriptions/${patientId}`,
  PRESCRIPTIONS_CREATE: '/api/prescriptions',
  PRESCRIPTIONS_DELETE: (id: string) => `/api/prescriptions/${id}`,
  
  // Procedures
  PROCEDURES_LIST: (patientId: string) => `/api/procedures/${patientId}`,
  PROCEDURES_CREATE: '/api/procedures',
  
  // Chat
  CHAT_SEND: '/api/chat',
  
  // OCR Templates
  OCR_TEMPLATES: '/api/ocr/templates',
  
  // Documents
  PROCESS_DOCUMENT: '/api/process-document',
};

/**
 * HTTP Headers
 */
export const HEADERS = {
  CONTENT_TYPE_JSON: { 'Content-Type': 'application/json' },
  ACCEPT_JSON: { 'Accept': 'application/json' },
};

/**
 * Animation Durations (ms)
 */
export const ANIMATION = {
  MODAL_OPEN_CLOSE: 300,
  PANEL_EXPAND_COLLAPSE: 350,
  FADE_IN_OUT: 200,
};

/**
 * File Upload Limits
 */
export const FILE_LIMITS = {
  PROFILE_PHOTO_SIZE_MB: 10,
  CHART_IMAGE_SIZE_MB: 20,
  MEDICATION_IMAGE_SIZE_MB: 10,
  PRESCRIPTION_IMAGE_SIZE_MB: 10,
  SIGNATURE_SIZE_MB: 5,
};

/**
 * Accepted File Types
 */
export const ACCEPTED_FILE_TYPES = {
  IMAGES: 'image/*',
  IMAGES_AND_PDF: 'image/*,.pdf',
  JPEG_PNG: '.jpg,.jpeg,.png',
};
