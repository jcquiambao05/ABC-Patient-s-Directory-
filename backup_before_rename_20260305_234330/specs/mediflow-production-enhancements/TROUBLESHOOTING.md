# MediFlow AI Troubleshooting Guide

**Purpose:** This guide helps you diagnose and fix common issues before and during development. Always check this guide first before diving into code debugging.

---

## 🚨 Quick Diagnostic Checklist

When something goes wrong, check in this order:

1. ✅ **Services Running?** (30 seconds)
2. ✅ **Network/API Connectivity?** (1 minute)
3. ✅ **Dependencies Installed?** (2 minutes)
4. ✅ **Environment Variables Set?** (1 minute)
5. ✅ **Logs/Error Messages?** (2 minutes)
6. ✅ **Code Logic Issues?** (last resort)

**Rule:** 80% of issues are infrastructure/config, not code. Check infrastructure first!

---

## 1. Services Not Running

### Symptoms:
- "Connection refused" errors
- "Cannot connect to database"
- "Ollama service unavailable"
- Web app won't load

### Diagnostic Steps:

#### Check All Services Status:

```bash
# Check if services are running
docker ps                           # Docker containers
systemctl status postgresql         # PostgreSQL (if not Docker)
systemctl status ollama            # Ollama service
ps aux | grep node                 # Node.js backend
ps aux | grep python               # Python OCR processor

# Check ports in use
sudo netstat -tulpn | grep LISTEN
# Expected ports:
# - 3000: Express backend + Vite frontend
# - 5432 or 54322: PostgreSQL
# - 11434: Ollama
```

#### Fix: Start Missing Services

**PostgreSQL (Supabase):**
```bash
# If using Supabase local
cd /path/to/mediflow-ai
supabase start

# If using Docker PostgreSQL
docker start postgres-container-name

# If using system PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

**Ollama:**
```bash
# Check if Ollama is installed
ollama --version

# Start Ollama service
ollama serve

# Or as systemd service
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull required model if not present
ollama pull qwen2.5:7b-instruct-q4_K_M
```

**Express Backend:**
```bash
cd /path/to/mediflow-ai
npm install                        # Install dependencies first
npm run dev                        # Start backend + Vite
```

**Docker Compose (Option 3: Fully Local):**
```bash
cd /path/to/mediflow-ai
docker-compose up -d               # Start all services
docker-compose ps                  # Check status
docker-compose logs -f             # View logs
```

---

## 2. Network/API Connectivity Issues

### Symptoms:
- "Network error"
- "API timeout"
- "CORS error"
- "Failed to fetch"
- Cloud can't reach local AI server

### Diagnostic Steps:

#### Test Local Connectivity:

```bash
# Test PostgreSQL connection
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
# Or
nc -zv 127.0.0.1 54322

# Test Ollama API
curl http://localhost:11434/api/tags
# Should return list of models

# Test Express backend
curl http://localhost:3000/api/patients
# Should return JSON (or 401 if auth required)

# Test if port is open
telnet localhost 3000
telnet localhost 11434
```

#### Test Cloud-to-Local AI Server (Hybrid/Local Deployment):

```bash
# From local AI server, check if port is accessible from internet
# First, get your public IP
curl ifconfig.me

# Check if port forwarding works (from another machine or phone)
curl http://YOUR_PUBLIC_IP:8080/health
# Or use online tool: https://www.yougetsignal.com/tools/open-ports/

# Test with ngrok (temporary solution for testing)
ngrok http 8080
# Use the ngrok URL to test from cloud
```

#### Fix: Network Issues

**CORS Errors (Frontend → Backend):**
```javascript
// In server.ts, add CORS middleware
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000', 'https://your-cloud-domain.com'],
  credentials: true
}));
```

**Firewall Blocking (Local AI Server):**
```bash
# Ubuntu/Debian
sudo ufw allow 8080/tcp
sudo ufw status

# Check if firewall is blocking
sudo iptables -L -n | grep 8080
```

**Port Forwarding (Router):**
1. Access router admin panel (usually 192.168.1.1)
2. Find "Port Forwarding" or "Virtual Server"
3. Forward external port 8080 → internal IP:8080
4. Save and restart router

**Dynamic DNS (if no static IP):**
```bash
# Install ddclient for dynamic DNS
sudo apt install ddclient

