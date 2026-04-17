import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from 'pg';
const { Pool } = pkg;
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});

// ── Timestamp filename helper ──────────────────────────────────────────────
function generateTimestampFilename(ext: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}_${time}.${ext}`;
}

function getExt(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'application/pdf': 'pdf'
  };
  return map[mimetype] || 'bin';
}

// ── Multer instances ───────────────────────────────────────────────────────
const makeStorage = (dest: string) => multer.diskStorage({
  destination: (_, __, cb) => { fs.mkdirSync(dest, { recursive: true }); cb(null, dest); },
  filename: (_, file, cb) => cb(null, generateTimestampFilename(getExt(file.mimetype)))
});

const photoUpload = multer({ storage: makeStorage('uploads/patients'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });
const chartUpload = multer({ storage: makeStorage('uploads/charts'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png','application/pdf'].includes(f.mimetype)), limits: { fileSize: 20*1024*1024 } });
const medicationUpload = multer({ storage: makeStorage('uploads/medications'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });
const prescriptionUpload = multer({ storage: makeStorage('uploads/prescriptions'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });

// ── DB init ────────────────────────────────────────────────────────────────
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL/Supabase successfully.");
    client.release();
  } catch (err) {
    console.error("❌ DATABASE CONNECTION ERROR:", (err as Error).message);
    console.error("Run: supabase start  and check DATABASE_URL in .env");
    process.exit(1);
  }
};

async function startServer() {
  await initDb();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static('uploads'));

  console.log('JWT_SECRET:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'NOT SET');

  // ── Auth routes ────────────────────────────────────────────────────────
  const { default: authRoutes } = await import("./src/auth/authRoutes.js");
  app.use('/api/auth', authRoutes(pool));

  // ── Auth middleware ────────────────────────────────────────────────────
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    try {
      (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
      next();
    } catch {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  const requireRole = (...roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = (req as any).user?.role;
    if (!roles.includes(role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };

  // ── Health ─────────────────────────────────────────────────────────────
  app.get("/api/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // ── PATIENTS ───────────────────────────────────────────────────────────
  app.get("/api/patients", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*,
          (SELECT marked_at FROM consultation_records
           WHERE patient_id = p.id AND reviewed = true
           ORDER BY marked_at DESC LIMIT 1) AS last_visit_date
        FROM patients p ORDER BY p.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/patients", authenticateToken, requireRole('staff'), async (req, res) => {
    const { full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ error: 'full_name is required', field: 'full_name' });
    try {
      const r = await pool.query(`
        INSERT INTO patients (full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [full_name, age||null, gender||null, date_of_birth||null, civil_status||null, address||null, contact_number||null, occupation||null, referred_by||null]);
      const patient = r.rows[0];
      // Create empty medical history row
      await pool.query(`INSERT INTO patient_medical_history (patient_id) VALUES ($1)`, [patient.id]);
      res.json(patient);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.get("/api/patients/:id", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const [pRes, mhRes, crRes, ciRes] = await Promise.all([
        pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]),
        pool.query('SELECT * FROM patient_medical_history WHERE patient_id = $1', [req.params.id]),
        pool.query('SELECT * FROM consultation_records WHERE patient_id = $1 ORDER BY date DESC, created_at DESC', [req.params.id]),
        pool.query('SELECT * FROM chart_images WHERE patient_id = $1 ORDER BY uploaded_at DESC', [req.params.id]),
      ]);
      if (!pRes.rows[0]) return res.status(404).json({ error: 'Patient not found' });
      res.json({ ...pRes.rows[0], medical_history: mhRes.rows[0] || null, consultation_records: crRes.rows, chart_images: ciRes.rows });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.put("/api/patients/:id", authenticateToken, requireRole('staff'), async (req, res) => {
    const { full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ error: 'full_name is required', field: 'full_name' });
    try {
      await pool.query(`UPDATE patients SET full_name=$1,age=$2,gender=$3,date_of_birth=$4,civil_status=$5,address=$6,contact_number=$7,occupation=$8,referred_by=$9 WHERE id=$10`,
        [full_name, age||null, gender||null, date_of_birth||null, civil_status||null, address||null, contact_number||null, occupation||null, referred_by||null, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/patients/:id", authenticateToken, requireRole('staff'), async (req, res) => {
    try {
      await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Profile photo upload ───────────────────────────────────────────────
  app.post("/api/patients/:id/profile-photo", authenticateToken, requireRole('staff'), photoUpload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid type (JPEG/PNG only)' });
    try {
      const filePath = `uploads/patients/${req.file.filename}`;
      await pool.query('UPDATE patients SET profile_photo_path = $1 WHERE id = $2', [filePath, req.params.id]);
      res.json({ success: true, path: filePath });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Medical history ────────────────────────────────────────────────────
  app.get("/api/patients/:id/medical-history", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM patient_medical_history WHERE patient_id = $1', [req.params.id]);
      res.json(r.rows[0] || null);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/patients/:id/medical-history", authenticateToken, requireRole('staff'), async (req, res) => {
    const { past_medical, maintenance_medications_text, travel_history, personal_social_history, family_history } = req.body;
    try {
      await pool.query(`
        INSERT INTO patient_medical_history (patient_id, past_medical, maintenance_medications_text, travel_history, personal_social_history, family_history)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (patient_id) DO UPDATE SET
          past_medical = EXCLUDED.past_medical,
          maintenance_medications_text = EXCLUDED.maintenance_medications_text,
          travel_history = EXCLUDED.travel_history,
          personal_social_history = EXCLUDED.personal_social_history,
          family_history = EXCLUDED.family_history
      `, [req.params.id, JSON.stringify(past_medical||{}), maintenance_medications_text||null, travel_history||null, JSON.stringify(personal_social_history||{}), JSON.stringify(family_history||{})]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/patients/:id/medical-history/image", authenticateToken, requireRole('staff'), medicationUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid type' });
    try {
      const filePath = `uploads/medications/${req.file.filename}`;
      await pool.query('UPDATE patient_medical_history SET maintenance_medications_image_path = $1 WHERE patient_id = $2', [filePath, req.params.id]);
      res.json({ success: true, path: filePath });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Chart images ───────────────────────────────────────────────────────
  app.post("/api/patients/:id/chart-image", authenticateToken, requireRole('staff','admin'), chartUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid type (JPEG/PNG/PDF)' });
    try {
      const filePath = `uploads/charts/${req.file.filename}`;
      await pool.query('INSERT INTO chart_images (patient_id, file_path, file_type) VALUES ($1,$2,$3)', [req.params.id, filePath, req.file.mimetype]);
      res.json({ success: true, path: filePath });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.get("/api/patients/:id/chart-images", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM chart_images WHERE patient_id = $1 ORDER BY uploaded_at DESC', [req.params.id]);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/chart-images/:id", authenticateToken, requireRole('staff'), async (req, res) => {
    try {
      const r = await pool.query('SELECT file_path FROM chart_images WHERE id = $1', [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
      // Delete file from disk
      const filePath = r.rows[0].file_path;
      try { fs.unlinkSync(filePath); } catch { /* file may already be gone */ }
      await pool.query('DELETE FROM chart_images WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Consultation records ───────────────────────────────────────────────
  app.get("/api/consultation-records/:patient_id", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM consultation_records WHERE patient_id = $1 ORDER BY date DESC, created_at DESC', [req.params.patient_id]);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/consultation-records", authenticateToken, requireRole('staff'), async (req, res) => {
    const { patient_id, date, subjective_clinical_findings, assessment_plan, reviewer_notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    try {
      const r = await pool.query(`
        INSERT INTO consultation_records (patient_id, date, subjective_clinical_findings, assessment_plan, reviewer_notes)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [patient_id, date||new Date().toISOString().split('T')[0], subjective_clinical_findings||null, assessment_plan||null, reviewer_notes||null]);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Save — only editable fields, never touches reviewed or marked_at
  app.put("/api/consultation-records/:id/save", authenticateToken, requireRole('staff'), async (req, res) => {
    const { subjective_clinical_findings, assessment_plan, reviewer_notes } = req.body;
    try {
      await pool.query(`
        UPDATE consultation_records
        SET subjective_clinical_findings=$1, assessment_plan=$2, reviewer_notes=$3, updated_at=CURRENT_TIMESTAMP
        WHERE id=$4
      `, [subjective_clinical_findings||null, assessment_plan||null, reviewer_notes||null, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Mark — atomically sets reviewed=true and marked_at=NOW()
  app.put("/api/consultation-records/:id/mark", authenticateToken, requireRole('staff'), async (req, res) => {
    try {
      await pool.query(`
        UPDATE consultation_records
        SET reviewed=true, marked_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
        WHERE id=$1
      `, [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/consultation-records/:id", authenticateToken, requireRole('staff'), async (req, res) => {
    try {
      await pool.query('DELETE FROM consultation_records WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Procedures ─────────────────────────────────────────────────────────
  app.get("/api/procedures/:patient_id", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM procedures WHERE patient_id = $1 ORDER BY created_at DESC', [req.params.patient_id]);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/procedures", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    const { patient_id, procedure_type, consent_form_data, signature_data_url } = req.body;
    if (!patient_id || !procedure_type) return res.status(400).json({ error: 'patient_id and procedure_type are required' });
    try {
      let signaturePath: string | null = null;
      if (signature_data_url) {
        const base64 = signature_data_url.replace(/^data:image\/\w+;base64,/, '');
        const filename = generateTimestampFilename('png');
        fs.mkdirSync('uploads/signatures', { recursive: true });
        fs.writeFileSync(`uploads/signatures/${filename}`, Buffer.from(base64, 'base64'));
        signaturePath = `uploads/signatures/${filename}`;
      }
      const r = await pool.query(`
        INSERT INTO procedures (patient_id, procedure_type, consent_form_data, signature_path)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [patient_id, procedure_type, JSON.stringify(consent_form_data||{}), signaturePath]);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Prescriptions ──────────────────────────────────────────────────────
  app.get("/api/prescriptions/:patient_id", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC', [req.params.patient_id]);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/prescriptions", authenticateToken, requireRole('admin'), prescriptionUpload.single('photo'), async (req, res) => {
    const { patient_id, type, medication_name, dosage, frequency, duration, instructions } = req.body;
    if (!patient_id || !type) return res.status(400).json({ error: 'patient_id and type are required' });
    try {
      const photoPath = req.file ? `uploads/prescriptions/${req.file.filename}` : null;
      const r = await pool.query(`
        INSERT INTO prescriptions (patient_id, type, medication_name, dosage, frequency, duration, instructions, photo_path)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [patient_id, type, medication_name||null, dosage||null, frequency||null, duration||null, instructions||null, photoPath]);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/prescriptions/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await pool.query('DELETE FROM prescriptions WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Queue ──────────────────────────────────────────────────────────────
  app.get("/api/queue", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query(`
        SELECT q.*, p.full_name AS patient_name, p.profile_photo_path
        FROM queue q JOIN patients p ON p.id = q.patient_id
        WHERE q.queued_date = CURRENT_DATE AND q.archived = false
        ORDER BY q.position ASC
      `);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/queue", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    try {
      const posRes = await pool.query(`SELECT COALESCE(MAX(position),0)+1 AS next_pos FROM queue WHERE queued_date=CURRENT_DATE AND archived=false`);
      const r = await pool.query(`
        INSERT INTO queue (patient_id, position) VALUES ($1,$2) RETURNING *
      `, [patient_id, posRes.rows[0].next_pos]);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.patch("/api/queue/reorder", authenticateToken, requireRole('staff'), async (req, res) => {
    const entries: { id: string; position: number }[] = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'Expected array of {id, position}' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const e of entries) await client.query('UPDATE queue SET position=$1 WHERE id=$2', [e.position, e.id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: (err as Error).message }); }
    finally { client.release(); }
  });

  app.patch("/api/queue/:id/status", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    const { status } = req.body;
    if (!['waiting','in_consultation','done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
      await pool.query('UPDATE queue SET status=$1 WHERE id=$2', [status, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.patch("/api/queue/:id/done", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await pool.query("UPDATE queue SET status='done' WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.patch("/api/queue/:id/remarks", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      await pool.query('UPDATE queue SET remarks=$1 WHERE id=$2', [req.body.remarks||null, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/queue/reset", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await pool.query("DELETE FROM queue WHERE queued_date=CURRENT_DATE AND archived=false");
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/queue/archive", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      await pool.query("UPDATE queue SET archived=true, archived_at=NOW() WHERE queued_date=CURRENT_DATE AND archived=false");
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── AI Extract Data (extraction only, no creation) ─────────────────────
  app.post("/api/patients/ai-extract", authenticateToken, requireRole('staff'), async (req, res) => {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'Image data is required' });
    try {
      let ocrResponse: Response;
      try {
        ocrResponse = await fetch('http://localhost:5000/process', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData, template: 'patient_chart' })
        });
      } catch { return res.status(503).json({ error: 'OCR service unavailable. Ensure it is running on port 5000.' }); }

      if (!ocrResponse.ok) return res.status(500).json({ error: 'OCR processing failed' });
      const ocrResult = await ocrResponse.json();
      if (!ocrResult.success || !ocrResult.full_text?.trim()) return res.status(400).json({ error: 'No text extracted from image' });

      const d = ocrResult.extracted_data;
      res.json({
        success: true,
        extractedData: {
          name: d.patient_name || '',
          phone: d.phone || '',
          email: d.email || '',
          diagnosis: d.diagnosis || ''
        },
        rawText: ocrResult.full_text,
        confidence: ocrResult.stats?.avg_confidence || 0
      });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── AI Upload Entry (new schema) ───────────────────────────────────────
  app.post("/api/patients/ai-create", authenticateToken, requireRole('staff'), async (req, res) => {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'Image data is required' });
    try {
      let ocrResponse: Response;
      try {
        ocrResponse = await fetch('http://localhost:5000/process', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData, template: 'patient_chart' })
        });
      } catch { return res.status(503).json({ error: 'OCR service unavailable. Ensure it is running on port 5000.' }); }

      if (!ocrResponse.ok) return res.status(500).json({ error: 'OCR processing failed' });
      const ocrResult = await ocrResponse.json();
      if (!ocrResult.success || !ocrResult.full_text?.trim()) return res.status(400).json({ error: 'No text extracted from image' });

      const d = ocrResult.extracted_data;
      const fullName = d.patient_name || 'Unknown Patient';

      const pRes = await pool.query(`
        INSERT INTO patients (full_name, gender, date_of_birth, contact_number, address)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [fullName, d.gender||null, d.date_of_birth||null, d.phone||null, d.address||null]);
      const patient = pRes.rows[0];

      await pool.query('INSERT INTO patient_medical_history (patient_id) VALUES ($1)', [patient.id]);

      const crRes = await pool.query(`
        INSERT INTO consultation_records (patient_id, date, assessment_plan, raw_ocr_text, confidence_score)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [patient.id, d.visit_date||new Date().toISOString().split('T')[0], d.diagnosis||null, ocrResult.full_text, ocrResult.stats?.avg_confidence||0]);

      res.json({ success: true, patient_id: patient.id, chart_id: crRes.rows[0].id, patient_data: patient });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Dashboard stats ────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];

      const [todayQ, weekQ, monthQ, totalP, pendingR, recentP] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date = $1`, [today]),
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date >= $1`, [weekAgo]),
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date >= $1`, [monthAgo]),
        pool.query(`SELECT COUNT(*) FROM patients`),
        pool.query(`SELECT COUNT(*) FROM consultation_records WHERE reviewed = false`),
        pool.query(`SELECT * FROM patients ORDER BY created_at DESC LIMIT 5`),
      ]);

      res.json({
        todayVisits: parseInt(todayQ.rows[0].count),
        weekVisits: parseInt(weekQ.rows[0].count),
        monthVisits: parseInt(monthQ.rows[0].count),
        totalPatients: parseInt(totalP.rows[0].count),
        pendingReviews: parseInt(pendingR.rows[0].count),
        recentPatients: recentP.rows,
      });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Audit logs ─────────────────────────────────────────────────────────
  app.get("/api/audit-logs", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const r = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Chat ───────────────────────────────────────────────────────────────
  app.post("/api/chat", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const patientsRes = await pool.query('SELECT full_name FROM patients');
      const systemInstruction = `You are a medical administrative assistant for ABC Patient Directory. Patients: ${patientsRes.rows.map((p:any) => p.full_name).join(', ')}. Be professional and concise.`;
      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: history ? [...history, { role:'user', parts:[{text:message}] }] : [{ role:'user', parts:[{text:message}] }],
        config: { systemInstruction }
      });
      res.json({ text: result.text });
    } catch (err) { res.status(500).json({ error: 'Failed to get AI response' }); }
  });

  // ── OCR health/templates ───────────────────────────────────────────────
  app.get("/api/ocr/health", authenticateToken, async (_, res) => {
    try { const r = await fetch('http://localhost:5000/health'); res.json(await r.json()); }
    catch { res.status(503).json({ status: 'unavailable' }); }
  });
  app.get("/api/ocr/templates", authenticateToken, async (_, res) => {
    try { const r = await fetch('http://localhost:5000/templates'); res.json(await r.json()); }
    catch { res.status(503).json({ error: 'OCR service unavailable' }); }
  });

  // ── Vite / static ──────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        const fsMod = await import('fs');
        let template = fsMod.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) { vite.ssrFixStacktrace(e as Error); next(e); }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
