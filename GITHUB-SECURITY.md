# GitHub Security Guide for MediFlow AI

**CRITICAL**: Read this entire document before pushing to GitHub!

---

## 🚨 Pre-Push Security Checklist

Before pushing to GitHub, verify ALL of these:

### 1. Environment Files
- [ ] `.env` file is in `.gitignore`
- [ ] No `.env` file exists in git history
- [ ] `.env.example` has NO real secrets (only placeholders)
- [ ] All API keys removed from `.env.example`

### 2. Credentials & Secrets
- [ ] No `credentials.json` or `token.json` files
- [ ] No Google OAuth client secrets in code
- [ ] No JWT secrets hardcoded anywhere
- [ ] No database passwords in code
- [ ] No API keys in comments

### 3. Database Files
- [ ] No `.sql` backup files with patient data
- [ ] No database dumps
- [ ] `database/auth_schema.sql` contains NO real data (only schema)

### 4. Google OAuth Files
- [ ] `google JSON/` folder is in `.gitignore`
- [ ] No client secret JSON files in repo

### 5. Documentation
- [ ] No passwords in markdown files
- [ ] No real email addresses (except examples)
- [ ] No internal IP addresses or server names
- [ ] No real patient data in examples

---

## 🔍 How to Check for Leaked Secrets

### Before First Push

```bash
# 1. Check what will be committed
git status

# 2. Review all files that will be added
git diff --cached

# 3. Search for common secret patterns
grep -r "API_KEY" .
grep -r "SECRET" .
grep -r "PASSWORD" .
grep -r "PRIVATE" .
grep -r "@gmail.com" .
grep -r "@mediflow.ai" .

# 4. Check .env is ignored
git check-ignore .env
# Should output: .env

# 5. Verify .gitignore is working
git ls-files --others --ignored --exclude-standard
```

### Scan for Secrets (Using git-secrets)

```bash
# Install git-secrets
# macOS
brew install git-secrets

# Linux
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install

# Configure git-secrets
cd /path/to/mediflow-ai
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'GEMINI_API_KEY.*'
git secrets --add 'JWT_SECRET.*'
git secrets --add 'GOOGLE_CLIENT_SECRET.*'
git secrets --add 'DATABASE_URL.*postgres.*'
git secrets --add '[a-zA-Z0-9]{32,}'  # Long random strings

# Scan repository
git secrets --scan
git secrets --scan-history
```

---

## 🧹 Clean Git History (If Secrets Already Committed)

### If You Haven't Pushed Yet

```bash
# Remove file from last commit
git reset HEAD~1
git add .gitignore
git commit -m "Add comprehensive .gitignore"

# Or amend last commit
git rm --cached .env
git commit --amend
```

### If You Already Pushed (CRITICAL!)

**⚠️ WARNING**: This rewrites history. Coordinate with team members!

```bash
# 1. Remove sensitive file from entire history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push (DANGEROUS - only if you're the only contributor)
git push origin --force --all

# 3. Invalidate ALL exposed secrets immediately:
# - Regenerate JWT_SECRET
# - Regenerate SESSION_SECRET
# - Revoke and regenerate Gemini API key
# - Revoke and regenerate Google OAuth credentials
# - Change database passwords
```

### Better Solution: Use BFG Repo-Cleaner

