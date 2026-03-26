# Requirements Document

## Introduction

MediFlow AI is an existing medical records management system with a patient directory and PostgreSQL backend. This document specifies requirements for production-ready enhancements including authentication, AI chatbot integration, OCR for handwritten documents, and hybrid cloud-local deployment. The system uses a cost-optimized hybrid architecture: cloud hosting for the web application (React frontend, Express backend, PostgreSQL database, authentication) and local on-premise AI processing at each branch (Ollama LLM service and OCR). Each branch has one admin user who accesses the cloud-hosted web application via HTTPS URLs using standard web browsers. AI inference and OCR processing run on local hardware at each branch (budget GPU: RX 580 8GB VRAM or similar) to minimize cloud costs and ensure HIPAA compliance by keeping patient health information (PHI) processing on-premise.

## Glossary

- **Authentication_System**: The security layer that verifies admin user identity before granting access
- **Admin_User**: A single authorized user per branch who manages patient records via web browser
- **Branch**: One of five physical medical office locations accessing the system through HTTPS URLs
- **Local_AI_Server**: On-premise hardware at each branch running Ollama LLM service and OCR processing
- **Ollama_Service**: Local AI inference server running on branch hardware with Llama 3.2 8B or Qwen 2.5 7B models
- **Chatbot**: AI assistant that answers questions about the web application and patient information
- **OCR_Engine**: Local Optical Character Recognition system (Tesseract or TrOCR) that extracts text from handwritten medical documents
- **Guardrails**: Safety and compliance mechanisms that prevent inappropriate AI responses
- **Session**: A period of authenticated access for an admin user
- **Medical_Document**: Scanned or photographed handwritten patient records requiring text extraction
- **Cloud_Instance**: Virtual server hosting the web application (React frontend, Express backend, PostgreSQL database, authentication)
- **Multi_Tenant**: Architecture where a single cloud instance serves multiple branches with data isolation
- **Branch_GPU**: Budget GPU hardware at each branch (RX 580 8GB VRAM or equivalent) for local AI processing
- **AI_API_Endpoint**: Secure REST API on Local_AI_Server that receives requests from Cloud_Instance
- **PHI**: Protected Health Information that must remain on-premise for HIPAA compliance

## Requirements

### Requirement 1: Admin Authentication System

**User Story:** As a branch administrator, I want to securely log in to my branch's MediFlow instance, so that patient data remains protected and access is controlled.

#### Acceptance Criteria

1. THE Authentication_System SHALL provide a login interface with username and password fields
2. WHEN valid credentials are submitted, THE Authentication_System SHALL create a Session for the Admin_User
3. WHEN invalid credentials are submitted, THE Authentication_System SHALL display an error message and prevent access
4. THE Authentication_System SHALL support exactly one Admin_User account per Branch
5. WHEN a Session expires after 8 hours of inactivity, THE Authentication_System SHALL require re-authentication
6. THE Authentication_System SHALL hash and salt passwords using bcrypt or Argon2 before storage
7. WHEN an Admin_User logs out, THE Authentication_System SHALL invalidate the current Session
8. THE Authentication_System SHALL protect all patient data API endpoints requiring valid Session tokens

### Requirement 2: Hybrid Cloud-Local AI Chatbot Integration with Agentic Workflow

**User Story:** As a branch administrator, I want to ask the AI chatbot questions about patient information and application features through my web browser, so that I can quickly find information without manual searching while keeping patient data processing on-premise with an agentic workflow that can safely query the database.

#### Acceptance Criteria

1. THE Chatbot SHALL use the Ollama_Service running on the Local_AI_Server at each Branch with Qwen 2.5 7B Instruct (Q4 quantized) as the primary model
2. THE Chatbot SHALL support Llama 3.2 8B Instruct (Q4 quantized) as an alternative model option
3. THE Chatbot SHALL implement an agentic workflow with function calling capabilities for database queries
4. WHEN the Admin_User submits a query, THE Cloud_Instance SHALL forward the request to the Branch's Local_AI_Server via the AI_API_Endpoint
5. WHEN the Local_AI_Server is unavailable, THE Chatbot SHALL display a clear error message to the Admin_User
6. THE Chatbot SHALL use prepared statements exclusively for all database queries to prevent SQL injection
7. THE Chatbot SHALL have access to predefined database query functions (get_patient_info, search_patients, get_emr_history, get_document_list)
8. THE Chatbot SHALL NOT execute raw SQL queries or allow user-provided SQL code
9. THE Chatbot SHALL answer questions about patient records by calling database query functions with validated parameters
10. THE Chatbot SHALL answer questions about MediFlow application features and usage
11. THE Chatbot SHALL maintain conversation context for up to 10 previous messages
12. THE Local_AI_Server SHALL respond to queries within 10 seconds under normal Branch_GPU load
13. THE AI_API_Endpoint SHALL use HTTPS with authentication tokens to secure communication between Cloud_Instance and Local_AI_Server
14. WHEN patient data is included in queries, THE Local_AI_Server SHALL process PHI locally without transmitting raw patient data to cloud services
15. THE Chatbot SHALL use Qwen 2.5 7B's structured output capabilities to generate valid JSON for function calls
16. THE Chatbot SHALL consume approximately 4.5GB VRAM (Q4 quantization) leaving headroom for OCR processing