# Configure with your DDNS provider (No-IP, DuckDNS, etc.)
sudo nano /etc/ddclient.conf
```

---

## 3. Missing Dependencies/Libraries

### Symptoms:
- "Module not found"
- "Cannot find package"
- "ImportError: No module named"
- "command not found"

### Diagnostic Steps:

#### Check Node.js Dependencies:

```bash
# Check if package.json exists
cat package.json

# Check if node_modules exists
ls -la node_modules/

# Check for missing packages
npm list --depth=0

# Check Node.js version
node --version    # Should be v18+
npm --version
```

#### Check Python Dependencies:

```bash
# Check if requirements.txt exists
cat requirements.txt

# Check installed Python packages
pip list
pip show ollama
pip show paddleocr
pip show transformers

# Check Python version
python3 --version  # Should be 3.10+
```

#### Check System Dependencies:

```bash
# Check if Docker is installed
docker --version

# Check if Tesseract is installed (if using)
tesseract --version

# Check if GPU drivers are installed (AMD)
rocm-smi           # AMD ROCm
clinfo             # OpenCL info

# Check if Ollama is installed
ollama --version
```

#### Fix: Install Missing Dependencies

**Node.js Dependencies:**
```bash
cd /path/to/mediflow-ai

# Clean install
rm -rf node_modules package-lock.json
npm install

# If specific package missing
npm install express pg dotenv cors
npm install --save-dev typescript tsx
```

**Python Dependencies:**
```bash
# Install from requirements.txt
pip install -r requirements.txt

# If requirements.txt missing, install manually
pip install ollama paddleocr transformers torch pillow pydantic python-dotenv

# For GPU support (AMD)
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm5.7
```

**System Dependencies (Ubuntu/Debian):**
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Tesseract OCR
sudo apt update
sudo apt install tesseract-ocr libtesseract-dev

# AMD ROCm (for GPU support)
# Follow official guide: https://rocm.docs.amd.com/en/latest/deploy/linux/quick_start.html

# Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

---

## 4. Environment Variables Not Set

### Symptoms:
- "DATABASE_URL is not defined"
- "Cannot connect to database"
- "Missing API key"
- App works locally but fails in production

### Diagnostic Steps:

#### Check Environment Variables:

```bash
# Check if .env file exists
ls -la .env

# View .env contents (be careful not to expose secrets)
cat .env

# Check if variables are loaded in Node.js
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# Check environment variables in current shell
echo $DATABASE_URL
printenv | grep DATABASE
```

#### Fix: Set Environment Variables

**Create .env file:**
```bash
cd /path/to/mediflow-ai
cp .env.example .env
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NODE_ENV=development

# AI/LLM
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct-q4_K_M

# Local AI Server (Hybrid/Local deployment)
LOCAL_AI_SERVER_URL=http://localhost:8080
LOCAL_AI_API_TOKEN=your-secure-token-here

# Cloud (Hybrid deployment)
CLOUD_API_URL=https://your-cloud-domain.com
CLOUD_API_TOKEN=your-cloud-token-here

# Security
JWT_SECRET=your-jwt-secret-here-change-in-production
SESSION_SECRET=your-session-secret-here

# OCR
OCR_ENGINE=hybrid  # Options: paddleocr, trocr, hybrid
OCR_CONFIDENCE_THRESHOLD=0.8
```

**Load environment variables in code:**
```javascript
// At the top of server.ts
import dotenv from 'dotenv';
dotenv.config();

