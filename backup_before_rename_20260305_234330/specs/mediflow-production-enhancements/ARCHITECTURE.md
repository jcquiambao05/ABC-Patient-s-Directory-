# ABC Patient Directory - System Architecture

## Overview

ABC Patient Directory is a medical records management system built with:
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL
- **OCR:** Tesseract + Python Flask
- **Authentication:** JWT-based

## System Components

### 1. Web Application (Port 3000)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Framer Motion for animations
- Lucide React for icons

**Key Features:**
- Patient directory with cabinet organization (A-Z)
- Medical chart viewing and editing
- Document upload with AI extraction
- Real-time OCR processing feedback
- JWT-based authentication

**File Structure:**
```
src/
├── components/
│   ├── App.tsx          # Main application component
│   ├── Login.tsx        # Authentication UI
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
└── auth/
    └── authRoutes.ts    # Authentication routes
```

### 2. Backend Server (Port 3000)

**Technology Stack:**
- Express.js for REST API
- PostgreSQL client (pg)
- JWT for authentication
- bcrypt for password hashing

**API Endpoints:**

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

**Patients:**
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `PATCH /api/patients/:id/last-visit` - Update last visit date

**Medical Charts:**
- `GET /api/medical-charts/:patient_id` - Get patient charts
- `PUT /api/medical-charts/:id` - Update chart (review)
- `DELETE /api/medical-charts/:id` - Delete chart

**OCR Processing:**
- `POST /api/process-document` - Process document for existing patient
- `POST /api/patients/ai-create` - Create patient from document

**Health:**
- `GET /api/health` - Server health check
- `GET /api/ocr/health` - OCR service health check
- `GET /api/ocr/templates` - List OCR templates

### 3. OCR Service (Port 5000)

**Technology Stack:**
- Python 3 + Flask
- Tesseract OCR for text extraction
- PIL (Pillow) for image processing
- Flask-CORS for cross-origin requests

**Endpoints:**
- `GET /health` - Service health check
- `GET /templates` - List available templates
- `POST /process` - Process document image

**Processing Pipeline:**
1. Receive base64-encoded image
2. Decode and convert to PIL Image
3. Extract text using Tesseract OCR
4. Apply regex patterns for structured data extraction
5. Normalize dates, phone numbers, etc.
6. Return extracted data with confidence scores

**Extraction Patterns:**
- Patient Name (filters out headers)
- Date of Birth (multiple formats → YYYY-MM-DD)
- Phone (flexible formatting)
- Email (standard validation)
- Address (multi-line support)
- Gender (M/F → male/female)
- Diagnosis, Treatment, Vitals, Medications

### 4. Database (PostgreSQL)

**Schema:**

```sql
-- Patients table
CREATE TABLE patients (
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

-- Medical charts (AI-extracted)
CREATE TABLE medical_charts (
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

-- Users (authentication)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (JWT validation)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Data Flow

### Patient Creation from Document (AI Upload Entry)

```
1. User uploads document image
   ↓
2. Frontend sends base64 image to /api/patients/ai-create
   ↓
3. Backend forwards to OCR service (localhost:5000/process)
   ↓
4. OCR service:
   - Extracts text with Tesseract
   - Applies regex patterns
   - Normalizes data (dates, phone, etc.)
   - Returns structured JSON
   ↓
5. Backend:
   - Parses extracted data
   - Creates patient record
   - Creates medical chart record
   - Returns patient_id and chart_id
   ↓
6. Frontend:
   - Refreshes patient list
   - Opens new patient details
```

### Document Processing for Existing Patient (AI Upload)

```
1. User selects patient and uploads document
   ↓
2. Frontend sends image + patient_id to /api/process-document
   ↓
3. Backend forwards to OCR service
   ↓
4. OCR extracts and structures data
   ↓
5. Backend creates medical chart record
   ↓
6. Frontend refreshes patient details
```

### Authentication Flow

```
1. User enters credentials
   ↓
2. Frontend sends to /api/auth/login
   ↓
3. Backend:
   - Verifies password with bcrypt
   - Generates JWT token (8-hour expiry)
   - Creates session record
   - Returns token
   ↓
4. Frontend:
   - Stores token in localStorage
   - Includes in Authorization header for all requests
   ↓
5. Backend middleware:
   - Validates JWT on each request
   - Checks session not expired
   - Allows/denies access
