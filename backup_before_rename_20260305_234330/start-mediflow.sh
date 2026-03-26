#!/bin/bash

# MediFlow AI - Start Script
# Starts OCR service and web application

echo "🏥 Starting MediFlow AI..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to check port
check_port() {
    lsof -i:$1 > /dev/null 2>&1
}

# Check if OCR service file exists in current directory
if [ ! -f "$SCRIPT_DIR/ocr_service_simple.py" ]; then
    echo -e "${RED}❌ OCR service not found: ocr_service_simple.py${NC}"
    echo "Make sure you're in the project directory"
    exit 1
fi

# Check if medical_chart_templates.json exists
if [ ! -f "$SCRIPT_DIR/medical_chart_templates.json" ]; then
    echo -e "${RED}❌ Templates file not found: medical_chart_templates.json${NC}"
    exit 1
fi

# Check Python dependencies
echo -e "${BLUE}🔍 Checking Python dependencies...${NC}"
python3 -c "import flask" 2>/dev/null || {
    echo -e "${RED}❌ Flask not installed${NC}"
    echo "Install with: sudo apt-get install python3-flask python3-flask-cors"
    exit 1
}

python3 -c "import pytesseract" 2>/dev/null || {
    echo -e "${RED}❌ pytesseract not installed${NC}"
    echo "Install with: pip3 install pytesseract"
    exit 1
}

python3 -c "from PIL import Image" 2>/dev/null || {
    echo -e "${RED}❌ Pillow not installed${NC}"
    echo "Install with: sudo apt-get install python3-pil"
    exit 1
}

echo -e "${GREEN}✅ All Python dependencies installed${NC}"

# Start OCR Service
if check_port 5000; then
    echo -e "${YELLOW}⚠️  Port 5000 in use, stopping existing process...${NC}"
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo -e "${BLUE}🔧 Starting OCR Service (Tesseract + Simple Mode)...${NC}"
cd "$SCRIPT_DIR"
nohup python3 ocr_service_simple.py > ocr_service.log 2>&1 &
OCR_PID=$!
echo $OCR_PID > "$SCRIPT_DIR/.ocr_pid"
echo -e "${GREEN}✅ OCR Service started (PID: $OCR_PID)${NC}"
sleep 3

# Verify OCR service is running
if ! check_port 5000; then
    echo -e "${RED}❌ OCR service failed to start${NC}"
    echo "Check ocr_service.log for errors"
    cat ocr_service.log | tail -20
    exit 1
fi

# Test OCR service health
OCR_HEALTH=$(curl -s http://localhost:5000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ OCR service health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  OCR service health check failed (but service is running)${NC}"
fi

# Check Node.js and npm
echo ""
echo -e "${BLUE}🔍 Checking Node.js dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, running npm install...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Node.js dependencies ready${NC}"

# Start Web Application
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 in use, stopping existing process...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo -e "${BLUE}🌐 Starting Web Application...${NC}"
cd "$SCRIPT_DIR"
nohup npm run dev > webapp.log 2>&1 &
WEBAPP_PID=$!
echo $WEBAPP_PID > "$SCRIPT_DIR/.webapp_pid"
echo -e "${GREEN}✅ Web Application started (PID: $WEBAPP_PID)${NC}"
sleep 5

# Verify web app is running
if ! check_port 3000; then
    echo -e "${RED}❌ Web application failed to start${NC}"
    echo "Check webapp.log for errors"
    cat webapp.log | tail -20
    exit 1
fi

# Test web app health
WEBAPP_HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Web application health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Web application health check failed (but service is running)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 MediFlow AI is ready!${NC}"
echo ""
echo "📍 Access Points:"
echo "   🌐 Web App: http://localhost:3000"
echo "   🔧 OCR Service: http://localhost:5000"
echo ""
echo "🔐 Default Login:"
echo "   Email: admin@mediflow.ai"
echo "   Password: Admin@123456"
echo ""
echo "📊 Process IDs:"
echo "   OCR Service: $OCR_PID (saved to .ocr_pid)"
echo "   Web App: $WEBAPP_PID (saved to .webapp_pid)"
echo ""
echo "📝 Logs:"
echo "   OCR: tail -f ocr_service.log"
echo "   Web: tail -f webapp.log"
echo ""
echo "🛑 Stop: ./stop-mediflow.sh"
echo "🔄 Restart: ./restart-mediflow.sh"
echo ""
echo "📚 Documentation:"
echo "   - OCR-EXTRACTION-FIX-COMPLETE.md"
echo "   - SYSTEM-STATUS-CHECK.md"
echo ""
