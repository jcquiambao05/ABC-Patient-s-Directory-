# ABC Patient Directory - Documentation Index

## Current System Overview

ABC Patient Directory is a medical records management system with:
- Patient directory and record management
- AI-powered OCR for document digitization
- JWT-based authentication
- PostgreSQL database
- React + Express architecture

## Quick Start

1. **Setup:** See `SETUP.md`
2. **Start System:** Run `./start-mediflow.sh` from project root
3. **Access:** http://localhost:3000 (admin@mediflow.ai / Admin@123456)

## Documentation Structure

### Core Documentation
- **SETUP.md** - Complete setup guide for all platforms
- **ARCHITECTURE.md** - System design and technical architecture
- **SECURITY.md** - Security guidelines and best practices
- **TROUBLESHOOTING.md** - Common issues and solutions

### Development
- **requirements.md** - Detailed requirements specification
- **tasks.md** - Implementation task list
- **TESTING.md** - Testing procedures and checklist

### Deployment
- **DEPLOYMENT.md** - Production deployment guide
- **HARDWARE.md** - Hardware recommendations for clinics

## Archived/Deprecated Files

The following files are outdated or redundant and can be safely deleted:
- AGENTS.md
- CLAUDE.MD
- CLEANUP-COMPLETE.md
- CLIENT-FEEDBACK-QUESTIONS.md
- CLIENT-OVERVIEW.md
- DEBUG-UPDATE-LAST-VISIT.md
- FEATURE-EDIT-PATIENT-INFO.md
- FIX-*.md (various fix documentation)
- GOOGLE_OAUTH_*.md
- GUIDE.md
- IMPLEMENTATION-SUMMARY.md
- OCR-QUICK-START-GUIDE.md (merged into SETUP.md)
- OCR-SETUP-*.md (multiple versions, merged into SETUP.md)
- OCR-SYSTEM-EXPLAINED.md (merged into ARCHITECTURE.md)
- QUICK-*.md (merged into main docs)
- README.md (replaced by this file)
- REFACTOR-*.md
- RESTART-REQUIRED.md
- SETUP-COMMANDS.md (merged into SETUP.md)
- SETUP-KUBUNTU.md (merged into SETUP.md)
- SETUP-WINDOWS.md (merged into SETUP.md)
- TESTING-CHECKLIST.md (merged into TESTING.md)
- TROUBLESHOOT_WHITE_SCREEN.md (merged into TROUBLESHOOTING.md)

## System Status

✅ **Operational Components:**
- Web Application (Port 3000)
- OCR Service (Port 5000) - Tesseract-based
- PostgreSQL Database
- JWT Authentication

✅ **Recent Fixes:**
- OCR extraction patterns improved
- Name/date/phone/email/address extraction fixed
- Display formatting corrected
- Python environment configured (system packages)

## Support

For issues:
1. Check TROUBLESHOOTING.md
2. Review logs: `tail -f ocr_service.log webapp.log`
3. Verify services: `curl http://localhost:5000/health`