// Validate required variables
const requiredEnvVars = ['DATABASE_URL', 'OLLAMA_HOST', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: ${envVar} is not set in .env file`);
    process.exit(1);
  }
}
```

---

## 5. Database Connection Issues

### Symptoms:
- "Connection refused" to PostgreSQL
- "password authentication failed"
- "database does not exist"
- "too many connections"

### Diagnostic Steps:

#### Test Database Connection:

```bash
# Test with psql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
# Enter password when prompted

# Test with Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error(err);
  else console.log('Connected:', res.rows[0]);
  pool.end();
});
"

# Check if PostgreSQL is listening
sudo netstat -tulpn | grep 5432
sudo netstat -tulpn | grep 54322
```

#### Fix: Database Connection

**Supabase not started:**
```bash
cd /path/to/mediflow-ai
supabase start
supabase status  # Get connection details
```

**Wrong credentials:**
```bash
# Check Supabase credentials
supabase status | grep "DB URL"

# Update .env with correct credentials
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Database doesn't exist:**
```bash
# Create database
psql -h 127.0.0.1 -p 54322 -U postgres -c "CREATE DATABASE mediflow;"

# Or run schema initialization
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f schema.sql
```

**Too many connections:**
```javascript
// In server.ts, limit connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Maximum 10 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## 6. Ollama/LLM Issues

### Symptoms:
- "Model not found"
- "Ollama service unavailable"
- "Out of memory" errors
- Slow inference (>30 seconds)

### Diagnostic Steps:

#### Check Ollama Status:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Check GPU usage
rocm-smi  # AMD
watch -n 1 rocm-smi  # Real-time monitoring

# Check system memory
free -h
htop
```

#### Fix: Ollama Issues

**Model not found:**
```bash
# Pull the required model
ollama pull qwen2.5:7b-instruct-q4_K_M

# Or Llama 3.2 8B
ollama pull llama3.2:8b-instruct-q4_K_M

# Verify model is downloaded
ollama list
```

**Out of memory (VRAM):**
```bash
# Use smaller quantization
ollama pull qwen2.5:7b-instruct-q4_0  # Smaller than Q4_K_M

# Or use CPU mode (slower)
OLLAMA_NUM_GPU=0 ollama serve

# Check VRAM usage
rocm-smi | grep "GPU Memory"
```

**Slow inference:**
```bash
# Check if GPU is being used
rocm-smi

# If GPU not detected, set environment variable
export HSA_OVERRIDE_GFX_VERSION=10.3.0  # For RX 580
ollama serve

# Reduce context window for faster inference
# In your API call:
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b-instruct-q4_K_M",
  "prompt": "Hello",
  "options": {
    "num_ctx": 2048  # Reduce from default 4096
  }
}'
```

**Ollama service crashes:**
```bash
# Check logs
journalctl -u ollama -f

# Restart service
sudo systemctl restart ollama

# Check for conflicting processes
ps aux | grep ollama
killall ollama  # Kill all instances
ollama serve    # Start fresh
```

---

## 7. OCR Processing Issues

### Symptoms:
- "OCR failed"
- Low accuracy (<70%)
- "Model not found" for TrOCR
- Slow processing (>60 seconds per page)

### Diagnostic Steps:

#### Test OCR Engines:

```bash
# Test PaddleOCR
python3 -c "
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr('test_image.jpg', cls=True)
print(result)
"

# Test TrOCR
python3 -c "
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
print('TrOCR loaded successfully')
"

# Check GPU availability for OCR
python3 -c "import torch; print('CUDA available:', torch.cuda.is_available())"
```

#### Fix: OCR Issues

**PaddleOCR not installed:**
```bash
pip install paddleocr paddlepaddle-gpu
# Or CPU version
pip install paddleocr paddlepaddle
```

**TrOCR not installed:**
```bash
pip install transformers torch pillow
```

**Low accuracy:**
```python
# Improve image preprocessing
from PIL import Image, ImageEnhance

def preprocess_image(image_path):
    img = Image.open(image_path)
    
    # Convert to grayscale
    img = img.convert('L')
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)
    
    return img
```

**Slow processing:**
```python
# Use GPU for TrOCR
import torch
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)

# Batch processing for multiple images
# Process 4 images at once instead of one by one
```

---

## 8. Authentication/Session Issues

### Symptoms:
- "Unauthorized" errors
- Session expires immediately
- Can't log in
- "Invalid token"

### Diagnostic Steps:

#### Check Authentication Flow:

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Should return JWT token or session cookie

# Test protected endpoint with token
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Fix: Authentication Issues

**JWT secret not set:**
```env
# In .env
JWT_SECRET=your-very-long-random-secret-here-min-32-chars
```

**Session expires immediately:**
```javascript
// In server.ts
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax'
  }
}));
```

**Password hashing issues:**
```javascript
// Use bcrypt properly
import bcrypt from 'bcrypt';

// Hash password (during registration)
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password (during login)
const isValid = await bcrypt.compare(password, hashedPassword);
```

---

## 9. Docker Issues (Option 3: Fully Local)

### Symptoms:
- "Cannot connect to Docker daemon"
- Containers won't start
- "Port already in use"
- GPU not accessible in container

### Diagnostic Steps:

#### Check Docker Status:

```bash
# Check if Docker is running
sudo systemctl status docker

# Check containers
docker ps -a

