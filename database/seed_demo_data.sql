-- ============================================================
-- ABCare OmniFlow — Demo Seed Data
-- Fictional patients for presentation/demo purposes only
-- Safe to run on a fresh database after full_schema.sql
-- Run: psql -U postgres -d postgres -f database/seed_demo_data.sql
-- ============================================================

-- ── Patients ──────────────────────────────────────────────────────────────
INSERT INTO patients (id, full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by, created_at)
VALUES
  ('pat-001', 'Reyes, Maria Cristina', 52, 'Female', '1972-03-14', 'Married',
   'Blk 4 Lot 12 Sampaguita St., Brgy. San Isidro, Cabanatuan City, Nueva Ecija',
   '09171234501', 'Elementary School Teacher', 'Dr. Santos, PGH', '2025-08-10 09:15:00'),

  ('pat-002', 'Dela Cruz, Eduardo Jose', 67, 'Male', '1957-11-22', 'Married',
   '123 Rizal Avenue, Brgy. Poblacion, Gapan City, Nueva Ecija',
   '09281234502', 'Retired Government Employee', NULL, '2025-09-03 10:30:00'),

  ('pat-003', 'Santos, Angelica Mae', 28, 'Female', '1996-06-05', 'Single',
   'Unit 3B Sunshine Residences, Maharlika Highway, Cabanatuan City',
   '09391234503', 'Call Center Agent', 'Self-referral', '2025-09-18 14:00:00'),

  ('pat-004', 'Villanueva, Roberto Carlos', 45, 'Male', '1979-01-30', 'Married',
   '45 Mabini St., Brgy. Aduas Norte, Cabanatuan City, Nueva Ecija',
   '09501234504', 'Tricycle Operator', 'Brgy. Health Center', '2025-10-07 08:45:00'),

  ('pat-005', 'Aquino, Lourdes Fernandez', 61, 'Female', '1963-09-08', 'Widowed',
   '78 Quezon St., Brgy. Kapitan Pepe, Cabanatuan City, Nueva Ecija',
   '09611234505', 'Sari-sari Store Owner', 'Dr. Reyes, Cabanatuan Doctors Hospital', '2025-10-22 11:00:00'),

  ('pat-006', 'Mendoza, Francis Paolo', 34, 'Male', '1990-04-17', 'Single',
   '22 Burgos Extension, Brgy. Zulueta, Cabanatuan City, Nueva Ecija',
   '09721234506', 'Construction Worker', NULL, '2025-11-05 13:30:00'),

  ('pat-007', 'Garcia, Teresita Bautista', 73, 'Female', '1951-12-01', 'Widowed',
   '9 Lapu-Lapu St., Brgy. Caalibangbangan, Cabanatuan City, Nueva Ecija',
   '09831234507', 'Retired Nurse', 'Family referral', '2025-11-19 09:00:00'),

  ('pat-008', 'Ramos, Danilo Agustin', 41, 'Male', '1983-07-25', 'Married',
   '56 Del Pilar St., Brgy. Sangitan, Cabanatuan City, Nueva Ecija',
   '09941234508', 'Jeepney Driver', 'Brgy. Health Center', '2025-12-02 10:15:00'),

  ('pat-009', 'Torres, Josephine Alcantara', 38, 'Female', '1986-02-11', 'Married',
   '14 Bonifacio St., Brgy. Pagas, Cabanatuan City, Nueva Ecija',
   '09151234509', 'Nurse (Private Hospital)', 'Self-referral', '2026-01-08 15:00:00'),

  ('pat-010', 'Castillo, Benjamin Navarro', 55, 'Male', '1969-10-03', 'Married',
   '33 Luna St., Brgy. Bitas, Cabanatuan City, Nueva Ecija',
   '09261234510', 'High School Principal', 'Dr. Aquino, Nueva Ecija Doctors Hospital', '2026-01-20 08:30:00')
ON CONFLICT (id) DO NOTHING;

