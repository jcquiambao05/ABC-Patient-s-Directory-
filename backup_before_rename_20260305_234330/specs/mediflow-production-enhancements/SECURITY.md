# MediFlow AI Security Implementation Guide

**Purpose:** Comprehensive security requirements and implementation strategies for protecting patient health information (PHI) across all deployment options.

---

## Security Principles

### Core Security Tenets:

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimum access rights for users and services
3. **Data Sovereignty**: PHI processing stays on-premise when possible
4. **Zero Trust**: Verify every request, never assume trust
5. **Audit Everything**: Log all access to sensitive data
6. **Encryption Everywhere**: Data at rest, in transit, and in use

---

## 1. Authentication & Authorization

### 1.1 User Authentication

**Implementation:**

```typescript
// Use bcrypt for password hashing (NOT plain text or MD5)
import bcrypt from 'bcrypt';

// Registration
const saltRounds = 12;  // Higher = more secure but slower
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Login
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Requirements:**
- ✅ Minimum password length: 12 characters
- ✅ Password complexity: uppercase, lowercase, number, special char
- ✅ Password hashing: bcrypt with salt rounds ≥ 12
- ✅ Account lockout: 5 failed attempts = 15 minute lockout
- ✅ Session timeout: 8 hours of inactivity
- ✅ Force password change: Every 90 days

### 1.2 Session Management

**Implementation:**

```typescript
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PgSession = connectPg(session);

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET,  // 32+ char random string
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    httpOnly: true,               // Prevent XSS
    secure: true,                 // HTTPS only
    sameSite: 'strict'            // CSRF protection
  }
}));
```

**Requirements:**
- ✅ Store sessions in database (NOT memory)
- ✅ Use secure, httpOnly cookies
- ✅ Regenerate session ID after login
- ✅ Invalidate session on logout
- ✅ Clean up expired sessions daily

### 1.3 JWT Tokens (API Authentication)

**Implementation:**

```typescript
import jwt from 'jsonwebtoken';

// Generate token
const token = jwt.sign(
  { 
    userId: user.id, 
    branchId: user.branch_id,
    role: 'admin'
  },
  process.env.JWT_SECRET,
  { 
    expiresIn: '8h',
    issuer: 'mediflow-ai',
    audience: 'mediflow-api'
  }
);

// Verify token middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

**Requirements:**
- ✅ JWT secret: 256-bit random string (32+ chars)
- ✅ Token expiration: 8 hours maximum
- ✅ Include branch_id in token for data isolation
- ✅ Rotate JWT secret every 90 days
- ✅ Blacklist tokens on logout (store in Redis/DB)

---

## 2. Data Encryption

### 2.1 Data at Rest

**Database Encryption:**

```sql
-- Enable PostgreSQL encryption
-- In postgresql.conf:
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted data
INSERT INTO patients (id, ssn_encrypted) 
VALUES (
  'patient_123',
  pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Retrieve encrypted data
SELECT 
  id, 
  pgp_sym_decrypt(ssn_encrypted::bytea, 'encryption_key') as ssn
FROM patients;
```

**File Encryption (Medical Documents):**

```typescript
import crypto from 'crypto';
import fs from 'fs';

// Encrypt file before storage
function encryptFile(inputPath: string, outputPath: string, key: string) {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  
  output.write(iv);  // Store IV at beginning
  input.pipe(cipher).pipe(output);
  
  return new Promise((resolve, reject) => {
    output.on('finish', resolve);
    output.on('error', reject);
  });
}

// Decrypt file for processing
function decryptFile(inputPath: string, outputPath: string, key: string) {
  const algorithm = 'aes-256-gcm';
  const input = fs.createReadStream(inputPath);
  
  // Read IV from beginning of file
  const iv = Buffer.alloc(16);
  input.read(16);  // Skip IV bytes
  
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  const output = fs.createWriteStream(outputPath);
  
  input.pipe(decipher).pipe(output);
  
  return new Promise((resolve, reject) => {
    output.on('finish', resolve);
    output.on('error', reject);
  });
}
```

**Requirements:**
- ✅ Database: AES-256 encryption for PHI columns
- ✅ Files: AES-256-GCM for medical documents
- ✅ Encryption keys: Store in environment variables or key vault
- ✅ Key rotation: Every 12 months
- ✅ Backup encryption: Encrypted backups only

### 2.2 Data in Transit

**HTTPS/TLS Configuration:**

```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-bundle.pem'),
  
  // Security settings
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  honorCipherOrder: true
};

https.createServer(options, app).listen(443);
```

