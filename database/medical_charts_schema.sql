-- Medical Charts Schema for OCR Integration
-- Run this to add the medical_charts table to your database

CREATE TABLE IF NOT EXISTS medical_charts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date TEXT,
  document_type TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  custom_fields JSONB,
  metadata JSONB,
  confidence_score REAL,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT,
  raw_ocr_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_charts_patient_id ON medical_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_charts_visit_date ON medical_charts(visit_date);
CREATE INDEX IF NOT EXISTS idx_medical_charts_document_type ON medical_charts(document_type);
CREATE INDEX IF NOT EXISTS idx_medical_charts_reviewed ON medical_charts(reviewed);
CREATE INDEX IF NOT EXISTS idx_medical_charts_custom_fields ON medical_charts USING GIN (custom_fields);