```

## Security Architecture

### Authentication
- JWT tokens with 8-hour expiration
- bcrypt password hashing (cost factor 12)
- Session tracking in database
- Automatic logout on token expiry

### Authorization
- All API endpoints require valid JWT
- Middleware validates token on every request
- No role-based access (single admin per instance)

### Data Protection
- Passwords never stored in plain text
- JWT secret stored in environment variable
- Database credentials in .env file
- CORS configured for localhost only

### Input Validation
- SQL injection prevention (parameterized queries)
- XSS prevention (React auto-escaping)
- File upload validation (type, size limits)
- OCR input sanitization

## Performance Considerations

### OCR Processing
- **Average time:** 3-5 seconds per document
- **Bottleneck:** Tesseract text extraction
- **Optimization:** Process one document at a time
- **Future:** Queue system for multiple uploads

### Database Queries
- Indexed columns: patient_id, visit_date, created_at
- GIN index on JSONB custom_fields
- Efficient joins for patient details
- Pagination for large result sets

### Frontend
- React component memoization
- Lazy loading for images
- Debounced search input
- Optimistic UI updates

## Scalability

### Current Limitations
- Single OCR service instance
- No load balancing
- Local file storage
- Single database connection

### Future Enhancements
- Multiple OCR workers
- Redis for session caching
- S3/object storage for documents
- Database connection pooling
- Horizontal scaling with load balancer

## Deployment Architecture

### Development
```
[Developer Machine]
├── Web App (localhost:3000)
├── OCR Service (localhost:5000)
└── PostgreSQL (localhost:5432 or Supabase)
```

### Production (Recommended)
```
[Cloud Server - Web App]
├── Nginx (reverse proxy)
├── Node.js (Express backend)
├── React (static files)
└── PostgreSQL (managed service)

[On-Premise - OCR Processing]
├── Python Flask (OCR service)
├── Tesseract OCR
└── VPN connection to cloud
```

## Technology Choices

### Why React?
- Component-based architecture
- Large ecosystem
- TypeScript support
- Fast development

### Why Express?
- Lightweight and flexible
- Large middleware ecosystem
- Easy REST API creation
- Good TypeScript support

### Why PostgreSQL?
- ACID compliance
- JSONB support for flexible data
- Mature and stable
- Good performance

### Why Tesseract?
- Open source and free
- Good accuracy for printed text
- No GPU required
- Widely supported

### Why JWT?
- Stateless authentication
- Easy to implement
- Works well with REST APIs
- No server-side session storage needed

## File Organization

```
ABC-Patient-Directory/
├── src/
│   ├── components/       # React components
│   └── auth/            # Authentication logic
├── database/            # SQL schema files
├── .kiro/specs/         # Documentation
├── ocr_service_simple.py # OCR service
├── medical_chart_templates.json # Extraction patterns
├── server.ts            # Express backend
├── package.json         # Node dependencies
├── .env                 # Environment variables
├── start-mediflow.sh    # Startup script
├── stop-mediflow.sh     # Shutdown script
└── restart-mediflow.sh  # Restart script
```

## Configuration Files

### package.json
- Node.js dependencies
- Build scripts
- Development server config

### tsconfig.json
- TypeScript compiler options
- Path aliases
- Module resolution

### vite.config.ts
- Vite build configuration
- Dev server settings
- Plugin configuration

### medical_chart_templates.json
- OCR extraction patterns
- Field definitions
- Template configurations

### .env
- Database connection string
- JWT secret
- API keys
- Environment-specific settings

## Monitoring and Logging

### Application Logs
- `webapp.log` - Web application logs
- `ocr_service.log` - OCR service logs
- Console output during development

### Health Checks
- `/api/health` - Web app status
- `/health` - OCR service status
- Database connection verification

### Error Handling
- Try-catch blocks in all async operations
- Graceful error messages to users
- Detailed error logging for debugging
- HTTP status codes for API responses

## Future Architecture Considerations

### Microservices
- Separate authentication service
- Dedicated OCR worker pool
- Document storage service
- Notification service

### Caching
- Redis for session storage
- CDN for static assets
- Database query caching
- OCR result caching

### Message Queue
- RabbitMQ/Redis for OCR jobs
- Async document processing
- Retry logic for failed jobs
- Priority queue for urgent documents

### Monitoring
- Application performance monitoring (APM)
- Error tracking (Sentry)
- Log aggregation (ELK stack)
- Uptime monitoring

## Conclusion

The current architecture is designed for:
- **Simplicity:** Easy to understand and maintain
- **Reliability:** Stable and proven technologies
- **Security:** JWT authentication and input validation
- **Performance:** Fast enough for single-clinic use
- **Scalability:** Can be enhanced for multi-clinic deployment

For production deployment with multiple clinics, see `DEPLOYMENT.md` for recommended enhancements.