### Requirement 3: AI Safety Guardrails and Security Controls

**User Story:** As a system administrator, I want the chatbot to have comprehensive safety guardrails and security controls, so that it provides appropriate responses, prevents SQL injection, blocks prompt injection attacks, and maintains HIPAA compliance.

#### Acceptance Criteria

1. THE Guardrails SHALL prevent the Chatbot from providing medical diagnoses or treatment recommendations
2. THE Guardrails SHALL prevent the Chatbot from sharing patient data outside the authenticated Session
3. WHEN the Chatbot detects a request for medical advice, THE Guardrails SHALL respond with a disclaimer directing users to qualified medical professionals
4. THE Guardrails SHALL log all Chatbot interactions with timestamps and Admin_User identifiers
5. THE Guardrails SHALL reject queries attempting to access data from other Branches
6. THE Guardrails SHALL sanitize all user inputs to prevent prompt injection attacks
7. WHEN inappropriate content is detected in user input, THE Guardrails SHALL refuse to process the request and log the attempt
8. THE Guardrails SHALL use prepared statements exclusively for all database operations
9. THE Guardrails SHALL validate all function call parameters before execution (type checking, range validation, branch_id verification)
10. THE Guardrails SHALL implement a whitelist of allowed database query functions (get_patient_info, search_patients, get_emr_history, get_document_list, get_patient_count)
11. THE Guardrails SHALL reject any attempt to execute raw SQL queries or database modification commands (INSERT, UPDATE, DELETE, DROP)
12. THE Guardrails SHALL limit query results to maximum 100 records per request to prevent data exfiltration
13. THE Guardrails SHALL implement rate limiting (maximum 60 requests per hour per Admin_User)
14. THE Guardrails SHALL detect and block common prompt injection patterns (ignore previous instructions, system prompt override attempts, jailbreak attempts)
15. THE Guardrails SHALL use Qwen 2.5 7B's system instruction following capabilities to enforce security policies
16. THE Guardrails SHALL maintain an audit log of all blocked requests with reason codes

### Requirement 4: Local Document OCR with Tesseract

**User Story:** As a branch administrator, I want to upload medical documents through my web browser and have text extracted automatically using Tesseract OCR, so that I can digitize patient records efficiently while keeping PHI processing on-premise for HIPAA compliance.

#### Acceptance Criteria

1. THE OCR_Engine SHALL accept image uploads in JPEG, PNG, and PDF formats through the web interface
2. WHEN a Medical_Document is uploaded, THE system SHALL process the image locally using Tesseract OCR
3. THE OCR_Engine SHALL use Tesseract OCR (CPU-based) for text extraction from medical documents
4. THE OCR_Engine SHALL extract text using custom Tesseract configuration (--oem 3 --psm 6) for optimal accuracy
5. THE OCR_Engine SHALL apply regex patterns from medical_chart_templates.json to extract structured fields
6. THE OCR_Engine SHALL normalize dates to YYYY-MM-DD format from various input formats (MM/DD/YYYY, DD-MM-YYYY, etc.)
7. THE OCR_Engine SHALL filter out common document headers (PATIENT MEDICAL CHART, MEDICAL CHART, etc.) from name extraction
8. THE OCR_Engine SHALL extract patient information including name, date of birth, gender, phone, email, and address
9. THE OCR_Engine SHALL process a single-page Medical_Document within 30 seconds
10. WHEN OCR processing completes, THE system SHALL store extracted text with structured data in the medical_charts table
11. WHEN OCR processing fails, THE OCR_Engine SHALL mark the document status as failed and provide an error message with failure reason
12. THE OCR_Engine SHALL achieve minimum 85% accuracy on legible printed medical text
13. THE OCR_Engine SHALL achieve minimum 70% accuracy on handwritten medical text (best effort with Tesseract)
14. WHERE multiple documents are uploaded simultaneously, THE OCR_Engine SHALL queue documents for sequential processing
15. THE OCR_Engine SHALL delete temporary document files after processing completes
16. THE OCR_Engine SHALL run on CPU without requiring GPU or VRAM
17. THE OCR_Engine SHALL provide confidence scores for extracted text regions

### Requirement 5: Hybrid Cloud-Local Deployment Architecture

**User Story:** As a system administrator, I want to deploy MediFlow with a hybrid architecture using cheap cloud hosting for the web application and local AI processing at each branch, so that costs remain low while maintaining HIPAA compliance for PHI processing.

#### Acceptance Criteria

1. THE Cloud_Instance SHALL host only the web application stack including PostgreSQL database, Express backend, React frontend, and Authentication_System
2. THE Cloud_Instance SHALL NOT include GPU capabilities or AI inference services
3. THE Cloud_Instance SHALL provide browser-based access via HTTPS URLs for all 5 Branches
4. THE Cloud_Instance SHALL require only standard web browsers (Chrome, Firefox, Safari, Edge) for branch access
5. THE Local_AI_Server SHALL run at each Branch on dedicated hardware with Branch_GPU (RX 580 8GB VRAM or equivalent)
6. THE Local_AI_Server SHALL host Ollama_Service with Llama 3.2 8B or Qwen 2.5 7B models (quantized Q4)
7. THE Local_AI_Server SHALL host OCR_Engine using Tesseract or TrOCR
8. THE Local_AI_Server SHALL run on Linux operating system (Ubuntu recommended for Ollama compatibility)
9. THE Local_AI_Server SHALL have minimum 16GB system RAM and 50GB storage for AI models
10. THE Cloud_Instance SHALL support concurrent access from 5 Admin_Users with light load characteristics
11. THE Cloud_Instance SHALL maintain 99% uptime during business hours (8 AM - 6 PM local time)
12. THE Cloud_Instance SHALL implement automated daily backups of the PostgreSQL database
13. THE Cloud_Instance SHALL use HTTPS with valid SSL certificates for all connections
14. THE Cloud_Instance SHALL implement Multi_Tenant architecture with data isolation via branch_id
15. THE AI_API_Endpoint SHALL authenticate requests from Cloud_Instance using API tokens unique to each Branch

