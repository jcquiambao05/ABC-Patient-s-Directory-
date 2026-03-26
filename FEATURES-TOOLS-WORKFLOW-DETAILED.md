# ABC Patient Directory System
## Features, Tools, and Workflows - Detailed Documentation

---

## TABLE OF CONTENTS

1. [Patient Directory Management](#feature-1-patient-directory-management)
2. [AI Upload Entry (OCR-Based Patient Creation)](#feature-2-ai-upload-entry-ocr-based-patient-creation)
3. [Medical Chart Processing](#feature-3-medical-chart-processing)
4. [AI Health Assistant (Chatbot)](#feature-4-ai-health-assistant-chatbot)
5. [Authentication & Security](#feature-5-authentication--security)
6. [Patient Record Management](#feature-6-patient-record-management)
7. [Last Visit Tracking](#feature-7-last-visit-tracking)

---

## FEATURE 1: Patient Directory Management

### Feature Description
A centralized, searchable directory of all patients organized by cabinet (A-Z by last name). Staff can quickly find any patient, view their basic information, and access their complete medical records.

### Tools Used

#### 1. React (v18.3.1)
- **What it is:** A JavaScript library for building user interfaces
- **Purpose in this feature:** Creates the interactive patient directory interface
- **Why we use it:** Provides fast, responsive UI updates when searching and filtering patients
- **Specific use:** Renders patient cards, handles search input, manages component state

#### 2. TypeScript (v5.9.3)
- **What it is:** JavaScript with type safety
- **Purpose in this feature:** Ensures data consistency and prevents errors
- **Why we use it:** Catches bugs during development, provides autocomplete for patient data
- **Specific use:** Defines Patient interface, ensures correct data types for all patient fields

#### 3. Tailwind CSS (v4.2.1)
- **What it is:** Utility-first CSS framework
- **Purpose in this feature:** Styles the patient directory interface
- **Why we use it:** Rapid UI development with consistent design
- **Specific use:** Creates patient cards, cabinet headers, search box styling

#### 4. Lucide React (v0.454.0)
- **What it is:** Icon library with 1000+ icons
- **Purpose in this feature:** Provides visual icons for better UX
- **Why we use it:** Lightweight, tree-shakeable icons
- **Specific use:** Search icon, phone icon, email icon, calendar icon

#### 5. PostgreSQL (v14+)
- **What it is:** Relational database management system
- **Purpose in this feature:** Stores all patient records permanently
- **Why we use it:** Reliable, ACID-compliant, supports complex queries
- **Specific use:** Stores patients table with demographics and contact information

#### 6. Express.js (v4.22.1)
- **What it is:** Web framework for Node.js
- **Purpose in this feature:** Handles API requests from frontend
- **Why we use it:** Simple, flexible, widely-used backend framework
- **Specific use:** Creates GET /api/patients endpoint to fetch patient list

#### 7. pg (Node-Postgres) (v8.18.0)
- **What it is:** PostgreSQL client for Node.js
- **Purpose in this feature:** Connects backend to database
- **Why we use it:** Official PostgreSQL driver, connection pooling
- **Specific use:** Executes SQL queries to retrieve patient data

### Detailed Workflow

#### Step 1: User Opens Patient Directory
```
User Action: Clicks "Patient Directory" in sidebar
↓
Frontend (React):
- Renders PatientDirectory component
- Displays loading state
- Calls fetchPatients() function
↓
API Request:
- GET /api/patients
- Headers: Authorization: Bearer <JWT_TOKEN>
↓
Backend (Express):
- Receives request at /api/patients route
- Validates JWT token (authenticateToken middleware)
- If valid, proceeds to database query
↓
Database (PostgreSQL):
- Executes SQL query:
  SELECT p.*, 
    (SELECT visit_date FROM medical_charts 
     WHERE patient_id = p.id 
     ORDER BY visit_date DESC LIMIT 1) as last_visit_date
  FROM patients p 
  ORDER BY p.created_at DESC
- Returns array of patient records
↓
Backend Response:
- Formats data as JSON
- Sends response: [{id, first_name, last_name, ...}, ...]
↓
Frontend (React):
- Receives patient array
- Updates state: setPatients(data)
- Groups patients by cabinet (first letter of last name)
- Renders patient cards organized by cabinet
```

#### Step 2: User Searches for Patient
```
User Action: Types "John" in search box
↓
Frontend (React):
- onChange event fires on input
- Updates searchQuery state: setSearchQuery("John")
- Filters patients array in real-time:
  filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes("john")
  )
- Re-renders only matching patients
- No API call needed (client-side filtering)
↓
Display:
- Shows only patients with "John" in their name
- Updates cabinet grouping dynamically
- Highlights matching results
```

#### Step 3: User Clicks on Patient
```
User Action: Clicks on "Doe, John" patient card
↓
Frontend (React):
- onClick event fires
- Calls fetchPatientDetails(patient.id)
↓
API Request:
- GET /api/patients/{id}
- Headers: Authorization: Bearer <JWT_TOKEN>
↓
Backend (Express):
- Receives request at /api/patients/:id route
- Validates JWT token
- Extracts patient ID from URL parameter
↓
Database (PostgreSQL):
- Query 1: Get patient details
  SELECT * FROM patients WHERE id = $1
- Query 2: Get medical charts
  SELECT * FROM medical_charts WHERE patient_id = $1 
  ORDER BY visit_date DESC
- Query 3: Get EMRs
  SELECT * FROM emrs WHERE patient_id = $1 
  ORDER BY visit_date DESC
↓
Backend Response:
- Combines all data into single object
- Returns: {patient_info, medical_charts[], emrs[]}
↓
Frontend (React):
- Updates selectedPatient state
- Updates patientDetails state
- Renders patient details panel
- Shows demographics, contact info, medical history
```

### Data Flow Diagram
```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ HTTP GET /api/patients
       │ Authorization: Bearer token
       ↓
┌─────────────┐
│   Express   │
│   Server    │
└──────┬──────┘
       │ SQL Query
       │ SELECT * FROM patients
       ↓
┌─────────────┐
│ PostgreSQL  │
│  Database   │
└──────┬──────┘
       │ Patient Records
       ↓
┌─────────────┐
│   Express   │
│  (Format)   │
└──────┬──────┘
       │ JSON Response
       ↓
┌─────────────┐
│   React     │
│  (Display)  │
└─────────────┘
```

---

## FEATURE 2: AI Upload Entry (OCR-Based Patient Creation)

### Feature Description
Automatically creates a new patient record by uploading a photo of their medical chart. The system reads the chart using OCR technology, extracts patient information, validates it, and creates the patient record without manual data entry.

### Tools Used

#### 1. Tesseract OCR (v5.x)
- **What it is:** Open-source Optical Character Recognition engine
- **Purpose in this feature:** Reads text from medical chart images
- **Why we use it:** Industry-standard, free, supports 100+ languages, 85-95% accuracy
- **Specific use:** Extracts raw text from uploaded medical chart photos

#### 2. Python (v3.x)
- **What it is:** Programming language
- **Purpose in this feature:** Runs the OCR service
- **Why we use it:** Best ecosystem for image processing and OCR
- **Specific use:** Hosts Flask server, processes images with PIL, runs Tesseract

#### 3. Flask (v3.x)
- **What it is:** Lightweight Python web framework
- **Purpose in this feature:** Creates OCR API service
- **Why we use it:** Simple, perfect for microservices
- **Specific use:** Exposes /process endpoint for OCR requests

#### 4. Pillow (PIL) (v10.x)
- **What it is:** Python image processing library
- **Purpose in this feature:** Handles image manipulation
- **Why we use it:** Industry standard for Python image processing
- **Specific use:** Opens images, converts formats, prepares for Tesseract

#### 5. pytesseract (v0.3.x)
- **What it is:** Python wrapper for Tesseract OCR
- **Purpose in this feature:** Bridges Python and Tesseract
- **Why we use it:** Simplifies Tesseract integration
- **Specific use:** Calls Tesseract with custom configurations

#### 6. Regular Expressions (Regex)
- **What it is:** Pattern matching language
- **Purpose in this feature:** Extracts structured data from OCR text
- **Why we use it:** Powerful pattern matching for names, dates, phone numbers
- **Specific use:** Patterns like `Name\s*:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)`

#### 7. Custom 11-Layer Validation System
- **What it is:** Custom Python validation pipeline
- **Purpose in this feature:** Ensures extracted data quality
- **Why we use it:** Prevents false positives like "Patient, N/A"
- **Specific use:** Validates patient names through 11 checks

#### 8. Base64 Encoding
- **What it is:** Binary-to-text encoding scheme
- **Purpose in this feature:** Transmits images over HTTP
- **Why we use it:** Standard way to send images in JSON
- **Specific use:** Converts image file to base64 string for API transmission

### Detailed Workflow

#### Step 1: User Uploads Medical Chart Image
```
User Action: Clicks "AI Upload Entry" button
↓
Frontend (React):
- Opens modal with file upload interface
- User selects image file (JPEG/PNG)
↓
JavaScript FileReader API:
- Reads file as Data URL
- Converts to base64 string
- Format: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
↓
Frontend State:
- Stores base64 string in memory
- Shows preview of image
- Enables "Upload" button
```

#### Step 2: Frontend Sends Image to Backend
```
User Action: Clicks "Upload" button
↓
Frontend (React):
- Shows processing indicator
- Prepares API request
↓
API Request:
- POST /api/patients/ai-create
- Headers: 
  - Authorization: Bearer <JWT_TOKEN>
  - Content-Type: application/json
- Body: {
    imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
↓
Backend (Express):
- Receives request at /api/patients/ai-create route
- Validates JWT token
- Extracts imageData from request body
- Prepares to forward to OCR service
```

#### Step 3: Backend Forwards to OCR Service
```
Backend (Express):
- Makes internal HTTP request
↓
API Request to OCR Service:
- POST http://localhost:5000/process
- Headers: Content-Type: application/json
- Body: {
    image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    template: "patient_chart"
  }
↓
OCR Service (Python Flask):
- Receives request at /process endpoint
- Validates image data exists
- Begins processing
```

#### Step 4: OCR Processing
```
OCR Service (Python):

Step 4a: Image Decoding
- Splits base64 string: image_data.split(',')[1]
- Decodes base64 to bytes: base64.b64decode(image_data)
- Creates PIL Image object: Image.open(BytesIO(image_bytes))
- Converts to RGB if needed: image.convert('RGB')

Step 4b: Tesseract Extraction
- Configures Tesseract: '--oem 3 --psm 6'
  - OEM 3: Default OCR Engine Mode
  - PSM 6: Assume uniform block of text
- Calls Tesseract: pytesseract.image_to_string(image, config=custom_config)
- Returns raw text string

Example Output:
"PATIENT MEDICAL CHART
Name: Emily Chen        Gender: F
DOB: 03/15/1988
Email: echen@email.com
Phone: (555) 123-4567
Address: 123 Maple Ave, Springfield, IL 62701
..."

Step 4c: Pattern Matching
- Loads extraction rules from medical_chart_templates.json
- Applies regex patterns to extract fields:

Pattern for Name:
  r"Name\s*[:\|]\s*([A-Z][a-z]+\s+[A-Z][a-z]+)"
  Matches: "Name: Emily Chen" → Extracts: "Emily Chen"

Pattern for DOB:
  r"DOB\s*[:\|]\s*(\d{1,2}/\d{1,2}/\d{4})"
  Matches: "DOB: 03/15/1988" → Extracts: "03/15/1988"

Pattern for Gender:
  r"Gender\s*[:\|]\s*(Male|Female|M|F)"
  Matches: "Gender: F" → Extracts: "F"

Pattern for Phone:
  r"Phone\s*[:\|]\s*([\d\s\-\(\)]+)"
  Matches: "Phone: (555) 123-4567" → Extracts: "(555) 123-4567"

Pattern for Email:
  r"Email\s*[:\|]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
  Matches: "Email: echen@email.com" → Extracts: "echen@email.com"

Step 4d: 11-Layer Validation (for patient_name)
Layer 1: Exact match rejection
  - Check if "emily chen" in ['n/a', 'patient', 'name']
  - Result: PASS

Layer 2: Contains "n/a" check
  - Check if 'n/a' in "emily chen"
  - Result: PASS

Layer 3: Form indicator detection
  - Check if ':', '|', '___' in "Emily Chen"
  - Result: PASS

Layer 4: Word count validation
  - Split: ["Emily", "Chen"] → 2 words
  - Minimum: 2 words required
  - Result: PASS

Layer 5: First word validation
  - First word: "emily"
  - Check if in INVALID_FIRST_WORDS
  - Result: PASS

Layer 6: Invalid word detection
  - Check each word: "emily", "chen"
  - Neither is 'n/a', 'na', 'none', 'unknown'
  - Result: PASS

Layer 7: Capitalization check
  - First character: "E" is uppercase
  - Result: PASS

Layer 8: Proper name format
  - Each word starts with capital: "Emily", "Chen"
  - Result: PASS

Layer 9: Character validation (CRITICAL)
  - Allowed: letters, spaces, hyphens, apostrophes, periods
  - "Emily Chen" contains only: E,m,i,l,y, ,C,h,e,n
  - All characters valid
  - Result: PASS
  
  Example rejection: "Patient, N/A"
  - Contains comma: ','
  - Result: REJECT - "contains invalid characters: [',']"

Layer 10: Length validation
  - "Emily Chen" = 10 characters
  - Maximum: 50 characters
  - Result: PASS

Layer 11: Word length validation
  - "Emily" = 5 chars (valid: 2-20)
  - "Chen" = 4 chars (valid: 2-20)
  - Result: PASS

Final Result: ✅ VALID - "Emily Chen" accepted

Step 4e: Data Normalization
- Date normalization:
  Input: "03/15/1988"
  Process: datetime.strptime(date_str, '%m/%d/%Y')
  Output: "1988-03-15" (YYYY-MM-DD format)

- Gender normalization:
  Input: "F"
  Process: if g == 'F': gender = 'female'
  Output: "female"

- Phone cleaning:
  Input: "(555) 123-4567"
  Process: phone.replace(/\s+/g, ' ').trim()
  Output: "(555) 123-4567"

Step 4f: Response Preparation
- Compile extracted data:
  {
    "patient_name": "Emily Chen",
    "date_of_birth": "1988-03-15",
    "gender": "female",
    "phone": "(555) 123-4567",
    "email": "echen@email.com",
    "address": "123 Maple Ave, Springfield, IL 62701"
  }
- Add metadata:
  {
    "success": true,
    "full_text": "PATIENT MEDICAL CHART\nName: Emily Chen...",
    "extracted_data": {...},
    "stats": {
      "avg_confidence": 0.90,
      "ocr_engine": "tesseract"
    }
  }
```

#### Step 5: Backend Creates Patient Record
```
Backend (Express):
- Receives OCR response
- Parses extracted data

Name Parsing:
- Input: "Emily Chen"
- Split by space: ["Emily", "Chen"]
- first_name = "Emily"
- last_name = "Chen"

Database Insert:
- Generate patient ID: Math.random().toString(36).substring(2, 11)
- Example ID: "a1b2c3d4e"

SQL Query:
INSERT INTO patients (
  id, first_name, last_name, date_of_birth, 
  gender, phone, email, address
) VALUES (
  'a1b2c3d4e', 'Emily', 'Chen', '1988-03-15',
  'female', '(555) 123-4567', 'echen@email.com', 
  '123 Maple Ave, Springfield, IL 62701'
)

Medical Chart Record:
- Generate chart ID: "m5n6o7p8q"
- Store raw OCR text for reference

SQL Query:
INSERT INTO medical_charts (
  id, patient_id, visit_date, document_type,
  raw_ocr_text, confidence_score, reviewed
) VALUES (
  'm5n6o7p8q', 'a1b2c3d4e', '2024-03-15', 'Patient Chart',
  'PATIENT MEDICAL CHART\nName: Emily Chen...', 0.90, false
)
```

#### Step 6: Frontend Displays Result
```
Backend Response:
- Status: 200 OK
- Body: {
    "success": true,
    "patient_id": "a1b2c3d4e",
    "patient_data": {
      "first_name": "Emily",
      "last_name": "Chen",
      ...
    }
  }
↓
Frontend (React):
- Closes upload modal
- Shows success message: "Patient created successfully!"
- Refreshes patient list: fetchPatients()
- New patient appears in directory
- Optionally opens patient details: fetchPatientDetails(patient_id)
```

### Complete Data Flow
```
┌──────────────┐
│   Browser    │
│ (File Upload)│
└──────┬───────┘
       │ Image File
       ↓
┌──────────────┐
│  FileReader  │
│ (Base64)     │
└──────┬───────┘
       │ POST /api/patients/ai-create
       │ {imageData: "base64..."}
       ↓
┌──────────────┐
│   Express    │
│   Backend    │
└──────┬───────┘
       │ POST http://localhost:5000/process
       │ {image: "base64...", template: "patient_chart"}
       ↓
┌──────────────┐
│ Python Flask │
│ OCR Service  │
└──────┬───────┘
       │ 1. Decode base64
       │ 2. PIL Image processing
       ↓
┌──────────────┐
│  Tesseract   │
│     OCR      │
└──────┬───────┘
       │ Raw text
       ↓
┌──────────────┐
│    Regex     │
│  Extraction  │
└──────┬───────┘
       │ Structured data
       ↓
┌──────────────┐
│  11-Layer    │
│  Validation  │
└──────┬───────┘
       │ Validated data
       ↓
┌──────────────┐
│   Express    │
│  (Create DB) │
└──────┬───────┘
       │ INSERT INTO patients
       ↓
┌──────────────┐
│ PostgreSQL   │
│   Database   │
└──────┬───────┘
       │ Success response
       ↓
┌──────────────┐
│    React     │
│  (Display)   │
└──────────────┘
```


## FEATURE 3: Medical Chart Processing

### Feature Description
Upload medical documents (charts, lab results, prescriptions) for existing patients and automatically extract structured data using AI OCR. The system reads the document, extracts diagnosis, treatment plans, medications, and notes, then stores them in a reviewable format.

### Tools Used

#### 1. Same OCR Stack as Feature 2
- Tesseract OCR, Python Flask, Pillow, pytesseract
- Same 11-layer validation system
- Same regex extraction patterns

#### 2. Medical Chart Templates (medical_chart_templates.json)
- **What it is:** JSON configuration file with extraction rules
- **Purpose in this feature:** Defines what data to extract from different document types
- **Why we use it:** Flexible, customizable extraction without code changes
- **Specific use:** Contains regex patterns for diagnosis, treatment, medications, vitals

#### 3. PostgreSQL medical_charts Table
- **What it is:** Database table for OCR-extracted medical data
- **Purpose in this feature:** Stores structured medical chart data
- **Why we use it:** Separates AI-extracted data from manually entered EMRs
- **Specific use:** Stores diagnosis, treatment_plan, notes, custom_fields, confidence_score, reviewed status

### Detailed Workflow

#### Step 1: User Selects Patient and Uploads Document
```
User Action: Opens patient details, clicks "AI Upload" button
↓
Frontend Modal: Shows template selection
- Default: "Patient Chart"
- Alternative: "Custom Template"
↓
User Action: Selects file (JPEG/PNG/PDF)
↓
FileReader API: Converts to base64
↓
API Request:
- POST /api/process-document
- Body: {
    patient_id: "a1b2c3d4e",
    imageData: "data:image/jpeg;base64,...",
    template: "patient_chart"
  }
```

#### Step 2: Backend Processes Document
```
Backend (Express):
- Validates patient_id exists
- Validates imageData present
- Forwards to OCR service
↓
OCR Service Call:
- POST http://localhost:5000/process
- Body: {image: base64, template: "patient_chart"}
↓
OCR Processing: (Same as Feature 2)
- Decode base64
- Tesseract extraction
- Regex pattern matching
- 11-layer validation
- Data normalization
↓
OCR Response: {
  success: true,
  full_text: "...",
  extracted_data: {
    date: "2024-03-15",
    diagnosis: "Hypertension",
    treatment_plan: "Lisinopril 10mg daily",
    ...
  },
  stats: {avg_confidence: 0.88}
}
```

#### Step 3: Database Storage
```
Backend Creates Two Records:

1. Medical Chart (Primary):
SQL:
INSERT INTO medical_charts (
  id, patient_id, visit_date, document_type,
  diagnosis, treatment_plan, notes, custom_fields,
  metadata, confidence_score, raw_ocr_text, reviewed
) VALUES (
  'm5n6o7p8q', 'a1b2c3d4e', '2024-03-15', 'Patient Chart',
  'Hypertension', 'Lisinopril 10mg daily', 'Follow up in 2 weeks',
  '{"blood_pressure": "140/90", "heart_rate": "78"}',
  '{"template_used": "patient_chart", "ocr_stats": {...}}',
  0.88, 'MEDICAL CHART\nDate: 03/15/2024...', false
)

2. EMR (Legacy Compatibility):
SQL:
INSERT INTO emrs (
  id, patient_id, diagnosis, treatment_plan, notes, visit_date
) VALUES (
  'e9f8g7h6i', 'a1b2c3d4e', 'Hypertension',
  'Lisinopril 10mg daily',
  'OCR Extracted - Confidence: 88.0%\n\nMEDICAL CHART\nDate: 03/15/2024...',
  '2024-03-15'
)
```

#### Step 4: Frontend Displays Result
```
Backend Response:
{
  success: true,
  chart_id: "m5n6o7p8q",
  emr_id: "e9f8g7h6i",
  extracted_data: {...},
  stats: {avg_confidence: 0.88}
}
↓
Frontend:
- Closes upload modal
- Shows success message
- Refreshes patient details: fetchPatientDetails(patient_id)
- Displays new medical chart with "Needs Review" badge
```

#### Step 5: Human Review Process
```
User Action: Clicks "Review" button on medical chart
↓
Review Modal Opens:
- Shows all extracted fields (editable)
- Visit Date: [2024-03-15]
- Document Type: [Patient Chart]
- Diagnosis: [Hypertension]
- Treatment Plan: [Lisinopril 10mg daily]
- Notes: [Follow up in 2 weeks]
- Reviewer Notes: [Add corrections here]
- Raw OCR Text: [Read-only original text]
↓
User Action: Edits fields, adds reviewer notes, clicks "Save & Mark Reviewed"
↓
API Request:
- PUT /api/medical-charts/m5n6o7p8q
- Body: {
    diagnosis: "Essential Hypertension (I10)",
    treatment_plan: "Lisinopril 10mg PO daily, low sodium diet",
    notes: "Follow up in 2 weeks for BP check",
    reviewed: true,
    reviewer_notes: "Added ICD-10 code, clarified dosage"
  }
↓
Database Update:
UPDATE medical_charts 
SET diagnosis = $1, treatment_plan = $2, notes = $3,
    reviewed = $4, reviewer_notes = $5,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'm5n6o7p8q'
↓
Frontend:
- Badge changes from "Needs Review" to "Reviewed"
- Shows green checkmark icon
```

### Data Flow Diagram
```
┌──────────────┐
│   Patient    │
│   Details    │
└──────┬───────┘
       │ Click "AI Upload"
       ↓
┌──────────────┐
│ File Upload  │
│   Modal      │
└──────┬───────┘
       │ Select file
       ↓
┌──────────────┐
│  FileReader  │
│  (Base64)    │
└──────┬───────┘
       │ POST /api/process-document
       ↓
┌──────────────┐
│   Express    │
│   Backend    │
└──────┬───────┘
       │ Forward to OCR
       ↓
┌──────────────┐
│ OCR Service  │
│ (Tesseract)  │
└──────┬───────┘
       │ Extracted data
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (2 inserts)  │
└──────┬───────┘
       │ Success
       ↓
┌──────────────┐
│   React UI   │
│ (Show chart) │
└──────┬───────┘
       │ User reviews
       ↓
┌──────────────┐
│ Review Modal │
│ (Edit data)  │
└──────┬───────┘
       │ PUT /api/medical-charts/:id
       ↓
┌──────────────┐
│  PostgreSQL  │
│   (Update)   │
└──────────────┘
```

---

## FEATURE 4: AI Health Assistant (Chatbot)

### Feature Description
An intelligent chatbot powered by Google Gemini AI that answers questions about patients, medical records, and clinic operations. The assistant has access to the patient database and can provide information about patient records, appointments, and general medical administrative queries.

### Tools Used

#### 1. Google Gemini 1.5 Flash (@google/genai v1.42.0)
- **What it is:** Google's latest generative AI model
- **Purpose in this feature:** Powers the conversational AI assistant
- **Why we use it:** Fast responses, context-aware, supports long conversations, free tier available
- **Specific use:** Processes user questions and generates helpful responses

#### 2. GEMINI_API_KEY (Environment Variable)
- **What it is:** Authentication key for Google AI API
- **Purpose in this feature:** Authenticates requests to Gemini API
- **Why we use it:** Required for API access, keeps credentials secure
- **Specific use:** Stored in .env file, loaded via dotenv

#### 3. Chat History Management (React State)
- **What it is:** Array of message objects in component state
- **Purpose in this feature:** Maintains conversation context
- **Why we use it:** Allows AI to reference previous messages
- **Specific use:** Stores [{role: 'user', text: '...'}, {role: 'model', text: '...'}]

#### 4. System Instructions (Context Injection)
- **What it is:** Prepended instructions for the AI model
- **Purpose in this feature:** Gives AI context about the clinic and patients
- **Why we use it:** Makes responses more relevant and accurate
- **Specific use:** Includes current patient list, clinic name, role definition

### Detailed Workflow

#### Step 1: User Opens Chat Interface
```
User Action: Clicks "Health Assistant" in sidebar
↓
Frontend (React):
- Sets activeTab to 'chat'
- Renders chat interface
- Shows initial greeting message:
  "Hello! I am your ABC Patient Directory assistant. 
   How can I help you with patient records today?"
- Displays chat input box
```

#### Step 2: User Sends Message
```
User Action: Types "Who is John Doe?" and presses Enter
↓
Frontend (React):
- Adds user message to chatMessages state:
  setChatMessages([...prev, {role: 'user', text: 'Who is John Doe?'}])
- Clears input field: setChatInput('')
- Displays user message in chat (right-aligned, green bubble)
↓
API Request:
- POST /api/chat
- Headers: Authorization: Bearer <JWT_TOKEN>
- Body: {
    message: "Who is John Doe?",
    history: [
      {role: 'model', parts: [{text: 'Hello! I am...'}]},
      {role: 'user', parts: [{text: 'Who is John Doe?'}]}
    ]
  }
```

#### Step 3: Backend Processes Request
```
Backend (Express):
- Receives request at /api/chat route
- Validates JWT token (authenticateToken middleware)
- Extracts message and history from body
↓
Database Query:
- Fetches current patient list:
  SELECT first_name, last_name FROM patients
- Result: [{first_name: 'John', last_name: 'Doe'}, ...]
↓
System Instruction Creation:
systemInstruction = `
You are a medical administrative assistant for ABC Patient Directory.
Current patients in system: John Doe, Jane Smith, Emily Chen, ...
Be professional, concise, and helpful.
`
↓
Gemini API Call:
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const result = await genAI.models.generateContent({
  model: "gemini-1.5-flash",
  contents: [
    ...history,
    {role: 'user', parts: [{text: 'Who is John Doe?'}]}
  ],
  config: {
    systemInstruction: systemInstruction
  }
});
↓
Gemini Response:
"John Doe is a patient in the ABC Patient Directory system. 
 To view detailed information about John Doe, please search 
 for him in the Patient Directory tab."
```

#### Step 4: Frontend Displays Response
```
Backend Response:
{
  text: "John Doe is a patient in the ABC Patient Directory system..."
}
↓
Frontend (React):
- Adds AI response to chatMessages state:
  setChatMessages([...prev, {role: 'model', text: response.text}])
- Displays AI message in chat (left-aligned, gray bubble)
- Scrolls to bottom of chat
- Re-enables input field
```

#### Step 5: Conversation Continues
```
User: "What was his last visit date?"
↓
Frontend sends full history:
{
  message: "What was his last visit date?",
  history: [
    {role: 'model', parts: [{text: 'Hello! I am...'}]},
    {role: 'user', parts: [{text: 'Who is John Doe?'}]},
    {role: 'model', parts: [{text: 'John Doe is a patient...'}]},
    {role: 'user', parts: [{text: 'What was his last visit date?'}]}
  ]
}
↓
Gemini uses conversation context to understand "his" refers to John Doe
↓
AI Response: "I don't have access to specific visit dates in this chat. 
Please check John Doe's patient record in the Patient Directory 
for his last visit information."
```

### Example Conversations

#### Example 1: Patient Lookup
```
User: "Do we have a patient named Emily Chen?"
AI: "Yes, Emily Chen is a patient in the ABC Patient Directory system."

User: "What can you tell me about her?"
AI: "I can confirm Emily Chen is registered in our system. For detailed 
     medical information, please access her patient record in the 
     Patient Directory tab where you can view her demographics, 
     contact information, and medical history."
```

#### Example 2: General Questions
```
User: "How do I upload a medical chart?"
AI: "To upload a medical chart:
     1. Select a patient from the Patient Directory
     2. Click the 'AI Upload' button in their medical records section
     3. Choose the document template (usually 'Patient Chart')
     4. Upload the image file
     5. The AI will automatically extract and structure the data
     6. Review and confirm the extracted information"
```

#### Example 3: Error Handling
```
User: "Delete all patients"
AI: "I cannot perform database operations or delete records. 
     I'm here to provide information and guidance. For patient 
     management tasks, please use the appropriate features in 
     the Patient Directory interface."
```

### Data Flow Diagram
```
┌──────────────┐
│   User       │
│  (Types msg) │
└──────┬───────┘
       │ "Who is John Doe?"
       ↓
┌──────────────┐
│   React      │
│ (Add to UI)  │
└──────┬───────┘
       │ POST /api/chat
       │ {message, history}
       ↓
┌──────────────┐
│   Express    │
│   Backend    │
└──────┬───────┘
       │ SELECT patients
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (Patient list)│
└──────┬───────┘
       │ Patient names
       ↓
┌──────────────┐
│   Express    │
│ (Build prompt)│
└──────┬───────┘
       │ API call with context
       ↓
┌──────────────┐
│ Google Gemini│
│ 1.5 Flash API│
└──────┬───────┘
       │ AI response
       ↓
┌──────────────┐
│   Express    │
│ (Format JSON)│
└──────┬───────┘
       │ {text: "..."}
       ↓
┌──────────────┐
│   React      │
│ (Display msg)│
└──────────────┘
```

---

## FEATURE 5: Authentication & Security

### Feature Description
Secure user authentication system using JWT (JSON Web Tokens) with email/password login. Protects all API endpoints and ensures only authenticated users can access patient data. Includes session management and automatic token validation.

### Tools Used

#### 1. JSON Web Tokens - JWT (jsonwebtoken v9.0.3)
- **What it is:** Industry-standard token-based authentication
- **Purpose in this feature:** Creates and verifies secure authentication tokens
- **Why we use it:** Stateless, scalable, works across devices, includes expiration
- **Specific use:** Signs tokens with secret key, verifies tokens on each request

#### 2. bcrypt (v6.0.0)
- **What it is:** Password hashing library
- **Purpose in this feature:** Securely hashes and compares passwords
- **Why we use it:** Industry standard, slow by design (prevents brute force), salted hashes
- **Specific use:** Hashes passwords before storage, compares during login

#### 3. JWT_SECRET (Environment Variable)
- **What it is:** Secret key for signing JWT tokens
- **Purpose in this feature:** Ensures tokens cannot be forged
- **Why we use it:** Cryptographic security, only server knows the secret
- **Specific use:** Stored in .env file, used by jwt.sign() and jwt.verify()

#### 4. localStorage (Browser API)
- **What it is:** Browser storage for persistent data
- **Purpose in this feature:** Stores JWT token on client side
- **Why we use it:** Persists across page refreshes, accessible to JavaScript
- **Specific use:** Stores token as 'mediflow_auth_token'

#### 5. Express Middleware (authenticateToken)
- **What it is:** Custom middleware function
- **Purpose in this feature:** Protects API routes from unauthorized access
- **Why we use it:** Centralized authentication logic, applied to all protected routes
- **Specific use:** Validates JWT token before allowing request to proceed

#### 6. PostgreSQL users Table
- **What it is:** Database table storing user credentials
- **Purpose in this feature:** Stores user accounts with hashed passwords
- **Why we use it:** Persistent user storage, secure password management
- **Specific use:** Stores id, email, password_hash, created_at

### Detailed Workflow

#### Step 1: User Registration (One-Time Setup)
```
Admin Action: Creates user account via database
↓
Password Hashing:
const bcrypt = require('bcrypt');
const saltRounds = 10;
const password = 'userPassword123';
const hash = await bcrypt.hash(password, saltRounds);
// Result: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
↓
Database Insert:
INSERT INTO users (id, email, password_hash, created_at)
VALUES (
  'u1a2b3c4d',
  'doctor@abcclinic.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  CURRENT_TIMESTAMP
)
```

#### Step 2: User Login
```
User Action: Opens app, sees login screen
↓
User Input:
- Email: doctor@abcclinic.com
- Password: userPassword123
↓
Frontend (React):
- Captures form submission
- Prevents default form action
↓
API Request:
- POST /api/auth/login
- Headers: Content-Type: application/json
- Body: {
    email: "doctor@abcclinic.com",
    password: "userPassword123"
  }
```

#### Step 3: Backend Validates Credentials
```
Backend (Express - /api/auth/login):
↓
Database Query:
SELECT * FROM users WHERE email = 'doctor@abcclinic.com'
↓
Result: {
  id: 'u1a2b3c4d',
  email: 'doctor@abcclinic.com',
  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  created_at: '2024-01-15T10:30:00Z'
}
↓
Password Comparison:
const isValid = await bcrypt.compare(
  'userPassword123',  // User input
  user.password_hash  // Stored hash
);
// Result: true (passwords match)
↓
JWT Token Generation:
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email
  },
  process.env.JWT_SECRET,  // Secret key
  { expiresIn: '7d' }      // Token expires in 7 days
);
// Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1MWEyYjNjNGQi...
↓
Backend Response:
{
  success: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "u1a2b3c4d",
    email: "doctor@abcclinic.com"
  }
}
```

#### Step 4: Frontend Stores Token
```
Frontend (React):
- Receives successful login response
↓
Store in localStorage:
localStorage.setItem('mediflow_auth_token', token);
↓
Update React State:
setAuthToken(token);
setIsAuthenticated(true);
↓
Redirect to Main App:
- Hides login screen
- Shows patient directory
- Immediately fetches patient list with token
```

#### Step 5: Authenticated API Requests
```
Every API Request After Login:
↓
Frontend adds Authorization header:
fetch('/api/patients', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})
↓
Backend Middleware (authenticateToken):
1. Extract token from header:
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];
   // Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

2. Verify token:
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // Result: {userId: 'u1a2b3c4d', email: 'doctor@abcclinic.com', iat: ..., exp: ...}

3. Attach user to request:
   req.user = decoded;

4. Allow request to proceed:
   next();
↓
Route Handler Executes:
- Has access to req.user
- Processes request normally
- Returns data
```

#### Step 6: Token Validation on Page Load
```
User Action: Refreshes page or reopens app
↓
Frontend (React useEffect):
- Checks localStorage for token:
  const token = localStorage.getItem('mediflow_auth_token');
↓
If token exists:
- Validates with backend:
  fetch('/api/auth/me', {
    headers: {'Authorization': `Bearer ${token}`}
  })
↓
Backend validates token:
- If valid (200 OK):
  - Frontend: setIsAuthenticated(true)
  - Shows main app
- If invalid (401/403):
  - Frontend: localStorage.removeItem('mediflow_auth_token')
  - Shows login screen
```

#### Step 7: Logout
```
User Action: Clicks "Sign Out" button
↓
Frontend (React):
- Removes token from localStorage:
  localStorage.removeItem('mediflow_auth_token');
- Clears state:
  setAuthToken(null);
  setIsAuthenticated(false);
- Shows login screen
↓
Note: Token still valid until expiration (7 days)
      but user cannot access it anymore
```

### Security Features

#### 1. Password Security
- Passwords never stored in plain text
- bcrypt hashing with salt rounds (10)
- Each password gets unique salt
- Computationally expensive to crack

#### 2. Token Security
- Signed with secret key (only server knows)
- Cannot be forged without secret
- Includes expiration (7 days)
- Stateless (no server-side session storage)

#### 3. API Protection
- All patient data endpoints require authentication
- Middleware validates every request
- Invalid tokens rejected with 401/403
- No data leakage to unauthenticated users

#### 4. HTTPS Ready
- Token transmitted in Authorization header
- Should use HTTPS in production
- Prevents man-in-the-middle attacks

### Data Flow Diagram
```
┌──────────────┐
│ Login Form   │
│ (Email/Pass) │
└──────┬───────┘
       │ POST /api/auth/login
       ↓
┌──────────────┐
│   Express    │
│   Backend    │
└──────┬───────┘
       │ SELECT user
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (users table)│
└──────┬───────┘
       │ User data + hash
       ↓
┌──────────────┐
│    bcrypt    │
│  (Compare)   │
└──────┬───────┘
       │ Valid? Yes
       ↓
┌──────────────┐
│     JWT      │
│  (Sign token)│
└──────┬───────┘
       │ Token
       ↓
┌──────────────┐
│   React      │
│ (localStorage)│
└──────┬───────┘
       │ Store token
       ↓
┌──────────────┐
│ All API Calls│
│ (Add header) │
└──────┬───────┘
       │ Authorization: Bearer <token>
       ↓
┌──────────────┐
│ Middleware   │
│ (Verify JWT) │
└──────┬───────┘
       │ Valid? Proceed
       ↓
┌──────────────┐
│ Route Handler│
│ (Return data)│
└──────────────┘
```

---

## FEATURE 6: Patient Record Management

### Feature Description
Complete CRUD (Create, Read, Update, Delete) operations for patient records. Staff can manually add new patients, view patient details, edit patient information, and delete patient records. All operations are protected by authentication and maintain data integrity.

### Tools Used

#### 1. React Forms (Controlled Components)
- **What it is:** React pattern for form handling
- **Purpose in this feature:** Manages form inputs and validation
- **Why we use it:** Two-way data binding, real-time validation, controlled state
- **Specific use:** Handles patient data entry and editing

#### 2. Motion/React (Framer Motion v11.18.2)
- **What it is:** Animation library for React
- **Purpose in this feature:** Smooth modal animations and transitions
- **Why we use it:** Professional UI feel, better UX, easy to implement
- **Specific use:** Modal open/close animations, page transitions

#### 3. PostgreSQL CASCADE DELETE
- **What it is:** Database constraint for referential integrity
- **Purpose in this feature:** Automatically deletes related records
- **Why we use it:** Prevents orphaned data, maintains database consistency
- **Specific use:** When patient deleted, all EMRs and medical_charts also deleted

#### 4. Express REST API
- **What it is:** RESTful API endpoints
- **Purpose in this feature:** Standard CRUD operations
- **Why we use it:** Industry standard, predictable, easy to understand
- **Specific use:** GET, POST, PUT, DELETE endpoints for patients

### Detailed Workflow

#### CREATE: Add New Patient

```
Step 1: User Opens Form
User Action: Clicks "New Entry" button
↓
Frontend (React):
- Sets isAddingPatient state to true
- Renders modal with form
- Shows fields:
  - First Name (required)
  - Last Name (required)
  - Date of Birth (required, date picker)
  - Gender (dropdown: male/female/other)
  - Phone (optional, tel input)
  - Email (optional, email input)
  - Address (optional, textarea)

Step 2: User Fills Form
User Input:
- First Name: "Sarah"
- Last Name: "Johnson"
- DOB: "1995-08-22"
- Gender: "female"
- Phone: "(555) 987-6543"
- Email: "sarah.j@email.com"
- Address: "456 Oak St, Springfield, IL 62702"
↓
Frontend Validation:
- Required fields checked
- Email format validated
- Phone format validated
- Date format validated

Step 3: Form Submission
User Action: Clicks "Create Patient Record"
↓
Frontend (React):
- Prevents default form submission
- Extracts form data:
  const formData = new FormData(e.currentTarget);
  const patientData = Object.fromEntries(formData.entries());
↓
API Request:
- POST /api/patients
- Headers: 
  - Authorization: Bearer <JWT_TOKEN>
  - Content-Type: application/json
- Body: {
    first_name: "Sarah",
    last_name: "Johnson",
    date_of_birth: "1995-08-22",
    gender: "female",
    phone: "(555) 987-6543",
    email: "sarah.j@email.com",
    address: "456 Oak St, Springfield, IL 62702"
  }

Step 4: Backend Creates Record
Backend (Express):
- Validates JWT token
- Generates unique ID:
  const id = Math.random().toString(36).substr(2, 9);
  // Result: "s7t8u9v0w"
↓
Database Insert:
INSERT INTO patients (
  id, first_name, last_name, date_of_birth,
  gender, phone, email, address
) VALUES (
  's7t8u9v0w', 'Sarah', 'Johnson', '1995-08-22',
  'female', '(555) 987-6543', 'sarah.j@email.com',
  '456 Oak St, Springfield, IL 62702'
)
↓
Backend Response:
{
  id: "s7t8u9v0w",
  first_name: "Sarah",
  last_name: "Johnson"
}

Step 5: Frontend Updates
Frontend (React):
- Closes modal: setIsAddingPatient(false)
- Refreshes patient list: fetchPatients()
- New patient appears in directory under "J" cabinet
```

#### READ: View Patient Details

```
Step 1: User Selects Patient
User Action: Clicks on "Johnson, Sarah" in patient list
↓
Frontend (React):
- Calls fetchPatientDetails(patient.id)
↓
API Request:
- GET /api/patients/s7t8u9v0w
- Headers: Authorization: Bearer <JWT_TOKEN>

Step 2: Backend Fetches Data
Backend (Express):
- Validates JWT token
↓
Database Queries (3 queries):
Query 1 - Patient Info:
SELECT * FROM patients WHERE id = 's7t8u9v0w'

Query 2 - EMRs:
SELECT * FROM emrs 
WHERE patient_id = 's7t8u9v0w' 
ORDER BY visit_date DESC

Query 3 - Medical Charts:
SELECT * FROM medical_charts 
WHERE patient_id = 's7t8u9v0w' 
ORDER BY visit_date DESC, created_at DESC
↓
Backend Response:
{
  id: "s7t8u9v0w",
  first_name: "Sarah",
  last_name: "Johnson",
  date_of_birth: "1995-08-22",
  gender: "female",
  phone: "(555) 987-6543",
  email: "sarah.j@email.com",
  address: "456 Oak St, Springfield, IL 62702",
  emrs: [...],
  documents: [...]
}

Step 3: Frontend Displays
Frontend (React):
- Updates selectedPatient state
- Updates patientDetails state
- Renders patient detail panel:
  - Header with initials avatar
  - Demographics (DOB, gender)
  - Contact info cards (phone, email, address)
  - Medical records section
  - Action buttons (Edit, Delete, Update Last Visit, AI Upload)
```

#### UPDATE: Edit Patient Information

```
Step 1: User Opens Edit Modal
User Action: Clicks edit icon (pencil) on patient
↓
Frontend (React):
- Copies patient data: setEditingPatient({...patient})
- Opens modal: setIsEditPatientModalOpen(true)
- Pre-fills form with current data

Step 2: User Modifies Data
User Changes:
- Phone: "(555) 987-6543" → "(555) 111-2222"
- Email: "sarah.j@email.com" → "sarah.johnson@newmail.com"
↓
Frontend State Updates:
- onChange handlers update editingPatient state in real-time

Step 3: User Saves Changes
User Action: Clicks "Save Changes"
↓
API Request:
- PUT /api/patients/s7t8u9v0w
- Headers:
  - Authorization: Bearer <JWT_TOKEN>
  - Content-Type: application/json
- Body: {
    first_name: "Sarah",
    last_name: "Johnson",
    date_of_birth: "1995-08-22",
    gender: "female",
    phone: "(555) 111-2222",
    email: "sarah.johnson@newmail.com",
    address: "456 Oak St, Springfield, IL 62702"
  }

Step 4: Backend Updates Record
Backend (Express):
- Validates JWT token
- Extracts data from request body
↓
Database Update:
UPDATE patients 
SET first_name = 'Sarah',
    last_name = 'Johnson',
    date_of_birth = '1995-08-22',
    gender = 'female',
    phone = '(555) 111-2222',
    email = 'sarah.johnson@newmail.com',
    address = '456 Oak St, Springfield, IL 62702'
WHERE id = 's7t8u9v0w'
↓
Backend Response:
{success: true}

Step 5: Frontend Refreshes
Frontend (React):
- Closes modal
- Shows success alert
- Refreshes patient list: fetchPatients()
- Refreshes patient details: fetchPatientDetails(id)
- Updated info displays immediately
```

#### DELETE: Remove Patient Record

```
Step 1: User Initiates Delete
User Action: Clicks delete icon (trash) on patient
↓
Frontend (React):
- Sets patientToDelete state
- Opens confirmation modal: setIsDeletePatientModalOpen(true)
- Shows warning message:
  "Are you sure you want to permanently delete:
   Sarah Johnson
   This will delete all medical records, documents, and data 
   associated with this patient. This action cannot be undone."

Step 2: User Confirms Deletion
User Action: Clicks "Delete" button (red)
↓
API Request:
- DELETE /api/patients/s7t8u9v0w
- Headers: Authorization: Bearer <JWT_TOKEN>

Step 3: Backend Deletes Record
Backend (Express):
- Validates JWT token
↓
Database Delete (CASCADE):
DELETE FROM patients WHERE id = 's7t8u9v0w'
↓
Automatic CASCADE Deletes:
- All EMRs: DELETE FROM emrs WHERE patient_id = 's7t8u9v0w'
- All Medical Charts: DELETE FROM medical_charts WHERE patient_id = 's7t8u9v0w'
- All Documents: DELETE FROM documents WHERE patient_id = 's7t8u9v0w'
↓
Backend Response:
{success: true}

Step 4: Frontend Updates
Frontend (React):
- Closes confirmation modal
- Shows success alert: "Patient deleted successfully"
- If patient was selected, clears selection:
  - setSelectedPatient(null)
  - setPatientDetails(null)
- Refreshes patient list: fetchPatients()
- Patient removed from directory
```

### Data Flow Diagram (CRUD Operations)
```
CREATE:
┌──────────┐   POST /api/patients   ┌──────────┐   INSERT   ┌──────────┐
│  Form    │ ───────────────────────>│ Express  │ ─────────>│PostgreSQL│
│  Modal   │<───────────────────────│ Backend  │<───────────│ Database │
└──────────┘   {success, id}        └──────────┘   New row  └──────────┘

READ:
┌──────────┐   GET /api/patients/:id ┌──────────┐   SELECT  ┌──────────┐
│ Patient  │ ───────────────────────>│ Express  │ ─────────>│PostgreSQL│
│  List    │<───────────────────────│ Backend  │<───────────│ Database │
└──────────┘   {patient, emrs, ...}  └──────────┘   Data    └──────────┘

UPDATE:
┌──────────┐   PUT /api/patients/:id ┌──────────┐   UPDATE  ┌──────────┐
│  Edit    │ ───────────────────────>│ Express  │ ─────────>│PostgreSQL│
│  Modal   │<───────────────────────│ Backend  │<───────────│ Database │
└──────────┘   {success}             └──────────┘   Modified └──────────┘

DELETE:
┌──────────┐  DELETE /api/patients/:id┌──────────┐  DELETE   ┌──────────┐
│ Confirm  │ ───────────────────────>│ Express  │ ─────────>│PostgreSQL│
│  Modal   │<───────────────────────│ Backend  │<───────────│ Database │
└──────────┘   {success}             └──────────┘  CASCADE   └──────────┘
```

---

## FEATURE 7: Last Visit Tracking

### Feature Description
Quick-update feature that allows staff to mark a patient's last visit date to today's date with one click. Creates a minimal medical chart entry to track visit dates without requiring full chart upload. Essential for walk-in appointments and quick check-ins.

### Tools Used

#### 1. JavaScript Date API
- **What it is:** Built-in JavaScript date handling
- **Purpose in this feature:** Gets current date in correct format
- **Why we use it:** Native, no dependencies, timezone-aware
- **Specific use:** new Date().toISOString().split('T')[0] → "2024-03-15"

#### 2. PostgreSQL Subquery (Last Visit Date)
- **What it is:** Nested SELECT query
- **Purpose in this feature:** Efficiently fetches most recent visit date
- **Why we use it:** Single query instead of multiple, better performance
- **Specific use:** Displays last visit date in patient list

#### 3. Confirmation Modal Pattern
- **What it is:** Two-step action confirmation
- **Purpose in this feature:** Prevents accidental updates
- **Why we use it:** User safety, shows what will happen before action
- **Specific use:** Shows current date before confirming update

### Detailed Workflow

#### Step 1: User Initiates Update
```
User Context: Patient "Sarah Johnson" just visited clinic
↓
User Action: Opens Sarah's patient details
↓
User Action: Clicks "Update Last Visit" button (amber/yellow)
↓
Frontend (React):
- Opens confirmation modal: setIsUpdateLastVisitModalOpen(true)
- Displays current date in human-readable format:
  "Update last visit date for Sarah Johnson to:
   Monday, March 15, 2024"
```

#### Step 2: User Confirms Update
```
User Action: Clicks "Confirm" button
↓
Frontend (React):
- Closes modal
- Shows processing indicator: setIsProcessing(true)
↓
API Request:
- PATCH /api/patients/s7t8u9v0w/last-visit
- Headers: Authorization: Bearer <JWT_TOKEN>
- Body: (empty - date calculated server-side)
```

#### Step 3: Backend Creates Visit Record
```
Backend (Express):
- Validates JWT token
- Extracts patient ID from URL: req.params.id
- Gets current date:
  const currentDate = new Date().toISOString().split('T')[0];
  // Result: "2024-03-15"
↓
Verify Patient Exists:
SELECT * FROM patients WHERE id = 's7t8u9v0w'
↓
If patient not found:
- Return 404: {error: 'Patient not found'}
↓
If patient exists:
- Generate chart ID:
  const chartId = Math.random().toString(36).substring(2, 11);
  // Result: "v1w2x3y4z"
↓
Create Medical Chart Entry:
INSERT INTO medical_charts (
  id, patient_id, visit_date, document_type,
  notes, reviewed, created_at
) VALUES (
  'v1w2x3y4z',
  's7t8u9v0w',
  '2024-03-15',
  'Visit Update',
  'Last visit date updated manually',
  true,
  CURRENT_TIMESTAMP
)
↓
Backend Response:
{
  success: true,
  patient_id: "s7t8u9v0w",
  last_visit_date: "2024-03-15",
  chart_id: "v1w2x3y4z"
}
```

#### Step 4: Frontend Updates Display
```
Frontend (React):
- Receives success response
- Hides processing indicator: setIsProcessing(false)
- Shows success alert: "Last visit updated successfully!"
↓
Refresh Data:
1. Refresh patient list: fetchPatients()
   - Patient list query includes last_visit_date subquery
   - Sarah Johnson's card now shows: "Last Visit: 2024-03-15"

2. Refresh patient details: fetchPatientDetails(patient.id)
   - Medical charts list now includes new "Visit Update" entry
   - Entry marked as reviewed (no action needed)
↓
User sees updated last visit date immediately
```

#### Step 5: How Last Visit Date is Calculated
```
Patient List Query (GET /api/patients):
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
↓
For Sarah Johnson:
- Subquery finds most recent medical_chart
- Returns visit_date: "2024-03-15"
- Displayed in patient card: "Last Visit: 2024-03-15"
↓
If no medical charts exist:
- Subquery returns NULL
- Displayed as: "Last Visit: No visits yet"
```

### Use Cases

#### Use Case 1: Walk-In Appointment
```
Scenario: Patient walks in for quick blood pressure check
↓
Staff Action:
1. Search for patient in directory
2. Click on patient name
3. Click "Update Last Visit"
4. Confirm
↓
Result: Visit recorded in 3 clicks, no chart upload needed
```

#### Use Case 2: Phone Consultation
```
Scenario: Doctor calls patient for follow-up
↓
Staff Action:
1. Open patient record
2. Update last visit to today
3. Optionally add medical chart with notes later
↓
Result: Visit date tracked even without physical document
```

#### Use Case 3: Scheduled Appointment
```
Scenario: Patient has scheduled appointment
↓
Staff Workflow:
1. Patient checks in → Update last visit
2. Doctor sees patient → Upload medical chart via AI
3. Both records linked by date
↓
Result: Complete visit documentation
```

### Data Flow Diagram
```
┌──────────────┐
│   Patient    │
│   Details    │
└──────┬───────┘
       │ Click "Update Last Visit"
       ↓
┌──────────────┐
│ Confirmation │
│    Modal     │
└──────┬───────┘
       │ Click "Confirm"
       ↓
┌──────────────┐
│   React      │
│ (API call)   │
└──────┬───────┘
       │ PATCH /api/patients/:id/last-visit
       ↓
┌──────────────┐
│   Express    │
│  (Get date)  │
└──────┬───────┘
       │ currentDate = "2024-03-15"
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (Verify pt)  │
└──────┬───────┘
       │ Patient exists
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (INSERT)     │
└──────┬───────┘
       │ New medical_chart row
       ↓
┌──────────────┐
│   Express    │
│ (Response)   │
└──────┬───────┘
       │ {success, last_visit_date}
       ↓
┌──────────────┐
│   React      │
│ (Refresh)    │
└──────┬───────┘
       │ fetchPatients()
       │ fetchPatientDetails()
       ↓
┌──────────────┐
│  PostgreSQL  │
│ (Subquery)   │
└──────┬───────┘
       │ Most recent visit_date
       ↓
┌──────────────┐
│   React      │
│ (Display)    │
└──────────────┘
```

---

## SUMMARY

This ABC Patient Directory System uses a modern tech stack to digitize medical record management:

### Core Technologies
- **Frontend:** React 18.3.1 + TypeScript 5.9.3 + Tailwind CSS 4.2.1
- **Backend:** Node.js + Express 4.22.1 + TypeScript
- **Database:** PostgreSQL 14+ (via Supabase)
- **OCR:** Tesseract 5.x + Python 3.x + Flask
- **AI:** Google Gemini 1.5 Flash
- **Auth:** JWT + bcrypt

### Key Features
1. **Patient Directory** - Searchable A-Z cabinet organization
2. **AI Upload Entry** - Create patient + chart from one photo
3. **Medical Chart Processing** - OCR extraction with human review
4. **AI Health Assistant** - Gemini-powered chatbot
5. **Authentication** - Secure JWT-based login
6. **Patient Management** - Full CRUD operations
7. **Last Visit Tracking** - One-click visit date updates

### Data Flow Pattern
```
User Input → React UI → Express API → PostgreSQL Database
                ↓
         OCR Service (Python/Tesseract)
                ↓
         AI Service (Google Gemini)
```

All features work together to provide a complete, production-ready medical record management system for ABC MD Medical Clinic.