**Requirements:**
- ✅ TLS 1.2 or higher only
- ✅ Strong cipher suites only
- ✅ Valid SSL certificate (Let's Encrypt or commercial)
- ✅ HSTS header: `Strict-Transport-Security: max-age=31536000`
- ✅ Certificate renewal: Auto-renew before expiry

---

## 3. Input Validation & Sanitization

### 3.1 SQL Injection Prevention

**ALWAYS use prepared statements:**

```typescript
// ❌ NEVER DO THIS (SQL Injection vulnerable)
const query = `SELECT * FROM patients WHERE name = '${userInput}'`;

// ✅ ALWAYS DO THIS (Safe)
const query = 'SELECT * FROM patients WHERE name = $1';
const result = await pool.query(query, [userInput]);
```

**Whitelist allowed database functions:**

```typescript
const ALLOWED_FUNCTIONS = [
  'get_patient_info',
  'search_patients',
  'get_emr_history',
  'get_document_list',
  'get_patient_count'
];

function validateFunctionCall(functionName: string) {
  if (!ALLOWED_FUNCTIONS.includes(functionName)) {
    throw new Error(`Function ${functionName} not allowed`);
  }
}
```

### 3.2 Prompt Injection Prevention (LLM Security)

**Detect and block prompt injection:**

```typescript
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /disregard\s+(previous|above|all)\s+(instructions?|rules?)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /\[SYSTEM\]/i,
  /\<\|im_start\|\>/i,  // Special tokens
  /\<\|im_end\|\>/i
];

function detectPromptInjection(userInput: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(userInput));
}

// Use in chatbot endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;
  
  if (detectPromptInjection(message)) {
    await logSecurityEvent('prompt_injection_attempt', req.user.userId, message);
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  // Process message...
});
```

### 3.3 XSS Prevention

**Sanitize user input:**

```typescript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // Escape special characters
  sanitized = validator.escape(sanitized);
  
  return sanitized;
}

// Use in all user input
app.post('/api/patients', authenticateToken, async (req, res) => {
  const { first_name, last_name } = req.body;
  
  const sanitizedFirstName = sanitizeInput(first_name);
  const sanitizedLastName = sanitizeInput(last_name);
  
  // Insert into database...
});
```

**Set security headers:**

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Avoid unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## 4. Network Security

### 4.1 Firewall Configuration

**Local AI Server (Hybrid/Local deployment):**

```bash
# Ubuntu UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port from 22 for security)
sudo ufw allow 2222/tcp

# Allow AI API endpoint (HTTPS only)
sudo ufw allow 8443/tcp

# Deny HTTP (force HTTPS)
sudo ufw deny 8080/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 4.2 VPN Access (Recommended for Production)

**WireGuard VPN Setup:**

```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure server (/etc/wireguard/wg0.conf)
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server_private_key>

[Peer]
# Cloud server
PublicKey = <cloud_public_key>
AllowedIPs = 10.0.0.2/32

# Start VPN
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

**Benefits:**
- ✅ Encrypted tunnel between cloud and local
- ✅ No public IP exposure needed
- ✅ Automatic reconnection
- ✅ Low latency (<10ms overhead)

### 4.3 Rate Limiting

**Prevent brute force and DDoS:**

```typescript
import rateLimit from 'express-rate-limit';

// Login endpoint rate limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // Login logic...
});

// API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);
```

---

## 5. Audit Logging

### 5.1 Security Event Logging

**Log all security-relevant events:**

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security-audit.log' }),
    new winston.transports.File({ filename: 'security-error.log', level: 'error' })
  ]
});

// Log security events
function logSecurityEvent(
  eventType: string,
  userId: string,
  details: any,
  severity: 'info' | 'warn' | 'error' = 'info'
) {
  securityLogger.log(severity, {
    timestamp: new Date().toISOString(),
    eventType,
    userId,
    details,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent
  });
}