### Requirement 6: Session Management Without Caching

**User Story:** As a system architect, I want to understand if session caching is necessary for single-user branches, so that the authentication system is appropriately designed.

#### Acceptance Criteria

1. THE Authentication_System SHALL store Session tokens in the PostgreSQL database
2. WHEN an Admin_User makes an authenticated request, THE Authentication_System SHALL validate the Session token against the database
3. THE Authentication_System SHALL complete Session validation within 100 milliseconds
4. WHERE only one Admin_User per Branch exists, THE Authentication_System SHALL not implement Redis or memory caching
5. THE Authentication_System SHALL use database indexes on session token columns for query performance
6. WHEN Session validation occurs, THE Authentication_System SHALL update the last_activity timestamp
7. THE Authentication_System SHALL clean up expired Sessions daily via scheduled job

### Requirement 7: Existing UI Preservation

**User Story:** As a branch administrator, I want the current web application design to remain unchanged, so that I don't need to relearn the interface.

#### Acceptance Criteria

1. THE Authentication_System SHALL integrate without modifying the existing patient directory UI
2. THE Chatbot SHALL use the existing chat interface component in App.tsx
3. THE OCR_Engine SHALL use the existing document upload interface
4. WHEN new features are added, THE Authentication_System SHALL maintain the current color scheme and design language
5. THE Authentication_System SHALL add a login screen that appears before the main application interface
6. WHEN an Admin_User is authenticated, THE Authentication_System SHALL display the existing MediFlow interface without visual changes

### Requirement 8: Cost Optimization and Cloud Provider Selection

**User Story:** As a business owner, I want to identify the cheapest cloud provider for hosting the web application without GPU requirements, so that the system remains financially sustainable while serving 5 branches.

#### Acceptance Criteria

1. THE Cloud_Instance SHALL cost less than $50 per month for all 5 Branches combined
2. THE Cloud_Instance SHALL NOT require GPU capabilities since AI processing runs on Local_AI_Server at each Branch
3. THE Cloud_Instance SHALL evaluate DigitalOcean, Hetzner, Vultr, Linode, AWS Lightsail, and similar budget providers
4. WHEN comparing providers, THE Cloud_Instance SHALL document monthly costs for CPU-only instances with minimum 4GB RAM and 80GB storage
5. THE Cloud_Instance SHALL use object storage (S3 or equivalent) for Medical_Document files rather than database storage
6. THE Cloud_Instance SHALL implement database connection pooling to minimize resource overhead
7. THE Cloud_Instance SHALL use Multi_Tenant architecture to serve all 5 Branches from a single instance
8. WHERE managed PostgreSQL is cost-prohibitive, THE Cloud_Instance SHALL run PostgreSQL on the same server as the web application
9. THE Cloud_Instance SHALL use free SSL certificates from Let's Encrypt

### Requirement 9: Browser-Only Access Model

**User Story:** As a branch staff member, I want to access MediFlow using only a web browser on basic hardware, so that I don't need expensive computers for the web application while my branch maintains local AI hardware.

#### Acceptance Criteria

1. THE Cloud_Instance SHALL serve the React frontend application through standard HTTPS web servers
2. THE Cloud_Instance SHALL require no local software installation beyond a modern web browser
3. THE Cloud_Instance SHALL support access from computers with minimum 4GB RAM and basic integrated graphics
4. THE Cloud_Instance SHALL perform no AI inference - all AI processing occurs on the Local_AI_Server
5. WHEN an Admin_User uploads a Medical_Document, THE Cloud_Instance SHALL store it and notify the Local_AI_Server for processing
6. THE Cloud_Instance SHALL stream Chatbot responses from the Local_AI_Server to the browser using WebSocket or Server-Sent Events
7. THE Cloud_Instance SHALL function on standard office internet connections with minimum 5 Mbps download speed
8. THE Cloud_Instance SHALL provide responsive performance for 5 concurrent browser sessions

### Requirement 10: Local AI Server Hardware Specifications

**User Story:** As a branch administrator, I want clear hardware specifications for the local AI server, so that I can purchase appropriate equipment for running Ollama and OCR at my branch.

#### Acceptance Criteria

