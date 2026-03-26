# Implementation Plan: MediFlow Production Enhancements

## Overview

This implementation plan transforms MediFlow AI from a development prototype into a production-ready medical records management system with secure authentication, agentic AI chatbot, hybrid OCR processing, and HIPAA-compliant architecture. The system uses a Reverse Hybrid Architecture where the web application runs in cloud hosting while AI processing (LLM + OCR) and patient data remain on local branch hardware.

## Tasks

- [ ] 1. Set up database schema and authentication infrastructure
  - [ ] 1.1 Create authentication database tables
    - Create users table with bcrypt password hashing
    - Create sessions table for JWT token validation
    - Create audit_logs table for security compliance
    - Add branch_id columns to existing patients, emrs, and documents tables for multi-tenant isolation
    - Create indexes for performance optimization
    - _Requirements: 1.1, 1.2, 1.6, 6.1, 6.2_

  - [ ] 1.2 Implement password hashing and validation utilities
    - Create bcrypt utility functions for password hashing (cost factor 12)
    - Implement constant-time password comparison
    - Add password strength validation (minimum 8 characters)
    - _Requirements: 1.6_

  - [ ] 1.3 Implement JWT token generation and validation
    - Create JWT signing function with 8-hour expiration
    - Implement JWT verification middleware for Express
    - Add token refresh mechanism
    - Store JWT payload structure (userId, email, branchId, role, iat, exp)
    - _Requirements: 1.2, 1.5, 1.7_

  - [ ]* 1.4 Write property tests for authentication
    - **Property 1: Valid Credentials Create Session**
    - **Validates: Requirements 1.2**
    - **Property 2: Invalid Credentials Deny Access**
    - **Validates: Requirements 1.3**
    - **Property 5: Password Hashing**
    - **Validates: Requirements 1.6**
    - **Property 6: Logout Invalidates Session**
    - **Validates: Requirements 1.7**

- [ ] 2. Implement authentication API endpoints
  - [ ] 2.1 Create POST /api/auth/login endpoint
    - Validate email and password from request body
    - Query users table with bcrypt password verification
    - Generate JWT token on successful authentication
    - Create session record in sessions table
    - Return token and user info (id, email, branchId)
    - Log failed login attempts to audit_logs
    - _Requirements: 1.2, 1.3_

  - [ ] 2.2 Create POST /api/auth/logout endpoint
    - Validate JWT token from Authorization header
    - Invalidate session in sessions table
    - Return success response
    - _Requirements: 1.7_

  - [ ] 2.3 Create GET /api/auth/me endpoint
    - Validate JWT token from Authorization header
    - Return current user info from token payload
    - Update last_activity timestamp in sessions table
    - _Requirements: 1.8, 6.2_

  - [ ] 2.4 Create POST /api/auth/refresh endpoint
    - Validate existing JWT token
    - Generate new JWT token with extended expiration
    - Update session record
    - _Requirements: 1.5_

  - [ ] 2.5 Implement authentication middleware
    - Create Express middleware to validate JWT on protected routes
    - Check session expiration (8 hours)
    - Reject requests with 401 Unauthorized if invalid
    - Apply middleware to all patient data endpoints
    - _Requirements: 1.5, 1.8_

  - [ ]* 2.6 Write property tests for authentication endpoints
    - **Property 3: One Admin Per Branch**
    - **Validates: Requirements 1.4**
    - **Property 4: Session Expiration**
    - **Validates: Requirements 1.5**
    - **Property 7: Protected Endpoints Require Authentication**
    - **Validates: Requirements 1.8**
    - **Property 8: Session Token Storage and Validation**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 3. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement chatbot function definitions and executor
  - [ ] 4.1 Define chatbot function whitelist
    - Create CHATBOT_FUNCTIONS array with function definitions
    - Define get_patient_info function (parameters: patient_id or patient_name)
    - Define search_patients function (parameters: query, limit)
    - Define get_emr_history function (parameters: patient_id, limit, start_date)
    - Define get_document_list function (parameters: patient_id, document_type)
    - Define get_patient_count function (no parameters)
    - _Requirements: 2.1, 2.2, 3.10_

  - [ ] 4.2 Implement function executor with prepared statements
    - Create executeChatbotFunction() with function name validation against whitelist
    - Implement parameter validation (type checking, range limits)
    - Add branch_id to all queries for multi-tenant isolation
    - Implement each function using PostgreSQL prepared statements exclusively
    - Enforce result limit of 100 records maximum
    - _Requirements: 2.6, 2.9, 3.8, 3.9, 3.12_

  - [ ] 4.3 Implement SQL injection prevention
    - Use parameterized queries ($1, $2, etc.) for all database operations
    - Never concatenate user input into SQL strings
    - Validate and sanitize all function parameters
    - _Requirements: 2.8, 3.11_

  - [ ]* 4.4 Write property tests for function execution
    - **Property 11: Prepared Statements Only**
    - **Validates: Requirements 2.6, 3.8**
    - **Property 12: SQL Injection Prevention**
    - **Validates: Requirements 2.8, 3.11**
    - **Property 13: Function Parameter Validation**
    - **Validates: Requirements 2.9, 3.9**
    - **Property 23: Function Whitelist Enforcement**
    - **Validates: Requirements 3.10**
    - **Property 24: Result Limit Enforcement**
    - **Validates: Requirements 3.12**

