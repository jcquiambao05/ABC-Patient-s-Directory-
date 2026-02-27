import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from 'pg';
const { Pool } = pkg;
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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

  // --- API Routes ---

  // Patients
  app.get("/api/patients", async (req, res) => {
    const result = await pool.query("SELECT * FROM patients ORDER BY created_at DESC");
    res.json(result.rows);
  });

  app.post("/api/patients", async (req, res) => {
    const { first_name, last_name, date_of_birth, gender, phone, email, address } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    await pool.query(`
      INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, first_name, last_name, date_of_birth, gender, phone, email, address]);
    res.json({ id, first_name, last_name });
  });

  app.get("/api/patients/:id", async (req, res) => {
    const patientRes = await pool.query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
    const patient = patientRes.rows[0];
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    const emrsRes = await pool.query("SELECT * FROM emrs WHERE patient_id = $1 ORDER BY visit_date DESC", [req.params.id]);
    const documentsRes = await pool.query("SELECT * FROM documents WHERE patient_id = $1 ORDER BY created_at DESC", [req.params.id]);
    
    res.json({ ...patient, emrs: emrsRes.rows, documents: documentsRes.rows });
  });

  app.delete("/api/patients/:id", async (req, res) => {
    await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  });

  // EMRs
  app.post("/api/emrs", async (req, res) => {
    const { patient_id, diagnosis, treatment_plan, notes, visit_date } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    await pool.query(`
      INSERT INTO emrs (id, patient_id, diagnosis, treatment_plan, notes, visit_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, patient_id, diagnosis, treatment_plan, notes, visit_date || new Date().toISOString().split('T')[0]]);
    res.json({ id });
  });

  // AI OCR & EMR Generation
  app.post("/api/process-document", async (req, res) => {
    const { patient_id, imageData, mimeType } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });

      const prompt = `
        You are a medical OCR assistant. Extract information from this medical document image.
        Provide a structured JSON response with the following fields:
        - document_type: (e.g., Prescription, Lab Result, Referral)
        - diagnosis: (if present)
        - treatment_plan: (if present)
        - notes: (summary of the document)
        - date: (date of the document if found, YYYY-MM-DD)
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          { text: prompt },
          {
            inlineData: {
              data: imageData.split(',')[1],
              mimeType: mimeType
            }
          }
        ]
      });

      const responseText = result.text;
      if (!responseText) throw new Error("No response from Gemini");

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const docId = Math.random().toString(36).substr(2, 9);
      await pool.query(`
        INSERT INTO documents (id, patient_id, file_url, extracted_text, document_type, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [docId, patient_id, imageData, responseText, extractedData.document_type || 'Unknown', 'processed']);

      if (extractedData.diagnosis || extractedData.treatment_plan) {
        const emrId = Math.random().toString(36).substr(2, 9);
        await pool.query(`
          INSERT INTO emrs (id, patient_id, diagnosis, treatment_plan, notes, visit_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          emrId, 
          patient_id, 
          extractedData.diagnosis || 'Extracted from document', 
          extractedData.treatment_plan || '', 
          `AI Generated from ${extractedData.document_type}. ${extractedData.notes || ''}`,
          extractedData.date || new Date().toISOString().split('T')[0]
        ]);
      }

      res.json({ success: true, data: extractedData });
    } catch (error) {
      console.error("AI Processing Error:", error);
      res.status(500).json({ error: "Failed to process document with AI: " + (error as Error).message });
    }
  });

  // Chatbot Endpoint
  app.post("/api/chat", async (req, res) => {
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