-- ── Medical History ────────────────────────────────────────────────────────
INSERT INTO patient_medical_history (patient_id, past_medical, maintenance_medications_text, travel_history, personal_social_history, family_history)
VALUES
  ('pat-001',
   '{"hypertension":{"checked":true,"notes":"Diagnosed 2018, on medication"},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":true,"notes":"Hypothyroidism, on Levothyroxine"},"allergies":{"checked":true,"notes":"Penicillin allergy"},"surgeries":{"checked":false,"notes":""},"others":{"checked":false,"notes":""}}',
   'Amlodipine 5mg OD, Levothyroxine 50mcg OD',
   'No recent travel outside Nueva Ecija',
   '{"smoker":false,"alcohol_intake":false,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-002',
   '{"hypertension":{"checked":true,"notes":"Longstanding, poorly controlled"},"diabetes_mellitus":{"checked":true,"notes":"Type 2, diagnosed 2010"},"heart_disease":{"checked":true,"notes":"Coronary artery disease, s/p angioplasty 2019"},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":true,"notes":"Coronary angioplasty 2019, PGH"},"others":{"checked":false,"notes":""}}',
   'Metformin 500mg BID, Atorvastatin 40mg OD, Aspirin 80mg OD, Losartan 50mg OD',
   'No travel history',
   '{"smoker":true,"alcohol_intake":true,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":true,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-003',
   '{"hypertension":{"checked":false,"notes":""},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":true,"notes":"Mild intermittent, uses reliever PRN"},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":true,"notes":"Dust mite allergy"},"surgeries":{"checked":false,"notes":""},"others":{"checked":false,"notes":""}}',
   'Salbutamol MDI PRN',
   'Traveled to Manila monthly for work',
   '{"smoker":false,"alcohol_intake":false,"exposures":true,"others":false}',
   '{"hypertension":false,"diabetes_mellitus":false,"bronchial_asthma":true,"cancer":false,"others":false}'),

  ('pat-004',
   '{"hypertension":{"checked":false,"notes":""},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":true,"notes":"PTB completed treatment 2020"},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":false,"notes":""},"others":{"checked":false,"notes":""}}',
   'None currently',
   'No significant travel history',
   '{"smoker":true,"alcohol_intake":true,"exposures":false,"others":false}',
   '{"hypertension":false,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":false,"others":true}'),

  ('pat-005',
   '{"hypertension":{"checked":true,"notes":"On medication for 10 years"},"diabetes_mellitus":{"checked":true,"notes":"Type 2, insulin-dependent"},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":true,"notes":"Stage 2 CKD, monitored"},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":true,"notes":"Appendectomy 1995, hysterectomy 2008"},"others":{"checked":false,"notes":""}}',
   'Insulin Glargine 20 units OD, Amlodipine 10mg OD, Furosemide 40mg OD',
   'No travel outside province',
   '{"smoker":false,"alcohol_intake":false,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":true,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-006',
   '{"hypertension":{"checked":false,"notes":""},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":false,"notes":""},"others":{"checked":false,"notes":""}}',
   'None',
   'No significant travel',
   '{"smoker":true,"alcohol_intake":true,"exposures":true,"others":false}',
   '{"hypertension":false,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-007',
   '{"hypertension":{"checked":true,"notes":"Controlled on medication"},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":true,"notes":"Atrial fibrillation, on anticoagulant"},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":true,"notes":"Sulfa drug allergy"},"surgeries":{"checked":true,"notes":"Cataract surgery bilateral 2021"},"others":{"checked":false,"notes":""}}',
   'Warfarin 5mg OD, Bisoprolol 5mg OD, Amlodipine 5mg OD',
   'No recent travel',
   '{"smoker":false,"alcohol_intake":false,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":true,"others":false}'),

  ('pat-008',
   '{"hypertension":{"checked":false,"notes":""},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":false,"notes":""},"others":{"checked":false,"notes":""}}',
   'None',
   'Travels to Manila occasionally',
   '{"smoker":true,"alcohol_intake":false,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-009',
   '{"hypertension":{"checked":false,"notes":""},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":true,"notes":"NSAID allergy — causes urticaria"},"surgeries":{"checked":true,"notes":"CS delivery 2018"},"others":{"checked":false,"notes":""}}',
   'Ferrous sulfate 325mg OD (postpartum)',
   'No significant travel',
   '{"smoker":false,"alcohol_intake":false,"exposures":false,"others":false}',
   '{"hypertension":false,"diabetes_mellitus":true,"bronchial_asthma":false,"cancer":false,"others":false}'),

  ('pat-010',
   '{"hypertension":{"checked":true,"notes":"Diagnosed 2015"},"diabetes_mellitus":{"checked":false,"notes":""},"heart_disease":{"checked":false,"notes":""},"bronchial_asthma":{"checked":false,"notes":""},"tuberculosis":{"checked":false,"notes":""},"chronic_kidney_disease":{"checked":false,"notes":""},"thyroid_disease":{"checked":false,"notes":""},"allergies":{"checked":false,"notes":""},"surgeries":{"checked":false,"notes":""},"others":{"checked":true,"notes":"Gout, recurrent episodes"}}',
   'Losartan 100mg OD, Allopurinol 300mg OD',
   'Travels to Manila for work conferences',
   '{"smoker":false,"alcohol_intake":true,"exposures":false,"others":false}',
   '{"hypertension":true,"diabetes_mellitus":false,"bronchial_asthma":false,"cancer":false,"others":true}')