# Check Docker logs
docker logs container-name
docker-compose logs -f

# Check Docker networks
docker network ls

# Check Docker volumes
docker volume ls
```

#### Fix: Docker Issues

**Docker not running:**
```bash
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker  # Activate group
```

**Port already in use:**
```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process
sudo kill -9 PID

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

**GPU not accessible in container:**
```yaml
# In docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
    environment:
      - HSA_OVERRIDE_GFX_VERSION=10.3.0  # For RX 580
    volumes:
      - ollama_data:/root/.ollama
```

**Container won't start:**
```bash
# Check logs for errors
docker logs container-name

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Remove all containers and start fresh
docker-compose down -v
docker-compose up -d
```

---

## 10. Code Logic Issues (Last Resort)

### When to Check Code:

Only check code logic AFTER verifying:
- ✅ All services are running
- ✅ Network connectivity works
- ✅ Dependencies are installed
- ✅ Environment variables are set
- ✅ Logs show no infrastructure errors

### Debugging Techniques:

#### Add Logging:

```javascript
// In server.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Use throughout code
logger.info('Starting server...');
logger.error('Database connection failed:', error);
logger.debug('Request received:', req.body);
```

#### Use Debugger:

```bash
# Node.js debugger
node --inspect server.ts

# Or with tsx
tsx --inspect server.ts

# Then open Chrome DevTools: chrome://inspect
```

#### Check API Responses:

```bash
# Use curl with verbose output
curl -v http://localhost:3000/api/patients

# Or use httpie (better formatting)
http GET http://localhost:3000/api/patients

# Or use Postman/Insomnia for GUI
```

---

## Common Error Messages & Solutions

### "ECONNREFUSED"
- **Cause:** Service not running or wrong port
- **Fix:** Check if service is running, verify port number

### "EADDRINUSE"
- **Cause:** Port already in use
- **Fix:** Kill process using port or change port

### "MODULE_NOT_FOUND"
- **Cause:** Missing npm package
- **Fix:** Run `npm install`

### "Cannot find module 'X'"
- **Cause:** Missing Python package
- **Fix:** Run `pip install X`

### "password authentication failed"
- **Cause:** Wrong database credentials
- **Fix:** Check DATABASE_URL in .env

### "CORS policy blocked"
- **Cause:** CORS not configured
- **Fix:** Add CORS middleware in server.ts

### "Out of memory"
- **Cause:** Model too large for VRAM
- **Fix:** Use smaller quantization (Q4_0 instead of Q4_K_M)

### "GPU not found"
- **Cause:** GPU drivers not installed or wrong version
- **Fix:** Install ROCm drivers, set HSA_OVERRIDE_GFX_VERSION

---

## Pre-Development Checklist

Before writing any code, verify:

- [ ] PostgreSQL/Supabase is running
- [ ] Ollama is running with model downloaded
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] .env file exists with all required variables
- [ ] Can connect to database (`psql` test)
- [ ] Can query Ollama (`curl` test)
- [ ] GPU is detected (`rocm-smi`)
- [ ] Ports are available (3000, 5432/54322, 11434)
- [ ] Docker is running (if using Option 3)

---

## Quick Reference Commands

```bash
# Start all services (Hybrid/Local)
supabase start
ollama serve
npm run dev

# Check all services
docker ps
systemctl status postgresql
systemctl status ollama
ps aux | grep node

# View logs
docker-compose logs -f
journalctl -u ollama -f
tail -f combined.log

# Test connectivity
curl http://localhost:11434/api/tags
curl http://localhost:3000/api/patients
psql -h 127.0.0.1 -p 54322 -U postgres

# Monitor GPU
watch -n 1 rocm-smi

# Monitor system resources
htop
free -h
df -h
```

---

## Getting Help

If you've checked everything above and still have issues:

1. **Check logs first:**
   - Docker: `docker-compose logs -f`
   - Ollama: `journalctl -u ollama -f`
   - Node.js: Check `combined.log` or console output
   - PostgreSQL: Check `/var/log/postgresql/`

2. **Search error message:**
   - Copy exact error message
   - Search on Google, Stack Overflow, GitHub Issues

3. **Ask for help:**
   - Include: OS, versions, error message, what you've tried
   - Provide logs (remove sensitive data first)

---

**Remember:** 80% of issues are infrastructure, not code. Always check services, network, and dependencies first!