// Usage examples
logSecurityEvent('login_success', userId, { ipAddress: req.ip });
logSecurityEvent('login_failed', userId, { ipAddress: req.ip, reason: 'invalid_password' }, 'warn');
logSecurityEvent('prompt_injection_attempt', userId, { message: userInput }, 'error');
logSecurityEvent('unauthorized_access', userId, { resource: '/api/patients/other_branch' }, 'error');
```

### 5.2 Database Audit Trail

**Track all PHI access:**

```sql
-- Create audit log table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- SELECT, INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Create trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
    VALUES (current_setting('app.user_id'), 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (current_setting('app.user_id'), 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
    VALUES (current_setting('app.user_id'), 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sensitive tables
CREATE TRIGGER patients_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER emrs_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON emrs
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 6. Branch Data Isolation

### 6.1 Row-Level Security (RLS)

**Ensure branches can only access their own data:**

```sql
-- Enable RLS on tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE emrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy for branch isolation
CREATE POLICY branch_isolation_policy ON patients
FOR ALL
USING (branch_id = current_setting('app.branch_id')::TEXT);

CREATE POLICY branch_isolation_policy ON emrs
FOR ALL
USING (
  patient_id IN (
    SELECT id FROM patients WHERE branch_id = current_setting('app.branch_id')::TEXT
  )
);

CREATE POLICY branch_isolation_policy ON documents
FOR ALL
USING (
  patient_id IN (
    SELECT id FROM patients WHERE branch_id = current_setting('app.branch_id')::TEXT
  )
);
```

**Set branch context in application:**

```typescript
// Middleware to set branch context
function setBranchContext(req, res, next) {
  const branchId = req.user.branchId;  // From JWT token
  
  // Set PostgreSQL session variable
  pool.query(`SET app.branch_id = '${branchId}'`, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to set branch context' });
    next();
  });
}

app.use('/api/', authenticateToken, setBranchContext);
```

---

## 7. Backup & Disaster Recovery

### 7.1 Automated Backups

**Daily encrypted backups:**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/mediflow"
DATE=$(date +%Y%m%d_%H%M%S)
ENCRYPTION_KEY="your-encryption-key-here"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -h 127.0.0.1 -p 54322 -U postgres -d postgres | \
  openssl enc -aes-256-cbc -salt -k $ENCRYPTION_KEY > \
  $BACKUP_DIR/postgres_$DATE.sql.enc

# Backup medical documents
tar -czf - /path/to/documents | \
  openssl enc -aes-256-cbc -salt -k $ENCRYPTION_KEY > \
  $BACKUP_DIR/documents_$DATE.tar.gz.enc

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.enc" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/postgres_$DATE.sql.enc s3://mediflow-backups/
```

**Cron job:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/mediflow-backup.log 2>&1
```

### 7.2 Disaster Recovery Plan

**Recovery steps:**

1. **Restore database:**
```bash
# Decrypt and restore
openssl enc -aes-256-cbc -d -k $ENCRYPTION_KEY \
  -in postgres_backup.sql.enc | \
  psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
```

2. **Restore documents:**
```bash
# Decrypt and extract
openssl enc -aes-256-cbc -d -k $ENCRYPTION_KEY \
  -in documents_backup.tar.gz.enc | \
  tar -xzf - -C /
```

3. **Verify data integrity:**
```sql
-- Check record counts
SELECT COUNT(*) FROM patients;
SELECT COUNT(*) FROM emrs;
SELECT COUNT(*) FROM documents;

-- Verify latest records
SELECT * FROM patients ORDER BY created_at DESC LIMIT 10;
```

---

## 8. Security Checklist

### Pre-Deployment Security Audit:

- [ ] All passwords hashed with bcrypt (salt rounds ≥ 12)
- [ ] JWT secret is 256-bit random string
- [ ] Session secret is 256-bit random string
- [ ] HTTPS/TLS enabled with valid certificate
- [ ] Database encryption enabled (AES-256)
- [ ] File encryption enabled (AES-256-GCM)
- [ ] All user input sanitized
- [ ] SQL injection prevention (prepared statements only)
- [ ] Prompt injection detection enabled
- [ ] XSS prevention headers set (Helmet.js)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Firewall configured (UFW/iptables)
- [ ] VPN configured (if using Reverse Hybrid)
- [ ] Audit logging enabled
- [ ] Row-level security (RLS) enabled
- [ ] Automated backups configured
- [ ] Disaster recovery plan documented
- [ ] Security event monitoring enabled
- [ ] Penetration testing completed
- [ ] HIPAA compliance review completed

---

## 9. Incident Response Plan

### When Security Breach Detected:

1. **Immediate Actions** (0-1 hour):
   - Isolate affected systems
   - Change all passwords and API keys
   - Review audit logs for breach scope
   - Notify system administrator

2. **Investigation** (1-24 hours):
   - Identify attack vector
   - Determine data accessed/exfiltrated
   - Document timeline of events
   - Preserve evidence (logs, backups)

3. **Remediation** (24-72 hours):
   - Patch vulnerabilities
   - Restore from clean backups if needed
   - Update security controls
   - Test fixes

4. **Notification** (72 hours):
   - Notify affected patients (if PHI breached)
   - Report to authorities (HIPAA requires 60-day notification)
   - Document incident report

5. **Post-Incident** (1-2 weeks):
   - Conduct post-mortem analysis
   - Update security procedures
   - Provide staff training
   - Implement additional controls

---

## 10. Compliance Requirements

### HIPAA Compliance Checklist:

- [ ] **Administrative Safeguards**:
  - Security management process
  - Assigned security responsibility
  - Workforce security
  - Information access management
  - Security awareness training
  - Security incident procedures
  - Contingency plan
  - Business associate agreements

- [ ] **Physical Safeguards**:
  - Facility access controls
  - Workstation use policies
  - Workstation security
  - Device and media controls

- [ ] **Technical Safeguards**:
  - Access control (unique user IDs, emergency access, automatic logoff, encryption)
  - Audit controls
  - Integrity controls
  - Person or entity authentication
  - Transmission security

---

**Remember:** Security is not a one-time setup. Regularly review and update security measures, conduct penetration testing, and stay informed about new threats and vulnerabilities.