- [ ] 5. Implement AI safety guardrails
  - [ ] 5.1 Create system instruction for Ollama
    - Define SYSTEM_INSTRUCTION with critical rules
    - Specify medical advice prohibition
    - List available functions and usage guidelines
    - Include example function call format
    - _Requirements: 3.1, 3.3_

  - [ ] 5.2 Implement prompt injection detection
    - Create INJECTION_PATTERNS array with regex patterns
    - Implement detectPromptInjection() function
    - Block requests matching injection patterns
    - Log security events to audit_logs
    - Return generic error message "Invalid request detected"
    - _Requirements: 3.6, 3.14_

  - [ ] 5.3 Implement medical advice detection
    - Create patterns to detect medical advice requests
    - Return disclaimer message directing to medical professionals
    - Log medical advice requests to audit_logs
    - _Requirements: 3.1, 3.3_

  - [ ] 5.4 Implement rate limiting
    - Track chatbot requests per user per hour
    - Enforce 60 requests per hour limit
    - Return 429 Too Many Requests when exceeded
    - Include retry_after in response
    - _Requirements: 3.13_

  - [ ] 5.5 Implement cross-branch access prevention
    - Validate branch_id in all function calls matches user's branch
    - Reject queries attempting to access other branches
    - Log cross-branch access attempts to audit_logs
    - _Requirements: 3.5_

  - [ ] 5.6 Implement audit logging for all interactions
    - Log every chatbot query with timestamp, user_id, branch_id, query text
    - Log all blocked requests with reason codes
    - Log function calls and results
    - _Requirements: 3.4, 3.16_

  - [ ]* 5.7 Write property tests for guardrails
    - **Property 17: Medical Advice Rejection**
    - **Validates: Requirements 3.1, 3.3**
    - **Property 18: Session-Bound Data Access**
    - **Validates: Requirements 3.2**
    - **Property 19: Interaction Logging**
    - **Validates: Requirements 3.4**
    - **Property 20: Cross-Branch Access Prevention**
    - **Validates: Requirements 3.5**
    - **Property 21: Prompt Injection Detection**
    - **Validates: Requirements 3.6, 3.14**
    - **Property 25: Rate Limiting**
    - **Validates: Requirements 3.13**
    - **Property 26: Blocked Request Audit Log**
    - **Validates: Requirements 3.16**

- [ ] 6. Implement chatbot API endpoints and Ollama integration
  - [ ] 6.1 Create POST /api/chat endpoint
    - Validate JWT token and extract user info
    - Check rate limiting
    - Detect prompt injection and medical advice requests
    - Maintain conversation context (last 10 messages)
    - Send request to Ollama with system instruction and function definitions
    - Parse Ollama response for function calls
    - Execute function calls using executeChatbotFunction()
    - Send function results back to Ollama for natural language response
    - Stream response to client
    - Log interaction to audit_logs
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.10, 2.11, 2.15_

  - [ ] 6.2 Implement Ollama client wrapper
    - Create HTTP client for Ollama API (localhost:11434)
    - Implement chat completion with function calling
    - Handle streaming responses
    - Implement error handling and retries
    - _Requirements: 2.5, 2.7_

  - [ ] 6.3 Implement conversation context management
    - Store last 10 messages per session in memory or Redis
    - Include context in Ollama requests
    - Clear context on logout or session expiration
    - _Requirements: 2.11_

  - [ ]* 6.4 Write property tests for chatbot endpoints
    - **Property 9: Function Call Generation**
    - **Validates: Requirements 2.3, 2.15**
    - **Property 10: Request Forwarding**
    - **Validates: Requirements 2.4**
    - **Property 14: Conversation Context Limit**
    - **Validates: Requirements 2.11**
    - **Property 16: Local PHI Processing**
    - **Validates: Requirements 2.14**

