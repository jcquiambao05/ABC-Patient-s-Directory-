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

// Set timezone for all connections so DATE columns don't shift
pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Manila'");
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
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'application/pdf': 'pdf'
  };
  return map[mimetype] || 'bin';
}

// ── Multer instances ───────────────────────────────────────────────────────
const makeStorage = (dest: string) => multer.diskStorage({
  destination: (_, __, cb) => { fs.mkdirSync(dest, { recursive: true }); cb(null, dest); },
  filename: (_, file, cb) => cb(null, generateTimestampFilename(getExt(file.mimetype)))
});

const photoUpload = multer({ storage: makeStorage('uploads/patients'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });
const chartUpload = multer({ storage: makeStorage('uploads/charts'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png','image/webp','application/pdf'].includes(f.mimetype)), limits: { fileSize: 20*1024*1024 } });
const medicationUpload = multer({ storage: makeStorage('uploads/medications'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });
const prescriptionUpload = multer({ storage: makeStorage('uploads/prescriptions'), fileFilter: (_, f, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(f.mimetype)), limits: { fileSize: 10*1024*1024 } });

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

  // ── Audit log helper ───────────────────────────────────────────────────
  const logAudit = async (req: express.Request, action: string, entityType: string, entityId: string | null, description: string) => {
    try {
      const user = (req as any).user;
      await pool.query(
        'INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, description) VALUES ($1,$2,$3,$4,$5,$6)',
        [user?.userId || 'unknown', user?.email || 'unknown', action, entityType, entityId, description]
      );
    } catch { /* never let audit failure break the main operation */ }
  };

  // ── Health ─────────────────────────────────────────────────────────────
  app.get("/api/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // ── PATIENTS ───────────────────────────────────────────────────────────
  app.get("/api/patients", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*,
          (SELECT marked_at FROM consultation_records
           WHERE patient_id = p.id AND reviewed = true
           ORDER BY marked_at DESC LIMIT 1) AS last_visit_date
        FROM patients p WHERE p.archived = false ORDER BY p.created_at DESC
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
      await pool.query(`INSERT INTO patient_medical_history (patient_id) VALUES ($1)`, [patient.id]);
      await logAudit(req, 'CREATE', 'patient', patient.id, `Created patient: ${full_name}`);
      res.json(patient);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Get archived patients (superadmin only) — MUST be before /:id to avoid route conflict
  app.get("/api/patients/archived/list", authenticateToken, requireRole('superadmin'), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*, au.display_name AS archived_by_name
        FROM patients p
        LEFT JOIN admin_users au ON au.id = p.archived_by
        WHERE p.archived = true
        ORDER BY p.archived_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.get("/api/patients/:id", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
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
      await logAudit(req, 'UPDATE', 'patient', req.params.id, `Updated patient: ${full_name}`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Archive patient (staff or superadmin — soft delete, hidden from directory)
  app.delete("/api/patients/:id", authenticateToken, requireRole('staff', 'superadmin'), async (req, res) => {
    try {
      const pRes = await pool.query('SELECT full_name FROM patients WHERE id=$1', [req.params.id]);
      const name = pRes.rows[0]?.full_name || req.params.id;
      const archiverId = (req as any).user?.userId;
      await pool.query(
        'UPDATE patients SET archived=true, archived_at=NOW(), archived_by=$1 WHERE id=$2',
        [archiverId, req.params.id]
      );
      await logAudit(req, 'ARCHIVE', 'patient', req.params.id, `Archived patient: ${name}`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Restore archived patient (superadmin only)
  app.post("/api/patients/:id/restore", authenticateToken, requireRole('superadmin'), async (req, res) => {
    try {
      await pool.query('UPDATE patients SET archived=false, archived_at=NULL, archived_by=NULL WHERE id=$1', [req.params.id]);
      await logAudit(req, 'RESTORE', 'patient', req.params.id, `Restored archived patient`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Permanently delete patient (superadmin only)
  app.delete("/api/patients/:id/permanent", authenticateToken, requireRole('superadmin'), async (req, res) => {
    try {
      const pRes = await pool.query('SELECT full_name FROM patients WHERE id=$1', [req.params.id]);
      const name = pRes.rows[0]?.full_name || req.params.id;
      await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
      await logAudit(req, 'PERMANENT_DELETE', 'patient', req.params.id, `Permanently deleted patient: ${name}`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Profile photo upload ───────────────────────────────────────────────
  app.post("/api/patients/:id/profile-photo", authenticateToken, requireRole('staff'), photoUpload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid type (JPEG/PNG/WebP only)' });
    try {
      const filePath = `uploads/patients/${req.file.filename}`;
      await pool.query('UPDATE patients SET profile_photo_path = $1 WHERE id = $2', [filePath, req.params.id]);
      res.json({ success: true, path: filePath });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Medical history ────────────────────────────────────────────────────
  app.get("/api/patients/:id/medical-history", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
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

  app.get("/api/patients/:id/chart-images", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
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
      await logAudit(req, 'MARK_REVIEWED', 'consultation_record', req.params.id, `Marked consultation record as reviewed`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/consultation-records/:id", authenticateToken, requireRole('staff'), async (req, res) => {
    try {
      await pool.query('DELETE FROM consultation_records WHERE id = $1', [req.params.id]);
      await logAudit(req, 'DELETE', 'consultation_record', req.params.id, `Deleted consultation record`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Doctor notes — admin only, not visible to staff
  app.patch("/api/consultation-records/:id/doctor-notes", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await pool.query('UPDATE consultation_records SET doctor_notes=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [req.body.doctor_notes || null, req.params.id]);
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
      await logAudit(req, 'CREATE', 'prescription', r.rows[0].id, `Added ${type} prescription for patient ${patient_id}`);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/prescriptions/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await pool.query('DELETE FROM prescriptions WHERE id = $1', [req.params.id]);
      await logAudit(req, 'DELETE', 'prescription', req.params.id, `Deleted prescription`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.put("/api/prescriptions/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    const { medication_name, dosage, instructions } = req.body;
    try {
      await pool.query(
        'UPDATE prescriptions SET medication_name=$1, dosage=$2, instructions=$3 WHERE id=$4',
        [medication_name||null, dosage||null, instructions||null, req.params.id]
      );
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
      const r = await pool.query(`INSERT INTO queue (patient_id, position) VALUES ($1,$2) RETURNING *`, [patient_id, posRes.rows[0].next_pos]);
      const pRes = await pool.query('SELECT full_name FROM patients WHERE id=$1', [patient_id]);
      await logAudit(req, 'QUEUE_ADD', 'queue', r.rows[0].id, `Added patient "${pRes.rows[0]?.full_name || patient_id}" to queue`);
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
      await logAudit(req, 'QUEUE_RESET', 'queue', null, `Reset today's queue`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/queue/archive", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      await pool.query("UPDATE queue SET archived=true, archived_at=NOW() WHERE queued_date=CURRENT_DATE AND archived=false");
      await logAudit(req, 'QUEUE_ARCHIVE', 'queue', null, `Archived today's queue`);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── AI Extract Data (extraction only, no creation) ─────────────────────
  app.post("/api/patients/ai-extract", authenticateToken, requireRole('staff'), async (req, res) => {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'Image data is required' });

    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const VISION_MODEL = process.env.VISION_MODEL || 'llava';

    // Strip data URL prefix if present
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `This is a medical patient chart form. Extract the following fields and return ONLY valid JSON with no explanation or markdown:
{
  "patient_name": "full name or null",
  "age": number or null,
  "gender": "Male or Female or Other or null",
  "date_of_birth": "YYYY-MM-DD format or null",
  "civil_status": "Single or Married or Widowed or null",
  "address": "full address or null",
  "contact_number": "phone number or null",
  "occupation": "occupation or null",
  "referred_by": "referring person or null",
  "diagnosis": "diagnosis or assessment or null",
  "visit_date": "YYYY-MM-DD format or null",
  "chief_complaint": "main complaint or null"
}
If a field is not visible or unclear, use null. Do not guess or invent data.`;

    try {
      const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VISION_MODEL,
          stream: false,
          messages: [{ role: 'user', content: prompt, images: [base64] }]
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!ollamaRes.ok) throw new Error(`Vision model returned ${ollamaRes.status}`);
      const data = await ollamaRes.json() as any;
      const raw = data?.message?.content || '';

      // Extract JSON from response (model may wrap in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(422).json({ error: 'Could not parse extracted data', raw });

      const extracted = JSON.parse(jsonMatch[0]);
      res.json({ success: true, extracted_data: extracted, raw_text: raw });
    } catch (err: any) {
      if (err?.name === 'TimeoutError') return res.status(504).json({ error: 'Vision model timed out. Try a smaller image.' });
      res.status(503).json({ error: 'Vision model unavailable. Ensure Ollama is running with llava.' });
    }
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

  // ── Appointments ───────────────────────────────────────────────────────
  app.get("/api/appointments", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
    const { month, date } = req.query as Record<string, string>;
    try {
      let query = `
        SELECT a.id, a.patient_id, a.created_by, a.title, a.notes,
          TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
          a.appointment_time::text AS appointment_time,
          a.frequency, a.frequency_every,
          TO_CHAR(a.end_date, 'YYYY-MM-DD') AS end_date,
          a.status, a.sms_sent, a.sms_sent_at, a.created_at,
          p.full_name AS patient_name, p.contact_number AS patient_phone, p.profile_photo_path
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.status != 'cancelled'
      `;
      const params: any[] = [];
      if (date) {
        params.push(date);
        query += ` AND TO_CHAR(a.appointment_date, 'YYYY-MM-DD') = $${params.length}`;
      } else if (month) {
        params.push(month + '-01');
        query += ` AND DATE_TRUNC('month', a.appointment_date) = DATE_TRUNC('month', $${params.length}::date)`;
      }
      query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';
      const r = await pool.query(query, params);
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.post("/api/appointments", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
    const { patient_id, title, notes, appointment_date, appointment_time, frequency, frequency_every, end_date } = req.body;
    if (!patient_id || !appointment_date) return res.status(400).json({ error: 'patient_id and appointment_date are required' });
    const createdBy = (req as any).user?.userId;
    try {
      const r = await pool.query(`
        INSERT INTO appointments (patient_id, created_by, title, notes, appointment_date, appointment_time, frequency, frequency_every, end_date)
        VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9::date) RETURNING *
      `, [patient_id, createdBy, title||'Follow-up Consultation', notes||null, appointment_date, appointment_time||null, frequency||'once', frequency_every||1, end_date||null]);
      res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // SMS reminder — MUST be before /:id routes to avoid Express matching 'send-reminders' as an id
  app.post("/api/appointments/send-reminders", authenticateToken, requireRole('admin','superadmin'), async (req, res) => {
    try {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      const targetDate = twoDaysFromNow.toISOString().split('T')[0];

      const r = await pool.query(`
        SELECT a.*, p.full_name AS patient_name, p.contact_number AS patient_phone
        FROM appointments a JOIN patients p ON p.id = a.patient_id
        WHERE a.appointment_date = $1 AND a.sms_sent = false AND a.status = 'scheduled'
      `, [targetDate]);

      const SMS_API_URL = process.env.SMS_API_URL;
      const SMS_API_KEY = process.env.SMS_API_KEY;
      const SMS_SENDER = process.env.SMS_SENDER_NAME || 'ABCClinic';

      let sent = 0, failed = 0;
      for (const appt of r.rows) {
        if (!appt.patient_phone) { failed++; continue; }
        const dateStr = new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const timeStr = appt.appointment_time ? ` at ${appt.appointment_time.slice(0,5)}` : '';
        const message = `Hi ${appt.patient_name}, this is a reminder from ABC Clinic. You have a follow-up appointment on ${dateStr}${timeStr}. Please call us if you need to reschedule.`;

        if (SMS_API_URL && SMS_API_KEY) {
          try {
            const smsRes = await fetch(SMS_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apikey: SMS_API_KEY, number: appt.patient_phone, message, sendername: SMS_SENDER }),
            });
            if (smsRes.ok) {
              await pool.query('UPDATE appointments SET sms_sent=true, sms_sent_at=NOW() WHERE id=$1', [appt.id]);
              sent++;
            } else { failed++; }
          } catch { failed++; }
        } else {
          console.log(`[SMS REMINDER] Would send to ${appt.patient_phone}: ${message}`);
          await pool.query('UPDATE appointments SET sms_sent=true, sms_sent_at=NOW() WHERE id=$1', [appt.id]);
          sent++;
        }
      }
      res.json({ success: true, sent, failed, targetDate });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.put("/api/appointments/:id", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
    const { title, notes, appointment_date, appointment_time, frequency, frequency_every, end_date, status } = req.body;
    try {
      await pool.query(`
        UPDATE appointments SET title=$1, notes=$2, appointment_date=$3, appointment_time=$4,
          frequency=$5, frequency_every=$6, end_date=$7, status=COALESCE($8, status)
        WHERE id=$9
      `, [title||'Follow-up Consultation', notes||null, appointment_date, appointment_time||null, frequency||'once', frequency_every||1, end_date||null, status||null, req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.delete("/api/appointments/:id", authenticateToken, requireRole('staff','admin','superadmin'), async (req, res) => {
    try {
      await pool.query("UPDATE appointments SET status='cancelled' WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // ── Dashboard stats ────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", authenticateToken, requireRole('staff','admin'), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];

      // Respect range/from/to query params for filtered views
      const { range, from, to } = req.query as Record<string, string>;
      let filterFrom = monthAgo;
      let filterTo = today;
      if (range === 'today') { filterFrom = today; filterTo = today; }
      else if (range === 'week') { filterFrom = weekAgo; filterTo = today; }
      else if (from && to) { filterFrom = from; filterTo = to; }

      const [todayQ, weekQ, monthQ, totalP, pendingR, recentP] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date = $1`, [today]),
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date >= $1`, [weekAgo]),
        pool.query(`SELECT COUNT(*) FROM queue WHERE queued_date >= $1 AND queued_date <= $2`, [filterFrom, filterTo]),
        pool.query(`SELECT COUNT(*) FROM patients`),
        pool.query(`SELECT COUNT(*) FROM consultation_records WHERE reviewed = false`),
        pool.query(`SELECT * FROM patients WHERE created_at::date >= $1 AND created_at::date <= $2 ORDER BY created_at DESC LIMIT 10`, [filterFrom, filterTo]),
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
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const MODEL = process.env.DEFAULT_MODEL || 'llama3.2';

    // ── Layer 2: Keyword blocklist (runs before Ollama, saves compute) ──
    const blockedPatterns = [
      /\bpassword\b/i, /\bsecret\b/i, /\bjwt\b/i, /\bapi.?key\b/i, /\bcredential/i,
      /\btoken\b/i, /\bignore.{0,20}(previous|instruction)/i, /\bpretend.{0,20}(you are|to be)\b/i,
      /\byou are now\b/i, /\bjailbreak\b/i, /\bDAN\b/, /\bchatgpt\b/i, /\bopenai\b/i,
      /\bgemini\b/i, /\bclaude\b/i, /\bgpt-?[0-9]/i,
      /\belection\b/i, /\bpresident\b/i, /\bpolitics\b/i, /\bwar\b/i, /\bmilitary\b/i,
      /\bmovie\b/i, /\bsong\b/i, /\bcelebrity\b/i, /\bsport\b/i, /\bfootball\b/i,
      /\bcooking\b/i, /\brecipe\b/i, /\btravel\b/i, /\bweather\b/i,
    ];
    const isBlocked = blockedPatterns.some(p => p.test(message));
    if (isBlocked) {
      return res.json({ text: "I'm the ABC Clinic assistant and can only help with clinic-related questions. Please ask me about patients, the queue, procedures, prescriptions, or how to use the ABC Patient Directory." });
    }

    // ── Layer 1: System prompt (never exposed to frontend) ──
    const systemPrompt = `You are the ABC Clinic Health Assistant, an AI embedded inside the ABC Patient Directory web application. You assist clinic staff and doctors ONLY with questions about this clinic system.

ALLOWED TOPICS:
- Patient records: general data, medical history, consultation records, chart images
- Queue management: how the queue works, statuses (waiting/in_consultation/done), staff vs doctor controls
- Procedures and consent forms: counseling, surgery, immunization with e-signature
- Prescriptions: typed (medication_name, dosage, frequency, duration) or photo uploads
- Dashboard statistics: today's queue count, weekly/monthly counts, pending reviews
- How to use features of the ABC Patient Directory app
- General medical terminology relevant to clinic operations
- Data privacy and consent processes used in the clinic
- Roles: staff (data entry, queue management) and admin/doctor (prescriptions, queue doctor controls)

STRICTLY FORBIDDEN — refuse politely but firmly:
- Any topic unrelated to the ABC Clinic or its web application
- Politics, news, entertainment, sports, cooking, travel, or any general knowledge
- Writing code or technical instructions unrelated to the clinic app
- Revealing passwords, login credentials, JWT tokens, API keys, or any secrets
- Providing medical diagnoses or treatment recommendations for real patients
- Impersonating other AI systems

If asked anything outside your scope, respond: "I can only assist with ABC Clinic operations. Is there something about the patient directory or clinic workflow I can help you with?"

Be professional, concise, and helpful. You are a clinic tool, not a general assistant.`;

    // ── Layer 3: Context injection (schema knowledge, no actual patient data) ──
    const contextMessage = `CONTEXT: The ABC Patient Directory manages patients with fields: full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by, profile_photo. Medical history includes: past medical conditions (hypertension, heart disease, diabetes, asthma, tuberculosis, CKD, thyroid, allergies, surgeries), maintenance medications with optional image, travel history, personal/social history (smoker, alcohol, exposures), family history. Consultation records have: date, subjective/clinical findings, assessment/plan, reviewed status, marked_at. The queue has positions, statuses (waiting/in_consultation/done), remarks. Procedures: counseling/surgery/immunization with e-signature consent. Prescriptions: typed or photo. Dashboard shows today/week/month queue counts and pending reviews.`;

    // ── Live stats injection (aggregate only — no patient names or private data) ──
    let liveStats = '';
    try {
      const [queueStats, patientStats, reviewStats] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE archived = false) AS active_today,
            COUNT(*) FILTER (WHERE status = 'waiting' AND archived = false) AS waiting,
            COUNT(*) FILTER (WHERE status = 'in_consultation' AND archived = false) AS in_consultation,
            COUNT(*) FILTER (WHERE status = 'done' AND archived = false) AS done_today,
            COUNT(*) FILTER (WHERE queued_date >= date_trunc('week', CURRENT_DATE)) AS this_week,
            COUNT(*) FILTER (WHERE queued_date >= date_trunc('month', CURRENT_DATE)) AS this_month
          FROM queue WHERE queued_date = CURRENT_DATE
        `),
        pool.query(`SELECT COUNT(*) AS total FROM patients`),
        pool.query(`SELECT COUNT(*) AS pending FROM consultation_records WHERE reviewed = false`),
      ]);
      const q = queueStats.rows[0];
      const p = patientStats.rows[0];
      const r = reviewStats.rows[0];
      liveStats = `\n\nLIVE CLINIC STATS (as of right now):
- Today's queue: ${q.active_today} total (${q.waiting} waiting, ${q.in_consultation} in consultation, ${q.done_today} done)
- This week's queue entries: ${q.this_week}
- This month's queue entries: ${q.this_month}
- Total patients registered: ${p.total}
- Consultation records pending review: ${r.pending}`;
    } catch {
      // Stats unavailable — continue without them, don't break the chat
    }

    // Build messages array for Ollama
    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage + liveStats },
      { role: 'assistant', content: 'Understood. I have the current clinic stats and am ready to assist with ABC Clinic operations.' },
    ];

    // Add conversation history (last 6 messages max to keep context manageable)
    if (history && Array.isArray(history)) {
      const recent = history.slice(-6);
      for (const h of recent) {
        messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || h.text || '' });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, stream: false, messages }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!ollamaRes.ok) throw new Error(`Ollama returned ${ollamaRes.status}`);
      const data = await ollamaRes.json() as any;
      const text = data?.message?.content || "I didn't get a response. Please try again.";
      res.json({ text });
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        return res.json({ text: "The clinic assistant is taking too long to respond. Please try again." });
      }
      console.error('Ollama error:', err);
      res.json({ text: "The clinic assistant is currently offline. Please ensure Ollama is running." });
    }
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
