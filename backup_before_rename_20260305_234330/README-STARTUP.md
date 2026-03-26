# MediFlow AI - Quick Start

## 🚀 Start MediFlow (One Command)

```bash
./start-mediflow.sh
```

This automatically:
- ✅ Checks all dependencies (Flask, Tesseract, Node.js)
- ✅ Starts OCR service on port 5000
- ✅ Starts web application on port 3000
- ✅ Verifies both services are healthy
- ✅ Shows access URLs and credentials

## 🛑 Stop MediFlow

```bash
./stop-mediflow.sh
```

## 🔄 Restart MediFlow

```bash
./restart-mediflow.sh
```

## 📍 Access the Application

Once started, open your browser:

```
http://localhost:3000
```

**Login Credentials:**
- Email: `admin@mediflow.ai`
- Password: `Admin@123456`

## ✅ Verify Everything is Working

```bash
# Check OCR service
curl http://localhost:5000/health

# Check web application
curl http://localhost:3000/api/health
```

## 📝 View Logs

```bash
# OCR service logs
tail -f ocr_service.log

# Web application logs
tail -f webapp.log
```

## 🔧 First Time Setup

If this is your first time running MediFlow, make sure you have:

### 1. System Dependencies

```bash
# Install required packages
sudo apt-get install -y \
  tesseract-ocr \
  tesseract-ocr-eng \
  python3-flask \
  python3-flask-cors \
  python3-pil \
  nodejs \
  npm
```

### 2. Node.js Dependencies

```bash
# Install npm packages
npm install
```

### 3. Database Setup

```bash
# Start Supabase (if using local)
supabase start

# Or verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### 4. Environment Variables

Make sure `.env` file exists with:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports
./stop-mediflow.sh
```

### OCR Service Won't Start

```bash
# Check Flask is installed
python3 -c "import flask; print('Flask OK')"

# If not, install it
sudo apt-get install python3-flask python3-flask-cors
```

### Web App Won't Start

```bash
# Reinstall dependencies
npm install

# Check database is running
supabase status
```

### Can't Login

```bash
# Check JWT_SECRET is set
grep JWT_SECRET .env

# If missing, add it
echo "JWT_SECRET=your-secret-key" >> .env

# Restart
./restart-mediflow.sh
```

## 📚 Full Documentation

- **STARTUP-GUIDE.md** - Complete startup documentation
- **SYSTEM-STATUS-CHECK.md** - Testing checklist
- **OCR-EXTRACTION-FIX-COMPLETE.md** - OCR fixes and patterns
- **.kiro/specs/** - Full technical specifications

## 🎯 What's New (Latest Updates)

### ✅ Fixed OCR Extraction Issues
- Name extraction no longer picks up "MEDICAL CHART" as patient name
- Date formatting normalized to YYYY-MM-DD
- Phone, email, address extraction improved
- Gender normalization (M→male, F→female)
- Better display formatting (no more "N/A" everywhere)

### ✅ Updated Startup Scripts
- `start-mediflow.sh` - Now works from project directory
- Checks all dependencies before starting
- Verifies services are healthy after startup
- Shows clear error messages if something fails

### ✅ Python Environment
- Uses system packages (no virtual environment needed)
- Flask and Flask-CORS installed via apt
- No pip conflicts with system Python

## 🔍 Quick Health Check

Run this to verify everything is working:

```bash
# Start services
./start-mediflow.sh

# Wait 10 seconds for startup
sleep 10

# Check OCR service
curl -s http://localhost:5000/health | python3 -m json.tool

# Check web app
curl -s http://localhost:3000/api/health | python3 -m json.tool

# If both return JSON, you're good to go!
```

## 📊 Process Information

After starting, you'll see:

```
📊 Process IDs:
   OCR Service: 12345 (saved to .ocr_pid)
   Web App: 67890 (saved to .webapp_pid)
```

These PIDs are saved to files so the stop script can cleanly shut down services.

## 🎉 Success Indicators

When everything is working, you should see:

1. **OCR Service:**
   - Port 5000 is listening
   - Health check returns `"status": "healthy"`
   - Templates loaded: 2

2. **Web Application:**
   - Port 3000 is listening
   - Health check returns `"status": "ok"`
   - Database connected

3. **Browser:**
   - Login page loads at http://localhost:3000
   - Can login with admin credentials
   - Patient directory displays

## 🆘 Need Help?

1. Check the logs: `tail -f ocr_service.log webapp.log`
2. Review STARTUP-GUIDE.md for detailed troubleshooting
3. Verify all dependencies are installed
4. Make sure ports 3000 and 5000 are free
5. Check .env file has required variables

## 🔐 Security Note

The default credentials (`admin@mediflow.ai` / `Admin@123456`) are for development only. 

For production:
1. Change the password in the database
2. Use a strong JWT_SECRET
3. Enable HTTPS
4. Follow security guidelines in `.kiro/specs/mediflow-production-enhancements/SECURITY.md`