- [ ] 7. Checkpoint - Ensure chatbot tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement OCR processing engine (Python)
  - [ ] 8.1 Set up Python OCR service with Flask
    - Create Flask application on port 5000
    - Install Tesseract OCR and pytesseract dependencies
    - Create POST /process endpoint
    - _Requirements: 4.3, 4.4_

  - [ ] 8.2 Implement Tesseract OCR processing
    - Initialize pytesseract with custom configuration (--oem 3 --psm 6)
    - Implement process_document() method
    - Load and preprocess images (convert to RGB, enhance contrast)
    - Extract text using Tesseract
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ] 8.3 Implement regex-based field extraction
    - Load extraction patterns from medical_chart_templates.json
    - Implement extract_with_patterns() method
    - Extract patient_name with header filtering (exclude "PATIENT MEDICAL CHART" etc.)
    - Extract date_of_birth, gender, phone, email, address
    - Extract diagnosis, treatment_plan, medications, allergies
    - _Requirements: 4.6, 4.8_

  - [ ] 8.4 Implement date normalization
    - Create normalize_date() function
    - Support multiple date formats (MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.)
    - Convert all dates to YYYY-MM-DD format
    - Handle invalid dates gracefully
    - _Requirements: 4.7_

  - [ ] 8.5 Implement structured field extraction
    - Create format_to_template() method
    - Map extracted fields to template structure
    - Handle missing required fields
    - Store unmatched data in additional_notes
    - Return structured JSON with custom_fields
    - _Requirements: 4.9_

  - [ ] 8.6 Implement confidence scoring
    - Calculate overall confidence score (0.0-1.0)
    - Use Tesseract confidence values (default 0.90 for printed text)
    - Include confidence in response metadata
    - _Requirements: 13.9_

  - [ ] 8.7 Implement temporary file cleanup
    - Process document from base64 image data
    - Delete temporary files after processing (success or failure)
    - _Requirements: 4.15_

  - [ ]* 8.8 Write property tests for OCR engine
    - **Property 27: Image Format Support**
    - **Validates: Requirements 4.1**
    - **Property 32: Positional Information Extraction** (simplified for Tesseract)
    - **Validates: Requirements 4.8**
    - **Property 36: Temporary File Cleanup**
    - **Validates: Requirements 4.15**
    - **Property 40: Confidence Score Range**
    - **Validates: Requirements 13.9**

- [ ] 9. Implement OCR API endpoints and document processing flow
  - [ ] 9.1 Create POST /api/process-document endpoint
    - Validate JWT token
    - Accept document upload (JPEG, PNG, PDF)
    - Validate file format and size (max 10MB)
    - Send base64 image data to local OCR service
    - _Requirements: 4.1, 4.2_

  - [ ] 9.2 Implement local OCR service integration
    - Create HTTP client for OCR service (localhost:5000)
    - Send image data as base64 to OCR service
    - Call OCR service with template parameter
    - Receive extracted text and structured data
    - _Requirements: 4.3, 4.10_

  - [ ] 9.3 Implement medical chart creation from OCR results
    - Create medical_charts record with extracted data
    - Parse patient name (handle "LastName, FirstName" and "FirstName LastName" formats)
    - Normalize gender values (M/F/Male/Female → male/female/other)
    - Clean phone numbers (remove extra whitespace)
    - Clean email addresses (trim and lowercase)
    - Clean addresses (remove excessive whitespace)
    - Populate diagnosis, treatment_plan, notes fields
    - Store structured data in custom_fields JSONB column
    - Store OCR metadata (processing time, confidence, template used)
    - Set reviewed flag to false for human verification
    - _Requirements: 4.10, 13.1, 13.2, 13.3, 13.7, 13.9_

  - [ ] 9.4 Implement OCR error handling
    - Handle unsupported file formats (return 400)
    - Handle file size limits (return 413)
    - Handle OCR processing failures (mark document as "failed")
    - Store error messages in document metadata
    - Handle empty text extraction (no readable text)
    - _Requirements: 4.11_

  - [ ] 9.5 Implement document queue processing
    - Queue multiple documents for sequential processing
    - Process one document at a time on local server
    - Update document status throughout processing
    - _Requirements: 4.14_

  - [ ]* 9.6 Write property tests for OCR endpoints
    - **Property 28: Document Upload Flow**
    - **Validates: Requirements 4.2**
    - **Property 29: Tesseract OCR Processing** (updated from Hybrid)
    - **Validates: Requirements 4.3**
    - **Property 33: OCR Completion Flow**
    - **Validates: Requirements 4.10**
    - **Property 34: OCR Failure Handling**
    - **Validates: Requirements 4.11**
    - **Property 35: Document Queue Processing**
    - **Validates: Requirements 4.14**