```bash
# Install BFG
# macOS
brew install bfg

# Linux
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
alias bfg='java -jar bfg-1.14.0.jar'

# Remove sensitive files
bfg --delete-files .env
bfg --delete-files credentials.json
bfg --delete-files "*.sql"

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

---

## 🔐 Secrets That Must NEVER Be Committed

### Critical Secrets (Immediate Security Risk)

1. **API Keys**
   - `GEMINI_API_KEY` - Google Gemini API key
   - Any third-party API keys

2. **Authentication Secrets**
   - `JWT_SECRET` - Used to sign authentication tokens
   - `SESSION_SECRET` - Session encryption key
   - `GOOGLE_CLIENT_SECRET` - Google OAuth secret

3. **Database Credentials**
   - `DATABASE_URL` with password
   - PostgreSQL passwords
   - Database connection strings

4. **OAuth Credentials**
   - `client_secret_*.json` files
   - Google OAuth client secrets
   - Service account keys

5. **SSL/TLS Certificates**
   - Private keys (`.key`, `.pem`)
   - Certificate files with private data

### Sensitive Information (Privacy Risk)

1. **Email Addresses**
   - Real admin emails in `GOOGLE_ALLOWED_EMAILS`
   - Personal email addresses

2. **Patient Data**
   - SQL dumps with patient records
   - CSV exports
   - Medical documents

3. **Internal Information**
   - Server IP addresses
   - Internal hostnames
   - Network topology

---

## ✅ Safe to Commit

These files are SAFE and SHOULD be committed:

### Configuration Templates
- ✅ `.env.example` (with placeholders only)
- ✅ `config.example.json`
- ✅ `database.example.yml`

### Documentation
- ✅ `README.md`
- ✅ `SETUP-KUBUNTU.md`
- ✅ `SETUP-WINDOWS.md`
- ✅ `DOCKER-DEPLOYMENT.md`
- ✅ `QUICK-START.md`
- ✅ `GITHUB-SECURITY.md` (this file)

### Database Schema (NO DATA)
- ✅ `database/auth_schema.sql` (structure only, no real data)

### Code Files
- ✅ All `.ts`, `.tsx`, `.js`, `.jsx` files
- ✅ `package.json`, `package-lock.json`
- ✅ `Dockerfile`, `docker-compose.yml`
- ✅ `.dockerignore`

### Configuration
- ✅ `tsconfig.json`
- ✅ `vite.config.ts`
- ✅ `.gitignore`

---

## 🛡️ GitHub Repository Security Settings

### 1. Enable Security Features

Go to: `Settings` → `Security & analysis`

Enable:
- ✅ **Dependency graph**
- ✅ **Dependabot alerts**
- ✅ **Dependabot security updates**
- ✅ **Secret scanning** (if available)
- ✅ **Code scanning** (GitHub Advanced Security)

### 2. Branch Protection Rules

Go to: `Settings` → `Branches` → `Add rule`

For `main` branch:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators
- ✅ Restrict who can push to matching branches

### 3. Secrets Management

Go to: `Settings` → `Secrets and variables` → `Actions`

Add secrets for CI/CD:
- `JWT_SECRET`
- `SESSION_SECRET`
- `GEMINI_API_KEY`
- `DATABASE_URL`

**Never hardcode these in workflows!**

### 4. Visibility Settings

Go to: `Settings` → `General`

- ⚠️ **Private Repository**: Recommended for medical applications
- ⚠️ **Public Repository**: Only if you've removed ALL sensitive data

---

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Review Dependabot alerts
- [ ] Update dependencies with security patches
- [ ] Check for exposed secrets in recent commits

### Monthly
- [ ] Rotate JWT secrets
- [ ] Review access logs
- [ ] Audit user permissions

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update `.gitignore`

---

## 🚨 What to Do If Secrets Are Exposed

### Immediate Actions (Within 1 Hour)

1. **Revoke ALL exposed credentials immediately**
   ```bash
   # Generate new secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Revoke API keys**
   - Google Gemini: https://makersuite.google.com/app/apikey
   - Google OAuth: https://console.cloud.google.com/

3. **Change database passwords**
   ```sql
   ALTER USER mediflow_user WITH PASSWORD 'new_secure_password';
   ```

4. **Notify affected parties**
   - Team members
   - Users (if user data exposed)
   - Compliance officer (HIPAA)

5. **Remove from Git history** (see above)

6. **Monitor for abuse**
   - Check API usage
   - Review database access logs
   - Monitor for unauthorized access

### Report Security Incident

If patient data (PHI) was exposed:
1. Document the incident
2. Notify HIPAA compliance officer
3. Follow breach notification procedures
4. Report to HHS if required (500+ records)

---

## 📋 Pre-Push Command Checklist

Run these commands before EVERY push:

```bash
# 1. Verify .gitignore is working
git status
git check-ignore .env
git check-ignore credentials.json
git check-ignore "google JSON/"

# 2. Search for secrets in staged files
git diff --cached | grep -i "api_key"
git diff --cached | grep -i "secret"
git diff --cached | grep -i "password"

# 3. Check for sensitive patterns
grep -r "GEMINI_API_KEY.*AIza" .
grep -r "JWT_SECRET.*[a-f0-9]{64}" .
grep -r "postgresql://.*:.*@" .

# 4. Verify no SQL dumps
find . -name "*.sql" -not -path "./database/auth_schema.sql"

# 5. Check file sizes (large files may contain data)
find . -type f -size +1M -not -path "./node_modules/*"

# 6. Final review
git diff --cached --name-only
```

---

## 🔗 Additional Resources

### Security Tools
- **git-secrets**: https://github.com/awslabs/git-secrets
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **TruffleHog**: https://github.com/trufflesecurity/trufflehog
- **GitGuardian**: https://www.gitguardian.com/

### GitHub Documentation
- **Removing sensitive data**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- **Secret scanning**: https://docs.github.com/en/code-security/secret-scanning
- **Security advisories**: https://docs.github.com/en/code-security/security-advisories

### HIPAA Compliance
- **HIPAA Security Rule**: https://www.hhs.gov/hipaa/for-professionals/security/
- **Breach Notification**: https://www.hhs.gov/hipaa/for-professionals/breach-notification/

---

## ✅ Final Verification Before Push

```bash
# Run this comprehensive check
echo "=== Checking for sensitive data ==="
echo ""

echo "1. Checking .env files..."
find . -name ".env" -not -path "./node_modules/*"

echo "2. Checking credentials..."
find . -name "*credential*" -o -name "*secret*.json" -not -path "./node_modules/*"

echo "3. Checking SQL dumps..."
find . -name "*.sql" -not -path "./database/auth_schema.sql"

echo "4. Checking for API keys in code..."
grep -r "AIza" . --exclude-dir=node_modules --exclude-dir=.git

echo "5. Checking for hardcoded secrets..."
grep -r "JWT_SECRET.*=" . --exclude-dir=node_modules --exclude-dir=.git --exclude=".env.example"

echo ""
echo "=== If any files are listed above, DO NOT PUSH! ==="
```

---

**Last Updated**: 2025  
**Version**: 1.0.0  
**Compliance**: HIPAA, GDPR, SOC 2
