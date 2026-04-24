# ABCare OmniFlow — Production Dockerfile (Cloud — OCR disabled)
FROM node:20-alpine

# Minimal system dependencies for cloud deployment
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client

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

# Start the web app only (OCR disabled for cloud deployment)
CMD ["sh", "-c", "npx tsx server.ts"]