1. THE Local_AI_Server SHALL require minimum 8GB system RAM for basic operation
2. THE Local_AI_Server SHALL require minimum 16GB system RAM for optimal performance with Ollama
3. THE Local_AI_Server SHALL require a modern quad-core CPU (Intel i5/i7 or AMD Ryzen 5/7)
4. THE Local_AI_Server SHALL require minimum 50GB available storage for AI models and temporary files
5. THE Local_AI_Server SHALL run Linux operating system (Ubuntu 22.04 LTS or newer recommended)
6. THE Local_AI_Server SHALL support Ollama installation and model deployment
7. THE Local_AI_Server SHALL load Llama 3.2 8B or Qwen 2.5 7B models in quantized Q4 format
8. THE Local_AI_Server SHALL run Tesseract OCR on CPU without requiring GPU or VRAM
9. WHERE a Branch has existing workstation hardware with sufficient RAM and CPU, THE Local_AI_Server MAY reuse that hardware
10. THE Local_AI_Server MAY optionally include a GPU (RX 580, RX 6600, GTX 1070, or equivalent) for faster Ollama inference, but GPU is NOT required

### Requirement 11: Local AI Server Network Communication

**User Story:** As a system architect, I want secure communication between the cloud web application and local AI servers, so that branches can process AI requests without exposing security vulnerabilities.

#### Acceptance Criteria