ON CONFLICT (patient_id) DO NOTHING;

-- ── Consultation Records ───────────────────────────────────────────────────
INSERT INTO consultation_records (patient_id, date, subjective_clinical_findings, assessment_plan, reviewed, marked_at, vitals)
VALUES
  ('pat-001','2025-08-10','Patient complains of occasional headaches and fatigue. BP noted elevated at home. Compliant with medications.','Hypertension — controlled. Hypothyroidism — stable. Continue current medications. Repeat TSH in 3 months. Low-sodium diet counseling given.',true,'2025-08-10 10:00:00','{"bp_systolic":148,"bp_diastolic":92,"temp_celsius":36.6,"heart_rate":78,"spo2":98,"weight_kg":68,"height_cm":155}'),
  ('pat-001','2025-11-12','Follow-up. Headaches resolved. Fatigue improved. BP better controlled per home monitoring log.','Hypertension — improving. Adjust Amlodipine to 10mg OD. Continue Levothyroxine. Repeat labs in 6 weeks.',true,'2025-11-12 11:30:00','{"bp_systolic":138,"bp_diastolic":86,"temp_celsius":36.5,"heart_rate":74,"spo2":99,"weight_kg":67,"height_cm":155}'),
  ('pat-001','2026-02-18','Routine follow-up. No new complaints. Sleeping well. BP stable.','Hypertension — well controlled. Hypothyroidism — stable. Maintain current regimen. Annual labs ordered.',true,'2026-02-18 09:45:00','{"bp_systolic":132,"bp_diastolic":82,"temp_celsius":36.4,"heart_rate":72,"spo2":99,"weight_kg":66,"height_cm":155}'),
  ('pat-002','2025-09-03','Chest tightness on exertion, relieved by rest. Fasting blood sugar elevated per home glucometer. Mild pedal edema noted.','Coronary artery disease — stable angina. DM Type 2 — suboptimal control. Increase Metformin to 1g BID. Refer to cardiologist for stress test.',true,'2025-09-03 11:00:00','{"bp_systolic":162,"bp_diastolic":98,"temp_celsius":36.7,"heart_rate":82,"spo2":97,"weight_kg":78,"height_cm":168}'),
  ('pat-002','2025-12-10','Cardiology cleared — stress test negative for ischemia. Chest tightness resolved. Blood sugar better controlled. Edema resolved.','CAD — stable. DM Type 2 — improving. Continue current medications. HbA1c ordered.',true,'2025-12-10 10:15:00','{"bp_systolic":145,"bp_diastolic":88,"temp_celsius":36.5,"heart_rate":76,"spo2":98,"weight_kg":77,"height_cm":168}'),
  ('pat-002','2026-03-05','HbA1c result: 7.2%. BP better. No chest pain. Mild fatigue on prolonged walking.','DM Type 2 — near target. Hypertension — controlled. Add Sitagliptin 100mg OD.',true,'2026-03-05 09:30:00','{"bp_systolic":138,"bp_diastolic":84,"temp_celsius":36.6,"heart_rate":74,"spo2":98,"weight_kg":76,"height_cm":168}'),
  ('pat-003','2025-09-18','Wheezing and shortness of breath for 3 days. Triggered by dust exposure at work. Using reliever inhaler 3-4x daily.','Bronchial asthma — mild exacerbation. Prescribe short course oral prednisolone 5 days. Advise N95 mask at work.',true,'2025-09-18 14:30:00','{"bp_systolic":110,"bp_diastolic":70,"temp_celsius":36.8,"heart_rate":92,"spo2":95,"weight_kg":54,"height_cm":160}'),
  ('pat-003','2025-09-25','Significant improvement. Wheezing resolved. Using reliever only once in past 3 days.','Bronchial asthma — resolving. Discontinue prednisolone. Continue salbutamol PRN.',true,'2025-09-25 10:00:00','{"bp_systolic":108,"bp_diastolic":68,"temp_celsius":36.5,"heart_rate":80,"spo2":99,"weight_kg":54,"height_cm":160}'),
  ('pat-004','2025-10-07','Persistent cough for 2 weeks. No hemoptysis. Low-grade fever noted. History of completed PTB treatment 2020.','Rule out PTB recurrence. Sputum AFB smear ordered. Chest X-ray requested. Advised smoking cessation.',false,NULL,'{"bp_systolic":118,"bp_diastolic":76,"temp_celsius":37.4,"heart_rate":88,"spo2":97,"weight_kg":62,"height_cm":165}'),
  ('pat-004','2025-10-21','Sputum AFB smear: negative x2. CXR: fibrotic changes consistent with old PTB, no active lesion. Cough improving.','Cough — likely post-infectious. No active PTB. Prescribe cough suppressant. Reinforce smoking cessation.',true,'2025-10-21 11:00:00','{"bp_systolic":120,"bp_diastolic":78,"temp_celsius":36.8,"heart_rate":84,"spo2":98,"weight_kg":62,"height_cm":165}'),
  ('pat-005','2025-10-22','Bilateral leg swelling worsening. Decreased urine output. Blood sugar poorly controlled. Fatigue and dyspnea on exertion.','CKD Stage 2 — worsening. DM Type 2 — uncontrolled. Adjust insulin to 24 units. Increase Furosemide to 80mg OD. Nephrology referral.',true,'2025-10-22 11:30:00','{"bp_systolic":172,"bp_diastolic":104,"temp_celsius":36.9,"heart_rate":94,"spo2":96,"weight_kg":72,"height_cm":152}'),
  ('pat-005','2026-01-15','Nephrology follow-up done. Edema improved. Blood sugar better. Creatinine stable at 1.4 mg/dL.','CKD Stage 2 — stable. DM — improving. Continue current regimen. Repeat renal function in 3 months.',true,'2026-01-15 10:00:00','{"bp_systolic":148,"bp_diastolic":90,"temp_celsius":36.6,"heart_rate":82,"spo2":97,"weight_kg":69,"height_cm":152}'),
  ('pat-006','2025-11-05','Right hand laceration from construction site accident. 4cm wound on dorsum of right hand. No tendon involvement.','Laceration right hand — wound cleaned, sutured (4 interrupted nylon sutures). Tetanus toxoid given. Amoxicillin-clavulanate 625mg BID x 7 days.',true,'2025-11-05 14:00:00','{"bp_systolic":122,"bp_diastolic":78,"temp_celsius":36.7,"heart_rate":86,"spo2":99,"weight_kg":70,"height_cm":170}'),
  ('pat-006','2025-11-10','Wound healing well. No signs of infection. Sutures intact. Patient compliant with antibiotics.','Laceration — healing well. Remove sutures in 3 days. Continue wound care.',true,'2025-11-10 09:30:00','{"bp_systolic":118,"bp_diastolic":74,"temp_celsius":36.5,"heart_rate":80,"spo2":99,"weight_kg":70,"height_cm":170}'),
  ('pat-007','2025-11-19','Palpitations and dizziness for 1 week. INR result: 1.8 (subtherapeutic). BP elevated. Mild confusion noted by family.','AFib — subtherapeutic anticoagulation. Increase Warfarin to 6mg OD. Repeat INR in 1 week. Adjust Bisoprolol to 7.5mg OD.',true,'2025-11-19 09:30:00','{"bp_systolic":158,"bp_diastolic":96,"temp_celsius":36.4,"heart_rate":98,"spo2":97,"weight_kg":52,"height_cm":148}'),
  ('pat-007','2025-11-26','INR repeat: 2.4 (therapeutic). Palpitations reduced. Dizziness resolved. BP improved.','AFib — therapeutic anticoagulation achieved. Continue current regimen. Repeat INR monthly.',true,'2025-11-26 10:00:00','{"bp_systolic":142,"bp_diastolic":88,"temp_celsius":36.3,"heart_rate":82,"spo2":98,"weight_kg":52,"height_cm":148}'),
  ('pat-007','2026-02-10','Routine follow-up. INR: 2.6. No palpitations. Ambulating with cane. Family reports good compliance.','AFib — stable, therapeutic INR. Hypertension — controlled. Continue all medications.',true,'2026-02-10 09:00:00','{"bp_systolic":136,"bp_diastolic":84,"temp_celsius":36.4,"heart_rate":78,"spo2":98,"weight_kg":51,"height_cm":148}'),
  ('pat-008','2025-12-02','Routine check-up. Occasional headaches. Smoker — 1 pack/day x 15 years. BP elevated on first reading.','Hypertension — newly diagnosed. Lifestyle modification counseling: smoking cessation, low-sodium diet, exercise. Recheck BP in 4 weeks.',true,'2025-12-02 10:30:00','{"bp_systolic":148,"bp_diastolic":94,"temp_celsius":36.6,"heart_rate":84,"spo2":98,"weight_kg":74,"height_cm":167}'),
  ('pat-008','2026-01-06','BP recheck. Still elevated despite lifestyle changes. Reduced smoking to half pack/day.','Hypertension — persistent. Start Losartan 50mg OD. Continue lifestyle modification. Fasting lipid profile ordered.',true,'2026-01-06 09:00:00','{"bp_systolic":152,"bp_diastolic":96,"temp_celsius":36.5,"heart_rate":82,"spo2":98,"weight_kg":74,"height_cm":167}'),
  ('pat-009','2026-01-08','Generalized body malaise, low-grade fever, sore throat for 3 days. Works night shift.','URTI — viral. Paracetamol 500mg q6h PRN (NSAID allergy noted). Adequate hydration. Rest.',true,'2026-01-08 15:30:00','{"bp_systolic":112,"bp_diastolic":72,"temp_celsius":37.6,"heart_rate":90,"spo2":99,"weight_kg":58,"height_cm":162}'),
  ('pat-009','2026-03-20','Follow-up for iron deficiency anemia. Fatigue improving. Tolerating iron supplements well.','Iron deficiency anemia — responding to treatment. Continue Ferrous sulfate 325mg OD. Repeat CBC in 6 weeks.',false,NULL,'{"bp_systolic":108,"bp_diastolic":68,"temp_celsius":36.5,"heart_rate":86,"spo2":99,"weight_kg":58,"height_cm":162}'),
  ('pat-010','2026-01-20','Acute right big toe pain and swelling for 2 days. Cannot bear weight. Uric acid: 9.2 mg/dL. BP elevated.','Gout — acute flare, right first MTP joint. Colchicine 0.5mg BID x 5 days. Hypertension — uncontrolled. Increase Losartan to 100mg OD.',true,'2026-01-20 09:00:00','{"bp_systolic":158,"bp_diastolic":98,"temp_celsius":36.8,"heart_rate":88,"spo2":99,"weight_kg":82,"height_cm":172}'),
  ('pat-010','2026-02-17','Gout flare resolved. Uric acid repeat: 7.8 mg/dL. BP improving. Tolerating Allopurinol well.','Gout — resolved. Uric acid improving. Continue Allopurinol 300mg OD. Hypertension — better controlled.',true,'2026-02-17 10:00:00','{"bp_systolic":138,"bp_diastolic":86,"temp_celsius":36.5,"heart_rate":80,"spo2":99,"weight_kg":81,"height_cm":172}')