- [ ] 10. Checkpoint - Ensure OCR tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement enhanced EMR data structure
  - [ ] 11.1 Create enhanced EMR database schema
    - Add custom_fields JSONB column to emrs table
    - Add metadata JSONB column for OCR structure
    - Add confidence_score REAL column
    - Add reviewed BOOLEAN column
    - Add reviewer_notes TEXT column
    - Add version INTEGER column
    - Add document_type TEXT column
    - Create GIN index on custom_fields for JSON queries
    - _Requirements: 13.1, 13.2, 13.3, 13.7, 13.9_

  - [ ] 11.2 Create EMR TypeScript interfaces
    - Define EMR interface with all fields
    - Define custom_fields structure (vitals, lab_results, medications, follow_up)
    - Define metadata structure (ocr_engine, processing_time, detected_sections)
    - Define document_type enum
    - _Requirements: 13.2, 13.3_

  - [ ] 11.3 Implement EMR CRUD operations
    - Create EMR with validation
    - Update EMR with version tracking
    - Query EMRs with custom_fields filtering
    - Support flexible JSON queries on custom_fields
    - _Requirements: 13.2, 13.7_

  - [ ]* 11.4 Write property tests for EMR data structure
    - **Property 37: EMR Schema Compliance**
    - **Validates: Requirements 13.1, 13.2**
    - **Property 38: Custom Fields JSON Validity**
    - **Validates: Requirements 13.2, 13.7**
    - **Property 39: Document Type Classification**
    - **Validates: Requirements 13.3**

- [ ] 12. Set up VPN infrastructure (WireGuard)
  - [ ] 12.1 Create WireGuard configuration generator
    - Generate public/private key pairs for each branch
    - Create server configuration for cloud API gateway
    - Create client configurations for each branch (5 branches)
    - Assign static VPN IPs (10.0.0.1 - 10.0.0.5)
    - Set persistent keepalive to 25 seconds
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 12.2 Create branch configuration management
    - Create BRANCH_CONFIG object with VPN IPs and API tokens
    - Store API tokens in environment variables
    - Create branch-to-VPN-IP mapping
    - _Requirements: 5.2, 5.4_

  - [ ] 12.3 Implement cloud-to-local request forwarding
    - Create HTTP client for VPN communication
    - Add branch API token to Authorization header
    - Forward authenticated requests to branch VPN IP
    - Handle connection failures with retries
    - _Requirements: 2.4, 2.13, 5.5_

  - [ ] 12.4 Implement local API server
    - Create Express server on local branch hardware
    - Validate API token on incoming requests
    - Connect to local PostgreSQL database
    - Connect to local Ollama service (localhost:11434)
    - Connect to local OCR service (localhost:5000)
    - Execute database queries and AI operations
    - Return results to cloud gateway
    - _Requirements: 2.13, 2.14, 5.5_

  - [ ]* 12.5 Write property tests for VPN communication
    - **Property 15: HTTPS and Token Authentication**
    - **Validates: Requirements 2.13**

- [ ] 13. Implement deployment configurations
  - [ ] 13.1 Create cloud deployment configuration
    - Create Dockerfile for cloud API gateway
    - Configure environment variables for branch VPN IPs and tokens
    - Set up WireGuard in Docker container
    - Create docker-compose.yml for cloud deployment
    - _Requirements: 5.1, 5.2_

  - [ ] 13.2 Create local branch deployment configuration
    - Create Dockerfile for local API server
    - Create docker-compose.yml with PostgreSQL, Ollama, OCR service
    - Configure GPU passthrough for Ollama and OCR
    - Set up WireGuard client configuration
    - Create startup scripts for all services
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 13.3 Create deployment documentation
    - Document cloud deployment steps (Hetzner/DigitalOcean)
    - Document local branch setup (hardware requirements, GPU drivers)
    - Document WireGuard VPN setup for each branch
    - Document environment variable configuration
    - Document Ollama model installation (Qwen 2.5 7B)
    - Document OCR model installation (PaddleOCR + TrOCR)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 14. Implement frontend authentication UI
  - [ ] 14.1 Create Login component
    - Create login form with email and password fields
    - Implement form validation
    - Call POST /api/auth/login on submit
    - Store JWT token in localStorage
    - Redirect to dashboard on success
    - Display error messages on failure
    - _Requirements: 1.2, 1.3_

  - [ ] 14.2 Implement authentication context
    - Create React context for authentication state
    - Provide login, logout, and token refresh functions
    - Check token expiration on app load
    - Redirect to login if token expired
    - _Requirements: 1.5, 1.7_

  - [ ] 14.3 Implement protected routes
    - Create ProtectedRoute component
    - Check authentication before rendering
    - Redirect to login if not authenticated
    - Apply to all patient data routes
    - _Requirements: 1.8_

  - [ ] 14.4 Add JWT token to API requests
    - Create Axios interceptor to add Authorization header
    - Include Bearer token in all API requests
    - Handle 401 responses by redirecting to login
    - _Requirements: 1.8_

