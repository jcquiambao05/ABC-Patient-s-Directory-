import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from 'pg';
const { Pool } = pkg;
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';

// Load environment variables FIRST
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});

// Initialize Database Schema (PostgreSQL version)
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL/Supabase successfully.");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          date_of_birth TEXT NOT NULL,
          gender TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS emrs (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          visit_date TEXT,
          diagnosis TEXT,
          treatment_plan TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          extracted_text TEXT,
          document_type TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
          raw_ocr_text TEXT,
          reviewed BOOLEAN DEFAULT FALSE,
          reviewer_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ Database schema verified/created.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ DATABASE CONNECTION ERROR:");
    console.error("Could not connect to PostgreSQL. Please check:");
    console.error("1. Is local Supabase running? (Run 'supabase start')");
    console.error("2. Is your DATABASE_URL in .env correct?");
    console.error("3. Current URL attempted:", process.env.DATABASE_URL || "Default Local Supabase URL");
    console.error("\nError details:", (err as Error).message);
    process.exit(1); // Stop the server if DB is not reachable
  }
};

async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Debug: Log JWT_SECRET status
  console.log('Server JWT_SECRET:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'NOT SET');

  // --- Authentication Routes ---
  // Dynamically import authRoutes after env is loaded
  const { default: authRoutes } = await import("./src/auth/authRoutes.js");
  app.use('/api/auth', authRoutes(pool));

  // --- Middleware to protect routes ---
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - Token present:', !!token, 'JWT_SECRET present:', !!process.env.JWT_SECRET);

    if (!token) {
      console.log('Auth failed: No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      console.log('Token verified successfully for user:', (decoded as any).email);
      (req as any).user = decoded;
      next();
    } catch (err) {
      console.error('Token verification failed:', (err as Error).message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  // --- API Routes ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: "connected",
      auth: "configured"
    });
  });

  // Patients (Protected)
  app.get("/api/patients", authenticateToken, async (req, res) => {
    const result = await pool.query(`
      SELECT 
        p.*,
        (
          SELECT visit_date 
          FROM medical_charts 
          WHERE patient_id = p.id 
          ORDER BY visit_date DESC, created_at DESC 
          LIMIT 1
        ) as last_visit_date
      FROM patients p 
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  });

  // AI Upload Entry - Create patient + EMR from OCR in one action
  // MUST come BEFORE /api/patients/:id to avoid route conflict
  app.post("/api/patients/ai-create", authenticateToken, async (req, res) => {
    const { imageData } = req.body;
    
    try {
      console.log('AI Upload Entry: Processing document to create new patient');
      
      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      
      // Call local OCR service with patient_chart template
      let ocrResponse;
      try {
        ocrResponse = await fetch('http://localhost:5000/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            template: 'patient_chart'
          })
        });
      } catch (fetchError) {
        console.error("Failed to connect to OCR service:", fetchError);
        return res.status(503).json({ 
          error: 'OCR service is not available. Please ensure the OCR service is running on port 5000.' 
        });
      }

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error(`OCR service error (${ocrResponse.status}):`, errorText);
        return res.status(500).json({ 
          error: `OCR processing failed: ${errorText}` 
        });
      }

      const ocrResult = await ocrResponse.json();
      
      if (!ocrResult.success || !ocrResult.full_text || !ocrResult.full_text.trim()) {
        return res.status(400).json({ 
          error: 'No text could be extracted from the image. Please ensure the image contains readable patient information.' 
        });
      }

      // Extract patient data from OCR result
      const extractedData = ocrResult.extracted_data;
      const formattedData = ocrResult.formatted_data;
      
      // Parse name - handle various formats
      let firstName = 'Unknown';
      let lastName = 'Patient';
      
      if (extractedData.patient_name) {
        const name = extractedData.patient_name.trim();
        
        // Handle "LastName, FirstName" format
        if (name.includes(',')) {
          const parts = name.split(',').map(s => s.trim());
          lastName = parts[0] || 'Patient';
          firstName = parts[1] || 'Unknown';
        } 
        // Handle "FirstName LastName" or "FirstName MiddleName LastName" format
        else {
          const nameParts = name.split(/\s+/);
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            // Take last part as last name, join middle names with first if any
            lastName = nameParts[nameParts.length - 1];
            if (nameParts.length > 2) {
              // Include middle name with first name
              firstName = nameParts.slice(0, -1).join(' ');
            }
          } else if (nameParts.length === 1) {
            firstName = nameParts[0];
            lastName = 'Patient';
          }
        }
      }
      
      // Use normalized date from OCR (already in YYYY-MM-DD format)
      let dateOfBirth = '1900-01-01'; // Default fallback
      const extractedDOB = extractedData.date_of_birth || extractedData.dob;
      
      if (extractedDOB && extractedDOB !== 'N/A' && extractedDOB !== null) {
        // OCR service already normalizes dates to YYYY-MM-DD
        dateOfBirth = extractedDOB;
      }
      
      // Normalize gender
      let gender = null;
      if (extractedData.gender) {
        const g = extractedData.gender.toUpperCase();
        if (g === 'M' || g.startsWith('MALE')) {
          gender = 'male';
        } else if (g === 'F' || g.startsWith('FEMALE')) {
          gender = 'female';
        } else {
          gender = 'other';
        }
      }
      
      // Clean phone number
      let phone = extractedData.phone || null;
      if (phone) {
        // Remove extra whitespace and formatting
        phone = phone.replace(/\s+/g, ' ').trim();
      }
      
      // Clean email
      let email = extractedData.email || null;
      if (email) {
        email = email.trim().toLowerCase();
      }
      
      // Clean address
      let address = extractedData.address || null;
      if (address) {
        // Remove excessive whitespace and newlines
        address = address.replace(/\s+/g, ' ').trim();
      }
      
      // Create patient record
      const patientId = Math.random().toString(36).substring(2, 11);
      
      console.log('Creating patient with data:', {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        email,
        address
      });
      
      await pool.query(`
        INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        patientId,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        email,
        address
      ]);

      // Extract notes - handle both string and array formats
      let notesText = null;
      if (formattedData.data && formattedData.data.additional_notes) {
        notesText = formattedData.data.additional_notes;
      } else if (formattedData.additional_notes && Array.isArray(formattedData.additional_notes)) {
        notesText = formattedData.additional_notes.map((note: any) => 
          typeof note === 'string' ? note : JSON.stringify(note)
        ).join('\n');
      }

      // Create medical chart record with better visit date handling
      const chartId = Math.random().toString(36).substring(2, 11);
      const visitDate = extractedData.visit_date || extractedData.date || new Date().toISOString().split('T')[0];
      
      await pool.query(`
        INSERT INTO medical_charts (
          id, patient_id, visit_date, document_type, diagnosis, 
          treatment_plan, notes, custom_fields, metadata, 
          confidence_score, raw_ocr_text, reviewed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        chartId,
        patientId,
        visitDate,
        'Patient Chart',
        extractedData.diagnosis || null,
        extractedData.treatment_plan || null,
        notesText,
        JSON.stringify(formattedData.data || {}),
        JSON.stringify({
          template_used: 'patient_chart',
          ocr_stats: ocrResult.stats,
          created_via: 'ai_upload_entry',
          extracted_fields: Object.keys(extractedData)
        }),
        ocrResult.stats.avg_confidence || 0,
        ocrResult.full_text,
        false
      ]);

      console.log(`✅ AI Upload Entry: Created patient ${patientId} and chart ${chartId}`);

      res.json({
        success: true,
        patient_id: patientId,
        chart_id: chartId,
        patient_data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          gender: gender,
          phone: phone,
          email: email,
          address: address
        },
        extracted_data: extractedData,
        stats: ocrResult.stats
      });
      
    } catch (error) {
      console.error("AI Upload Entry Error:", error);
      res.status(500).json({ 
        error: "Failed to create patient from document: " + (error as Error).message 
      });
    }
  });

  // Update Last Visit - MUST come BEFORE /api/patients/:id to avoid route conflict
  app.patch("/api/patients/:id/last-visit", authenticateToken, async (req, res) => {
    try {
      const patientId = req.params.id;
      const currentDate = new Date().toISOString().split('T')[0];
      
      console.log('=== UPDATE LAST VISIT REQUEST ===');
      console.log('Patient ID:', patientId);
      console.log('Current Date:', currentDate);
      console.log('User:', (req as any).user?.email);
      
      // Verify patient exists
      const patientCheck = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
      if (patientCheck.rows.length === 0) {
        console.error('Patient not found:', patientId);
        return res.status(404).json({ error: 'Patient not found' });
      }
      
      console.log('Patient found:', patientCheck.rows[0].first_name, patientCheck.rows[0].last_name);
      
      // Create a new medical chart entry with current date
      const chartId = Math.random().toString(36).substring(2, 11);
      console.log('Creating medical chart with ID:', chartId);
      
      await pool.query(`
        INSERT INTO medical_charts (
          id, patient_id, visit_date, document_type, 
          notes, reviewed, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        chartId,
        patientId,
        currentDate,
        'Visit Update',
        'Last visit date updated manually',
        true
      ]);

      console.log('✅ Medical chart created successfully');
      console.log('✅ Updated last visit for patient', patientId, 'to', currentDate);

      res.json({
        success: true,
        patient_id: patientId,
        last_visit_date: currentDate,
        chart_id: chartId
      });
      
    } catch (error) {
      console.error("=== UPDATE LAST VISIT ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", (error as Error).stack);
      res.status(500).json({ 
        error: "Failed to update last visit: " + (error as Error).message 
      });
    }
  });

  app.post("/api/patients", authenticateToken, async (req, res) => {
    const { first_name, last_name, date_of_birth, gender, phone, email, address } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    await pool.query(`
      INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, first_name, last_name, date_of_birth, gender, phone, email, address]);
    res.json({ id, first_name, last_name });
  });

  app.get("/api/patients/:id", authenticateToken, async (req, res) => {
    const patientRes = await pool.query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
    const patient = patientRes.rows[0];
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    const emrsRes = await pool.query("SELECT * FROM emrs WHERE patient_id = $1 ORDER BY visit_date DESC", [req.params.id]);
    const documentsRes = await pool.query("SELECT * FROM documents WHERE patient_id = $1 ORDER BY created_at DESC", [req.params.id]);
    
    res.json({ ...patient, emrs: emrsRes.rows, documents: documentsRes.rows });
  });

  app.put("/api/patients/:id", authenticateToken, async (req, res) => {
    const { first_name, last_name, date_of_birth, gender, phone, email, address } = req.body;
    
    try {
      await pool.query(`
        UPDATE patients 
        SET first_name = $1, last_name = $2, date_of_birth = $3, 
            gender = $4, phone = $5, email = $6, address = $7
        WHERE id = $8
      `, [first_name, last_name, date_of_birth, gender, phone, email, address, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", authenticateToken, async (req, res) => {
    await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  });

  // EMRs (Protected)
  app.post("/api/emrs", authenticateToken, async (req, res) => {
    const { patient_id, diagnosis, treatment_plan, notes, visit_date } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    await pool.query(`
      INSERT INTO emrs (id, patient_id, diagnosis, treatment_plan, notes, visit_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, patient_id, diagnosis, treatment_plan, notes, visit_date || new Date().toISOString().split('T')[0]]);
    res.json({ id });
  });

  // OCR Processing with Local Service (Protected)
  app.post("/api/process-document", authenticateToken, async (req, res) => {
    const { patient_id, imageData, template = 'general_visit' } = req.body;
    
    try {
      console.log(`Processing document for patient ${patient_id} with template ${template}`);
      
      // Validate inputs
      if (!patient_id) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }
      
      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      
      // Call local OCR service
      let ocrResponse;
      try {
        ocrResponse = await fetch('http://localhost:5000/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            template: template
          })
        });
      } catch (fetchError) {
        console.error("Failed to connect to OCR service:", fetchError);
        return res.status(503).json({ 
          error: 'OCR service is not available. Please ensure the OCR service is running on port 5000.' 
        });
      }

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error(`OCR service error (${ocrResponse.status}):`, errorText);
        
        let errorMessage = 'OCR service error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        return res.status(500).json({ 
          error: `OCR processing failed: ${errorMessage}` 
        });
      }

      const ocrResult = await ocrResponse.json();
      
      if (!ocrResult.success) {
        return res.status(400).json({ 
          error: ocrResult.error || 'OCR processing failed - no text extracted' 
        });
      }

      // Validate OCR result has text
      if (!ocrResult.full_text || !ocrResult.full_text.trim()) {
        return res.status(400).json({ 
          error: 'No text could be extracted from the image. Please ensure the image contains readable text.' 
        });
      }

      // Extract structured data from OCR result
      const formattedData = ocrResult.formatted_data;
      const extractedData = ocrResult.extracted_data;
      
      // Extract notes - handle both string and array formats
      let notesText = null;
      if (formattedData.data && formattedData.data.additional_notes) {
        notesText = formattedData.data.additional_notes;
      } else if (formattedData.additional_notes && Array.isArray(formattedData.additional_notes)) {
        notesText = formattedData.additional_notes.map((note: any) => 
          typeof note === 'string' ? note : JSON.stringify(note)
        ).join('\n');
      }
      
      // Create medical chart record
      const chartId = Math.random().toString(36).substring(2, 11);
      await pool.query(`
        INSERT INTO medical_charts (
          id, patient_id, visit_date, document_type, diagnosis, 
          treatment_plan, notes, custom_fields, metadata, 
          confidence_score, raw_ocr_text, reviewed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        chartId,
        patient_id,
        extractedData.date || new Date().toISOString().split('T')[0],
        formattedData.template_name || 'General Visit',
        extractedData.diagnosis || null,
        extractedData.treatment_plan || null,
        notesText,
        JSON.stringify(formattedData.data || {}),
        JSON.stringify({
          template_used: template,
          ocr_stats: ocrResult.stats,
          missing_fields: formattedData.missing_required_fields
        }),
        ocrResult.stats.avg_confidence || 0,
        ocrResult.full_text,
        false  // Needs human review
      ]);

      // Also create EMR record for compatibility
      const emrId = Math.random().toString(36).substring(2, 11);
      await pool.query(`
        INSERT INTO emrs (id, patient_id, diagnosis, treatment_plan, notes, visit_date)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        emrId,
        patient_id,
        extractedData.diagnosis || 'Pending Review',
        extractedData.treatment_plan || 'Pending Review',
        `OCR Extracted - Confidence: ${(ocrResult.stats.avg_confidence * 100).toFixed(1)}%\n\n${ocrResult.full_text}`,
        extractedData.date || new Date().toISOString().split('T')[0]
      ]);

      console.log(`✅ Successfully processed document - Chart ID: ${chartId}, EMR ID: ${emrId}`);

      res.json({
        success: true,
        chart_id: chartId,
        emr_id: emrId,
        extracted_data: extractedData,
        formatted_data: formattedData,
        stats: ocrResult.stats
      });
      
    } catch (error) {
      console.error("OCR Processing Error:", error);
      res.status(500).json({ 
        error: "Failed to process document: " + (error as Error).message 
      });
    }
  });

  // Get medical charts for a patient (Protected)
  app.get("/api/medical-charts/:patient_id", authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM medical_charts WHERE patient_id = $1 ORDER BY visit_date DESC, created_at DESC",
        [req.params.patient_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching medical charts:", error);
      res.status(500).json({ error: "Failed to fetch medical charts" });
    }
  });

  // Update medical chart (for review) (Protected)
  app.put("/api/medical-charts/:id", authenticateToken, async (req, res) => {
    const { diagnosis, treatment_plan, notes, custom_fields, reviewed, reviewer_notes } = req.body;
    
    try {
      await pool.query(`
        UPDATE medical_charts 
        SET diagnosis = $1, treatment_plan = $2, notes = $3, 
            custom_fields = $4, reviewed = $5, reviewer_notes = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [diagnosis, treatment_plan, notes, JSON.stringify(custom_fields), reviewed, reviewer_notes, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating medical chart:", error);
      res.status(500).json({ error: "Failed to update medical chart" });
    }
  });

  // Delete medical chart (Protected)
  app.delete("/api/medical-charts/:id", authenticateToken, async (req, res) => {
    try {
      await pool.query("DELETE FROM medical_charts WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medical chart:", error);
      res.status(500).json({ error: "Failed to delete medical chart" });
    }
  });

  // Get available OCR templates (Protected)
  app.get("/api/ocr/templates", authenticateToken, async (req, res) => {
    try {
      const response = await fetch('http://localhost:5000/templates');
      const templates = await response.json();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Check OCR service health (Protected)
  app.get("/api/ocr/health", authenticateToken, async (req, res) => {
    try {
      const response = await fetch('http://localhost:5000/health');
      const health = await response.json();
      res.json(health);
    } catch (error) {
      res.status(503).json({ 
        status: 'unavailable', 
        error: 'OCR service not reachable' 
      });
    }
  });

  // Chatbot Endpoint (Protected)
  app.post("/api/chat", authenticateToken, async (req, res) => {
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const patientsRes = await pool.query("SELECT first_name, last_name FROM patients");
      const patients = patientsRes.rows;
      
      const systemInstruction = `You are a medical administrative assistant for MediFlow AI. 
      Current patients in system: ${patients.map((p: any) => `${p.first_name} ${p.last_name}`).join(', ')}.
      Be professional, concise, and helpful.`;

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: history ? [...history, { role: 'user', parts: [{ text: message }] }] : [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction
        }
      });

      res.json({ text: result.text });
    } catch (error) {
      console.error("Chat AI Error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // Vite middleware for development
// --- Vite middleware for development ---
// Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } // This closes the IF/ELSE

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} // This closes the startServer() function

startServer();