ON CONFLICT DO NOTHING;

-- ── Prescriptions ──────────────────────────────────────────────────────────
INSERT INTO prescriptions (patient_id, type, medication_name, dosage, frequency, duration, instructions)
VALUES
  ('pat-001','typed','Amlodipine','10mg','Once daily','Ongoing','Take in the morning. Monitor BP weekly.'),
  ('pat-001','typed','Levothyroxine','50mcg','Once daily','Ongoing','Take on empty stomach, 30 minutes before breakfast.'),
  ('pat-002','typed','Metformin','1000mg','Twice daily','Ongoing','Take with meals to reduce GI side effects.'),
  ('pat-002','typed','Atorvastatin','40mg','Once daily at bedtime','Ongoing','Take at night. Avoid grapefruit juice.'),
  ('pat-002','typed','Aspirin','80mg','Once daily','Ongoing','Take after meals. Watch for unusual bleeding.'),
  ('pat-002','typed','Losartan','50mg','Once daily','Ongoing','Take in the morning. Monitor BP and potassium.'),
  ('pat-003','typed','Salbutamol MDI','100mcg/puff','As needed (PRN)','Ongoing','2 puffs when wheezing. Rinse mouth after use.'),
  ('pat-005','typed','Insulin Glargine','24 units','Once daily at bedtime','Ongoing','Inject subcutaneously. Rotate injection sites.'),
  ('pat-005','typed','Furosemide','80mg','Once daily in the morning','Ongoing','Take early in the day. Monitor weight daily.'),
  ('pat-007','typed','Warfarin','6mg','Once daily','Ongoing','Take at the same time each day. Monthly INR monitoring.'),
  ('pat-007','typed','Bisoprolol','7.5mg','Once daily','Ongoing','Do not stop abruptly. Monitor heart rate.'),
  ('pat-008','typed','Losartan','50mg','Once daily','Ongoing','Take in the morning. Recheck BP in 4 weeks.'),
  ('pat-010','typed','Losartan','100mg','Once daily','Ongoing','Take in the morning. Monitor BP and renal function.'),
  ('pat-010','typed','Allopurinol','300mg','Once daily','Ongoing','Take after meals. Increase fluid intake. Avoid organ meats and shellfish.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF SEED DATA
-- 10 fictional patients · 23 consultations · 14 prescriptions
-- All data is fictional and for demonstration purposes only
-- ============================================================