- [ ] 15. Implement chatbot UI
  - [ ] 15.1 Create Chatbot component
    - Create chat interface with message list and input field
    - Display user messages and AI responses
    - Show loading indicator during AI processing
    - Handle streaming responses from API
    - _Requirements: 2.10_

  - [ ] 15.2 Implement chat message handling
    - Send user messages to POST /api/chat
    - Display AI responses in real-time
    - Show error messages for failed requests
    - Display guardrail messages (medical advice disclaimer)
    - _Requirements: 2.10, 3.1_

  - [ ] 15.3 Implement conversation history display
    - Show last 10 messages in chat interface
    - Auto-scroll to latest message
    - Clear history on logout
    - _Requirements: 2.11_

- [ ] 16. Implement document upload and OCR UI
  - [ ] 16.1 Create DocumentUpload component
    - Create file upload interface (drag-and-drop or file picker)
    - Validate file format (JPEG, PNG, PDF)
    - Validate file size (max 10MB)
    - Show upload progress
    - _Requirements: 4.1, 4.2_

  - [ ] 16.2 Implement OCR processing status display
    - Show processing status (queued, processing, completed, failed)
    - Display extracted text preview
    - Show confidence score with warning if low
    - Allow manual review and correction
    - _Requirements: 4.10, 4.11, 13.9_

  - [ ] 16.3 Create EMR review interface
    - Display extracted structured data (diagnosis, treatment, vitals, medications)
    - Allow editing of extracted fields
    - Mark EMR as reviewed after verification
    - Save corrections to database
    - _Requirements: 13.2, 13.7, 13.9_

- [ ] 17. Set up testing infrastructure
  - [ ] 17.1 Configure Jest and fast-check
    - Install Jest and fast-check dependencies
    - Create jest.config.js with TypeScript support
    - Set test timeout to 30 seconds for property tests
    - Create test database configuration
    - _Requirements: All properties_

  - [ ] 17.2 Create test utilities and factories
    - Create user factory for test data generation
    - Create patient factory
    - Create EMR factory
    - Create database cleanup utilities
    - Implement transaction rollback for test isolation
    - _Requirements: All properties_

  - [ ] 17.3 Set up CI/CD pipeline
    - Create GitHub Actions workflow for tests
    - Run unit tests on every push
    - Run property tests on every push
    - Generate code coverage reports
    - Fail build if coverage below 80%
    - _Requirements: All properties_

- [ ] 18. Final integration and testing
  - [ ] 18.1 Run all property-based tests
    - Execute all 40 property tests with 100 iterations each
    - Verify all properties pass
    - Fix any failing properties
    - _Requirements: All properties_

  - [ ] 18.2 Run end-to-end integration tests
    - Test complete authentication flow
    - Test chatbot query with function calling
    - Test document upload and OCR processing
    - Test cross-branch access prevention
    - Test rate limiting
    - _Requirements: All requirements_

  - [ ] 18.3 Perform security audit
    - Verify all SQL queries use prepared statements
    - Verify prompt injection detection works
    - Verify cross-branch access is blocked
    - Verify audit logging captures all security events
    - Review error messages for information leakage
    - _Requirements: 2.6, 2.8, 3.5, 3.6, 3.11, 3.14, 3.16_

  - [ ] 18.4 Performance testing
    - Test chatbot response time (< 10 seconds)
    - Test OCR processing time (< 30 seconds per page)
    - Test database query performance
    - Test VPN latency
    - Optimize slow queries with indexes
    - _Requirements: 2.7, 4.12_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript for backend/frontend and Python for OCR processing
- All database queries must use prepared statements (no raw SQL)
- All patient data processing happens on local branch servers (HIPAA compliance)
- VPN setup requires manual configuration on each branch's hardware
- Ollama model (Qwen 2.5 7B Q4) requires ~4.5GB VRAM
- OCR models (PaddleOCR + TrOCR) require ~3-4GB VRAM
- Total VRAM requirement: ~8GB (fits on RX 580 8GB)
- Property tests use fast-check library with minimum 100 iterations
- Checkpoints ensure incremental validation at major milestones
