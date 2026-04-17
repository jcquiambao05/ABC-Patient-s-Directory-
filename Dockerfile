# ABCare OmniFlow — Production Dockerfile
FROM node:20-alpine

# System dependencies: Python (OCR), Tesseract, curl
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-flask \
    py3-pillow \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    postgresql-client \
    curl \
    bash

# Install Python OCR dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    pytesseract \
    flask-cors \
    google-generativeai

WORKDIR /app

# Install Node dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the Vite frontend
RUN npm run build

# Create upload directories
RUN mkdir -p uploads/patients uploads/charts uploads/medications \
             uploads/prescriptions uploads/signatures

# Expose web app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start both OCR service and web app
CMD ["sh", "-c", "python3 ocr_service_simple.py & npx tsx server.ts"]
