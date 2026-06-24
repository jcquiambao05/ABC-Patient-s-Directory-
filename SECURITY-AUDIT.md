# ABCare OmniFlow — Security Audit Report
**Date:** May 2026 | **Auditor:** DevOps Review | **Status:** Pre-Production

---

## Executive Summary

ABCare OmniFlow is a clinic management system handling Protected Health Information (PHI).
It has solid authentication foundations but requires hardening before live deployment.

**Overall Risk Level: 🟠 HIGH — Not production-ready without fixes below**

---

## Critical Issues (Fix Before Going Live)

### 1.  No HTTPS
- App runs on HTTP — all data including JWT tokens transmitted in plaintext
- **Fix:** Use Nginx + Let's Encrypt SSL (see deploy script)

### 2. 🔴 JWT in localStorage
- Tokens stored in localStorage are vulnerable to XSS attacks
- **Fix:** Move to httpOnly cookies (requires backend change)

### 3. 🔴 No Rate Limiting
- Login, password reset, and all API endpoints have no IP-based throttling
- **Fix:** Add express-rate-limit middleware

### 4. 🔴 No Security Headers
- Missing: Content-Security-Policy, X-Frame-Options, HSTS, X-Content-Type-Options
- **Fix:** Add helmet.js middleware

### 5. 🔴 File Access — No Auth Check
- Files in /uploads/ are publicly accessible by direct URL
- Patient photos, medical charts, signatures accessible without login
- **Fix:** Serve uploads through authenticated endpoint

### 6. 🟠 No CSRF Protection
- State-changing endpoints have no CSRF tokens
- **Fix:** Add csurf middleware or use SameSite=Strict cookies

### 7. 🟠 Weak Default Passwords in Schema
- Default accounts (Admin@ABCare2026, Doctor@ABC2026!) in full_schema.sql
- **Fix:** Force password change on first login, remove defaults from public schema

### 8. 🟠 No Input Sanitization (XSS)
- Consultation notes, doctor notes, patient names stored without HTML sanitization
- **Fix:** Sanitize all text inputs with DOMPurify on frontend, strip HTML on backend

### 9. 🟡 Audit Logs Deletable
- Audit logs in regular table — can be deleted by superadmin
- **Fix:** Make audit_logs append-only, remove DELETE permission

### 10. 🟡 No Backup Strategy
- No automated database backups configured
- **Fix:** Add pg_dump cron job (included in deploy script)

---

## What Is Already Secure ✅

- Bcrypt password hashing (12 rounds) ✅
- Parameterized SQL queries (no SQL injection) ✅
- TOTP MFA mandatory on signup ✅
- Account lockout after 5 failed attempts ✅
- Role-based access control on all endpoints ✅
- File type validation (MIME whitelist) ✅
- File size limits enforced ✅
- Google OAuth email whitelist ✅
- OTP cooldown (60 seconds) ✅
- Password strength requirements ✅
- Name validation (no numbers/single chars) ✅
- Soft delete (patients never permanently lost) ✅
- Comprehensive audit logging ✅
- Immutable appointment status log ✅

---

## Legal Compliance (Philippines)

### Republic Act 10173 — Data Privacy Act of 2012
| Requirement | Status | Notes |
|-------------|--------|-------|
| Consent for data collection | ⚠️ Partial | Privacy consent signature stored but no explicit digital consent form |
| Data minimization | ✅ | Only clinically relevant data collected |
| Access controls | ✅ | Role-based, audit logged |
| Data breach notification | ❌ | No breach detection/notification system |
| Right to erasure | ⚠️ Partial | Soft delete exists, permanent delete superadmin only |
| Data retention policy | ❌ | No automated retention/deletion policy |
| Security measures | ⚠️ Partial | Auth good, encryption at rest missing |

### Recommendation
Register with the National Privacy Commission (NPC) as a Personal Information Controller (PIC)
before going live with real patient data.

---

## HIPAA Alignment (if serving US patients)
This app is NOT HIPAA compliant. Missing:
- Encryption at rest for PHI
- Audit log integrity (cryptographic signing)
- Business Associate Agreements
- Automatic logoff after inactivity
- Emergency access procedures

For Philippine clinic use only — HIPAA not legally required but good practice.