1. THE Local_AI_Server SHALL expose a REST API on the AI_API_Endpoint for receiving requests from Cloud_Instance
2. THE AI_API_Endpoint SHALL use HTTPS with valid SSL certificates (self-signed or Let's Encrypt)
3. THE AI_API_Endpoint SHALL authenticate all requests using API tokens unique to each Branch
4. WHEN the Cloud_Instance sends a request, THE AI_API_Endpoint SHALL validate the API token before processing
5. THE AI_API_Endpoint SHALL reject requests with invalid or missing API tokens
6. THE Local_AI_Server SHALL be accessible from the internet via static IP address or dynamic DNS
7. WHERE a Branch uses a firewall, THE Local_AI_Server SHALL configure port forwarding for the AI_API_Endpoint
8. THE AI_API_Endpoint SHALL implement rate limiting to prevent abuse (maximum 60 requests per minute per Branch)
9. THE AI_API_Endpoint SHALL log all requests with timestamps and request types for audit purposes
10. WHEN the Local_AI_Server is unreachable, THE Cloud_Instance SHALL retry requests up to 3 times with exponential backoff

### Requirement 12: HIPAA Compliance Through Local Processing

**User Story:** As a compliance officer, I want patient health information to be processed locally at each branch, so that the system maintains HIPAA compliance without expensive cloud security measures.

#### Acceptance Criteria

1. THE Local_AI_Server SHALL process all PHI locally without transmitting raw patient data to external cloud services
2. WHEN OCR extracts text from Medical_Documents, THE Local_AI_Server SHALL process images locally and return only extracted text to Cloud_Instance
3. WHEN the Chatbot answers questions about patients, THE Local_AI_Server SHALL retrieve patient data from Cloud_Instance, process queries locally, and return only the response
4. THE Cloud_Instance SHALL store Medical_Document images with encryption at rest
5. THE Cloud_Instance SHALL transmit Medical_Document URLs to Local_AI_Server over HTTPS
6. THE Local_AI_Server SHALL delete temporary Medical_Document files immediately after OCR processing completes
7. THE Local_AI_Server SHALL not log or store PHI in application logs
8. THE AI_API_Endpoint SHALL use TLS 1.2 or higher for all communications
9. WHERE a Branch requires additional security, THE Local_AI_Server MAY implement VPN access instead of public internet exposure

### Requirement 13: Flexible Electronic Medical Record (EMR) Format

**User Story:** As a branch administrator, I want a flexible EMR format that can accommodate different types of medical charts and custom fields, so that I can digitize diverse patient records without losing information.

#### Acceptance Criteria

1. THE EMR format SHALL include standard structured fields (patient_id, visit_date, diagnosis, treatment_plan, created_at)
2. THE EMR format SHALL include a flexible "custom_fields" JSON column for variable data
3. THE EMR format SHALL include a "document_type" field to categorize the source document (Prescription, Lab Result, Progress Note, Consultation, Referral, Vital Signs, Other)
4. THE EMR format SHALL include a "notes" text field for free-form clinical notes and observations
5. THE EMR format SHALL include a "metadata" JSON column for OCR-extracted structure information (tables, checkboxes, signatures)
6. WHEN OCR processes a document, THE OCR_Engine SHALL attempt to extract standard fields (diagnosis, treatment, medications, vitals) into structured columns
7. WHEN OCR encounters non-standard information, THE OCR_Engine SHALL store it in the custom_fields JSON with descriptive keys
8. THE custom_fields JSON SHALL support nested objects for complex data (e.g., vitals: {blood_pressure: "120/80", heart_rate: 72})
9. THE EMR format SHALL include a "confidence_score" field indicating OCR extraction quality (0.0-1.0)
10. THE EMR format SHALL include a "reviewed" boolean flag indicating whether a human has verified the OCR extraction
11. THE EMR format SHALL include a "reviewer_notes" text field for human corrections or annotations
12. THE Chatbot SHALL be able to query both structured fields and custom_fields JSON when answering questions
13. THE Cloud_Instance SHALL provide a UI for admins to review and edit OCR-extracted EMRs before finalizing
14. THE EMR format SHALL support versioning to track changes over time
15. WHEN displaying EMRs, THE Cloud_Instance SHALL render custom_fields in a human-readable format with labels

#### EMR Database Schema

```sql
CREATE TABLE emrs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  visit_date TEXT,                    -- YYYY-MM-DD format
  document_type TEXT,                 -- Prescription, Lab Result, Progress Note, etc.
  diagnosis TEXT,                     -- Primary diagnosis
  treatment_plan TEXT,                -- Treatment/prescription details
  notes TEXT,                         -- Free-form clinical notes
  custom_fields JSONB,                -- Flexible JSON for variable data
  metadata JSONB,                     -- OCR structure metadata (tables, checkboxes, etc.)
  confidence_score REAL,              -- OCR quality (0.0-1.0)
  reviewed BOOLEAN DEFAULT FALSE,     -- Human verification flag
  reviewer_notes TEXT,                -- Human corrections/annotations
  version INTEGER DEFAULT 1,          -- Version tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Index for fast queries
CREATE INDEX idx_emrs_patient_id ON emrs(patient_id);
CREATE INDEX idx_emrs_visit_date ON emrs(visit_date);
CREATE INDEX idx_emrs_document_type ON emrs(document_type);
CREATE INDEX idx_emrs_reviewed ON emrs(reviewed);

-- GIN index for JSON queries
CREATE INDEX idx_emrs_custom_fields ON emrs USING GIN (custom_fields);
```

#### Example EMR Record

```json
{
  "id": "emr_20260228_001",
  "patient_id": "patient_12345",
  "visit_date": "2026-02-28",
  "document_type": "Progress Note",
  "diagnosis": "Type 2 Diabetes Mellitus",
  "treatment_plan": "Continue Metformin 500mg BID, increase exercise",
  "notes": "Patient reports improved glucose control. No hypoglycemic episodes. Compliant with medication.",
  "custom_fields": {
    "vitals": {
      "blood_pressure": "128/82 mmHg",
      "heart_rate": 76,
      "temperature": "98.6°F",
      "weight": "185 lbs",
      "bmi": 27.3
    },
    "lab_results": {
      "hba1c": "7.2%",
      "fasting_glucose": "142 mg/dL"
    },
    "medications": [
      {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "BID",
        "route": "Oral"
      }
    ],
    "follow_up": {
      "date": "2026-05-28",
      "reason": "3-month diabetes check"
    }
  },
  "metadata": {
    "ocr_engine": "PaddleOCR v4 + TrOCR",
    "processing_time_seconds": 12.4,
    "detected_sections": ["vitals", "assessment", "plan"],
    "handwritten_sections": ["notes", "signature"],
    "printed_sections": ["vitals", "lab_results"]
  },
  "confidence_score": 0.89,
  "reviewed": true,
  "reviewer_notes": "Corrected blood pressure reading from OCR error",
  "version": 2,
  "created_at": "2026-02-28T14:30:00Z",
  "updated_at": "2026-02-28T15:45:00Z"
}
```

## Deployment Architecture Options

MediFlow AI can be deployed in three different architectures, each with distinct trade-offs for cost, security, and implementation complexity. Choose the option that best fits your budget, security requirements, and timeline.

---

## Option 1: Full Cloud Deployment (AWS/GCP/Azure)

**Description:** Everything runs in the cloud - web application, database, AI models (Ollama + OCR), and document storage.

### Architecture Components

**Cloud Infrastructure:**
- Web application (React + Express) on cloud VM
- PostgreSQL database (managed service or same VM)
- Ollama LLM service with GPU instance
- OCR processing with GPU instance
- Object storage for medical documents
- All 5 branches access via HTTPS URLs

### Cost Analysis

**AWS Example:**
- EC2 g4dn.xlarge (T4 GPU, 16GB VRAM): $380/month
- RDS PostgreSQL (db.t3.micro): $25/month
- S3 storage (100GB): $3/month
- Data transfer: $10/month
- **Total: ~$418/month = $5,016/year**

**Alternative GPU Cloud (RunPod/Vast.ai):**
- GPU instance (RTX 3090 24GB): $150-250/month
- Managed PostgreSQL (DigitalOcean): $15/month
- Object storage (Backblaze B2): $5/month
- **Total: ~$170-270/month = $2,040-3,240/year**

### Pros & Cons

**Pros:**
✅ No hardware to maintain
✅ Instant deployment
✅ Automatic backups and scaling
✅ Access from anywhere
✅ No upfront costs

**Cons:**
❌ Most expensive long-term ($2,000-5,000/year forever)
❌ Patient data processed in cloud (HIPAA compliance harder)
❌ Requires HIPAA BAA with cloud provider
❌ Ongoing monthly costs never end
❌ Vendor lock-in

### Best For:
- Quick proof-of-concept
- No technical staff to manage hardware
- Budget for ongoing cloud costs
- Don't need maximum security

### Implementation Timeline: 1-2 weeks

---

## Option 2: Hybrid Cloud-Local Deployment (RECOMMENDED)

**Description:** Web application and database in cloud (cheap hosting), AI processing runs locally at each branch for security and cost savings.

### Architecture Components

**Cloud Infrastructure:**
- Web application (React + Express) on budget cloud VM
- PostgreSQL database on same VM or managed service
- Document storage (object storage)
- Authentication system
- NO AI processing in cloud

**Local Infrastructure (Per Branch):**
- Budget PC with RX 580 8GB GPU (~$320-380)
- Ollama LLM service (Llama 3.2 8B or Qwen 2.5 7B)
- OCR processing (Tesseract or TrOCR)
- Ubuntu Linux OS
- Secure API endpoint for cloud communication

### Cost Analysis

**Monthly Recurring:**
- Hetzner CX22 (2 vCPU, 4GB RAM): $5/month
- Object storage (Backblaze B2): $5/month
- SSL certificate (Let's Encrypt): $0
- Electricity (per branch, 200W avg): $17-29/month
- **Total: ~$10/month cloud + $85-145/month electricity (5 branches)**
- **Total monthly: ~$95-155/month**

**One-Time Hardware (Per Branch):**
- AMD Ryzen 5 1600 CPU: $50 (used)
- B450 motherboard: $60 (used)
- 16GB DDR4 RAM: $40 (used)
- RX 580 8GB GPU: $100 (used)
- 500W PSU: $50 (new)
- 240GB SSD: $30 (new)
- Case: $40 (new)
- **Total per branch: ~$370**
- **Total for 5 branches: ~$1,850**

**Total Cost:**
- Year 1: $1,850 (hardware) + $1,140-1,860 (monthly) = **$2,990-3,710**
- Year 2+: $1,140-1,860/year (just electricity + cloud)
- **Break-even vs Option 1: 18-24 months**

### Pros & Cons

**Pros:**
✅ Much cheaper long-term (saves $1,000-3,000/year after Year 1)
✅ Patient data processed locally (better HIPAA compliance)
✅ No cloud AI costs
✅ Data sovereignty - you control sensitive processing
✅ Can upgrade hardware independently

**Cons:**
❌ Upfront hardware cost (~$1,850 for 5 branches)
❌ Need to maintain local servers
❌ Requires network configuration (port forwarding/VPN)
❌ Electricity costs ongoing
❌ Hardware can fail (need spare parts)

### Best For:
- Long-term deployment (2+ years)
- Security-conscious organizations
- Budget for upfront hardware
- Technical staff available
- HIPAA compliance priority

### Implementation Timeline: 2-4 weeks

---

## Option 3: Fully Local Deployment (Docker)

**Description:** Everything runs locally on each branch's computer - web application, database, AI models, and document storage. No cloud dependency.

### Architecture Components

**Local Infrastructure (Per Branch):**
- Budget PC with RX 580 8GB GPU (~$320-380)
- Docker containers for:
  - React frontend (Nginx)
  - Express backend (Node.js)
  - PostgreSQL database
  - Ollama LLM service
  - OCR processing
- All data stored locally
- Access via localhost or local network IP
- Optional: VPN for remote access

### Cost Analysis

**One-Time Hardware (Per Branch):**
- AMD Ryzen 5 1600 CPU: $50 (used)
- B450 motherboard: $60 (used)
- 16GB DDR4 RAM: $40 (used)
- RX 580 8GB GPU: $100 (used)
- 500W PSU: $50 (new)
- 500GB SSD: $45 (new) - larger for database
- Case: $40 (new)
- **Total per branch: ~$385**
- **Total for 5 branches: ~$1,925**

**Monthly Recurring:**
- Cloud hosting: $0
- Electricity (per branch, 200W avg): $17-29/month
- **Total monthly: ~$85-145/month (5 branches electricity only)**

**Total Cost:**
- Year 1: $1,925 (hardware) + $1,020-1,740 (electricity) = **$2,945-3,665**
- Year 2+: $1,020-1,740/year (just electricity)
- **Cheapest long-term option**

### Pros & Cons

**Pros:**
✅ Cheapest long-term (no cloud costs ever)
✅ Maximum security - no data leaves premises
✅ Complete data sovereignty
✅ No internet dependency for core operations
✅ HIPAA compliance easiest (all local)
✅ Can deploy immediately with Docker
✅ No vendor lock-in

**Cons:**
❌ No remote access (unless VPN configured)
❌ Each branch has independent database (no central view)
❌ Manual backups required
❌ Hardware maintenance per branch
❌ No automatic updates
❌ Requires technical setup per branch

### Best For:
- Maximum security requirements
- No budget for cloud hosting
- Each branch operates independently
- Technical staff at each location
- Immediate deployment needed
- Long-term cost minimization

### Implementation Timeline: 1-2 weeks (Docker setup)

---

## Option 4: Reverse Hybrid (Cloud Web App + Local Database) ⭐ RECOMMENDED

**Description:** Lightweight web application hosted in cloud for accessibility, but ALL sensitive data (database + AI processing) stays on-premise at each branch. Best of both worlds: remote access + maximum security.

### Architecture Components

**Cloud Infrastructure:**
- Stateless React frontend (static hosting)
- Lightweight API gateway (Express)
- NO database
- NO AI processing
- NO patient data storage
- Just authentication and request routing

**Local Infrastructure (Per Branch):**
- Budget PC with RX 580 8GB GPU (~$320-380)
- PostgreSQL database (all patient data)
- Ollama LLM service
- OCR processing
- VPN server (WireGuard) for secure cloud-to-local communication
- All PHI stays on-premise

**Data Flow:**
1. User accesses cloud web app via browser
2. Cloud authenticates user (JWT token)
3. Cloud API gateway forwards requests to local branch via VPN
4. Local server processes request (database query, AI inference)
5. Local server returns ONLY the result (no raw PHI)
6. Cloud displays result to user

### Cost Analysis

**Monthly Recurring:**
- Cloud hosting (Vercel/Netlify/Hetzner): $0-10/month (static site + API)
- VPN service (optional): $0 (self-hosted WireGuard)
- Electricity (per branch, 200W avg): $17-29/month
- **Total monthly: ~$85-155/month (5 branches)**

**One-Time Hardware (Per Branch):**
- Same as Option 3: ~$385 per branch
- **Total for 5 branches: ~$1,925**

**Total Cost:**
- Year 1: $1,925 (hardware) + $1,020-1,860 (monthly) = **$2,945-3,785**
- Year 2+: $1,020-1,860/year
- **Similar cost to Option 3 but with remote access**

### Pros & Cons

**Pros:**
✅ Maximum security (PHI never leaves premises)
✅ Remote access from anywhere (cloud web app)
✅ Cheapest cloud hosting (~$0-10/month)
✅ HIPAA compliance easier (data on-premise)
✅ Complete data sovereignty
✅ No cloud database costs
✅ Scalable (add branches without cloud cost increase)
✅ Works even if cloud goes down (local access still works)

**Cons:**
❌ Requires VPN setup (WireGuard)
❌ Local server must be always-on
❌ Slightly more complex setup
❌ Requires static IP or dynamic DNS per branch
❌ Network latency (cloud → VPN → local)

### Best For:
- **Maximum security + remote access** (BEST BALANCE)
- HIPAA compliance priority
- Budget-conscious organizations
- Long-term deployment (2+ years)
- Multiple branches with independent data
- Technical staff available for VPN setup

### Implementation Timeline: 2-3 weeks (VPN + cloud setup)

### Security Benefits:

**Why This is Most Secure:**
1. **Zero PHI in Cloud**: Database never leaves branch premises
2. **Encrypted Tunnel**: VPN encrypts all cloud-to-local traffic
3. **No Cloud Breach Risk**: Even if cloud is hacked, no patient data to steal
4. **Local Control**: You own and control all sensitive data
5. **Compliance**: Easier HIPAA compliance (data on-premise)

### VPN Setup (WireGuard):

```bash
# Install WireGuard on local server
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <local_server_private_key>

[Peer]
# Cloud server
PublicKey = <cloud_server_public_key>
AllowedIPs = 10.0.0.2/32
PersistentKeepalive = 25

# Start VPN
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

**Cloud API Gateway Configuration:**

```typescript
// Cloud server (Express API gateway)
import express from 'express';
import axios from 'axios';

const app = express();

// Route requests to local branch via VPN
app.post('/api/patients', authenticateToken, async (req, res) => {
  const branchId = req.user.branchId;
  const localServerUrl = getLocalServerUrl(branchId);  // VPN IP
  
  try {
    // Forward request to local server
    const response = await axios.post(
      `${localServerUrl}/api/patients`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${req.user.token}`,
          'X-Branch-ID': branchId
        },
        timeout: 10000  // 10 second timeout
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Local server unavailable' });
  }
});
```

---

## Deployment Option Comparison Table

| Feature | Option 1: Full Cloud | Option 2: Hybrid | Option 3: Fully Local | Option 4: Reverse Hybrid ⭐ |
|---------|---------------------|------------------|----------------------|---------------------------|
| **Year 1 Cost** | $2,040-5,016 | $2,990-3,710 | $2,945-3,665 | $2,945-3,785 |
| **Year 2+ Cost** | $2,040-5,016/year | $1,140-1,860/year | $1,020-1,740/year | $1,020-1,860/year |
| **Upfront Cost** | $0 | $1,850 | $1,925 | $1,925 |
| **Security** | ⚠️ Medium | ✅ High | ✅ Maximum | ✅ Maximum |
| **HIPAA Compliance** | ⚠️ Requires BAA | ✅ Easier | ✅ Easiest | ✅ Easiest |
| **Remote Access** | ✅ Built-in | ✅ Built-in | ❌ Needs VPN | ✅ Built-in |
| **PHI Location** | ❌ Cloud | ⚠️ Partial Cloud | ✅ Local Only | ✅ Local Only |
| **Maintenance** | ✅ Minimal | ⚠️ Moderate | ❌ High | ⚠️ Moderate |
| **Scalability** | ✅ Easy | ⚠️ Moderate | ❌ Manual | ✅ Easy |
| **Data Sovereignty** | ❌ Cloud | ✅ Local AI | ✅ Complete | ✅ Complete |
| **Internet Dependency** | ❌ Required | ⚠️ Partial | ✅ Optional | ⚠️ Partial |
| **Setup Time** | 1-2 weeks | 2-4 weeks | 1-2 weeks | 2-3 weeks |
| **Technical Skill** | Low | Medium | High | Medium-High |
| **Cloud Breach Risk** | ❌ High | ⚠️ Medium | ✅ None | ✅ None |

---

## Recommended Deployment Strategy

### Phase 1: Start with Option 3 (Fully Local)
- Deploy immediately using Docker
- Test with 1-2 branches
- Validate AI models and OCR accuracy
- Gather user feedback
- **Timeline: 2-4 weeks**

### Phase 2: Migrate to Option 4 (Reverse Hybrid) ⭐ RECOMMENDED
- Once validated, set up VPN infrastructure
- Deploy lightweight cloud web app (Vercel/Netlify)
- Configure API gateway to route to local servers
- Enable remote access for all branches
- Keep database and AI local for security
- **Timeline: 2-3 weeks**

### Phase 3: Scale or Optimize
- Monitor costs and usage
- Optimize based on actual workload
- Consider Option 2 if VPN becomes bottleneck
- Never use Option 1 unless hardware maintenance becomes unmanageable

---

## Hardware Specifications (Options 2 & 3)

### Minimum Spec PC for RX 580 AI Workload

**Budget AMD Build (~$320-385):**

| Component | Specification | Cost (Used/New) |
|-----------|---------------|-----------------|
| CPU | AMD Ryzen 5 1600 (6C/12T) | $50 used |
| Motherboard | B450 chipset | $60 used |
| RAM | 16GB DDR4 2666MHz (2x8GB) | $40 used |
| GPU | AMD RX 580 8GB | $100 used |
| PSU | 500W 80+ Bronze (EVGA/Corsair) | $50 new |
| Storage | 240GB SATA SSD (Option 2) | $30 new |
| Storage | 500GB SATA SSD (Option 3) | $45 new |
| Case | Budget ATX with airflow | $40 new |
| **Total (Option 2)** | | **~$370** |
| **Total (Option 3)** | | **~$385** |

**Alternative Budget Intel Build (~$300-350):**

| Component | Specification | Cost (Used/New) |
|-----------|---------------|-----------------|
| CPU | Intel i5-4570 (4C/4T) | $25 used |
| Motherboard | H81/B85 chipset | $50 used |
| RAM | 16GB DDR3 (2x8GB) | $25 used |
| GPU | AMD RX 580 8GB | $100 used |
| PSU | 500W 80+ Bronze | $50 new |
| Storage | 240-500GB SATA SSD | $30-45 new |
| Case | Budget ATX | $40 new |
| **Total** | | **~$320-385** |

### Power Consumption

**Per Branch System:**
- Idle: 50-60W
- AI workload: 180-220W (average)
- Peak: 250-300W

**Monthly Electricity Cost (per branch):**
- 200W average × 24h × 30 days = 144 kWh/month
- At $0.12/kWh = $17/month
- At $0.20/kWh = $29/month

**5 Branches Total:**
- At $0.12/kWh = $85/month
- At $0.20/kWh = $145/month

### LLM Model Options for 8GB VRAM

**Recommended Primary Model:**
- **Qwen 2.5 7B Instruct (Q4 quantized)**: ~4.5GB VRAM
  - Best for agentic workflows and function calling
  - Superior structured output (JSON) generation
  - Excellent system instruction following (guardrails)
  - Faster inference than Llama 3.2 8B
  - Strong multilingual support for medical terminology
  - Better reasoning for database query generation

**Alternative Model:**
- **Llama 3.2 8B Instruct (Q4 quantized)**: ~5GB VRAM
  - Good function calling capabilities
  - Strong general reasoning
  - Use if Qwen compatibility issues arise

**Other Options:**
- **Mistral 7B v0.3 Instruct (Q4)**: ~4.5GB VRAM - Fast inference, good instruction following
- **Phi-3 Medium 14B (Q4)**: ~7GB VRAM - Higher quality but slower, less VRAM headroom

**OCR Model Stack:**
- **PaddleOCR v4**: ~1GB VRAM - Printed text and layout detection
- **TrOCR (microsoft/trocr-base-handwritten)**: ~2-3GB VRAM - Handwritten text recognition
- **Total OCR VRAM**: ~3-4GB
- **Combined LLM + OCR**: ~7.5-8.5GB (fits in 8GB with careful memory management)

**Memory Management Strategy:**
- Load Qwen 2.5 7B on startup (~4.5GB)
- Load OCR models on-demand when processing documents (~3-4GB)
- Unload OCR models after processing to free VRAM
- Keep LLM resident for chatbot responsiveness

---

## Docker Deployment (Option 3)

### Docker Compose Stack

The fully local deployment uses Docker Compose to orchestrate all services:

```yaml
services:
  - frontend (React + Nginx)
  - backend (Express + Node.js)
  - database (PostgreSQL)
  - ollama (LLM service with GPU passthrough)
  - ocr-processor (Python + Tesseract/TrOCR)
```

### System Requirements

**Docker Host:**
- Ubuntu 22.04 LTS or newer
- Docker Engine 24.0+
- Docker Compose 2.20+
- NVIDIA Container Toolkit (for GPU passthrough)

### Deployment Steps

1. Install Ubuntu 22.04 LTS on local PC
2. Install Docker and Docker Compose
3. Configure GPU passthrough for Ollama container
4. Clone MediFlow repository
5. Run `docker-compose up -d`
6. Access application at `http://localhost:3000`

### Data Persistence

**Docker Volumes:**
- `postgres_data`: Database storage
- `ollama_models`: AI model cache
- `document_storage`: Medical document files
- `logs`: Application logs

**Backup Strategy:**
- Daily automated backups to external USB drive
- Weekly manual backups to cloud storage (encrypted)
- Monthly full system snapshots

---

## Final Recommendation

**For immediate deployment and maximum security:** Start with **Option 3 (Fully Local)** using Docker.

**For long-term production with remote access:** Migrate to **Option 2 (Hybrid)** after validation.

**Avoid Option 1 (Full Cloud)** unless you have ongoing budget for $2,000-5,000/year and don't prioritize data sovereignty.

