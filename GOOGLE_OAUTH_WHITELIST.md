# Google OAuth Whitelist Security Guide

## 🔒 Security Overview

Your MediFlow AI system uses a **whitelist-based approach** for Google OAuth authentication. This means:

- ✅ Only pre-approved Google accounts can sign in
- ❌ Any other Google account will be rejected
- 🛡️ Maximum 5 admin accounts total (hardcoded limit)
- 📝 All unauthorized attempts are logged

## 📋 Current Configuration

The whitelist is stored in your `.env` file:

```env
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,doctor@clinic.com
```

## 🔧 How to Add/Remove Google Accounts

### Adding a New Google Account

1. **Open `.env` file** in your project root
2. **Find the line**: `GOOGLE_ALLOWED_EMAILS=`
3. **Add the new email** (comma-separated, no spaces):
   ```env
   GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,doctor@clinic.com,newuser@gmail.com
   ```
4. **Save the file**
5. **Restart the server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Removing a Google Account

1. **Open `.env` file**
2. **Remove the email** from the list:
   ```env
   # Before
   GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,doctor@clinic.com,olduser@gmail.com
   
   # After
   GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,doctor@clinic.com
   ```
3. **Save and restart server**

### Important Notes

- **Case insensitive**: `Admin@MediFlow.ai` = `admin@mediflow.ai`
- **No spaces**: Don't add spaces between emails
- **Exact match**: Email must match exactly (including domain)
- **Restart required**: Changes only take effect after server restart

## 🚨 Security Limits

### Hard Limits (Cannot be bypassed)

1. **Maximum 5 admin accounts** - Prevents database bloat and unauthorized access
2. **Whitelist required** - If `GOOGLE_ALLOWED_EMAILS` is empty, all OAuth attempts fail
3. **Email verification** - Only verified Google accounts can authenticate

### What Happens When Limits Are Reached?

**Scenario 1: Unauthorized Google Account**
```
User tries: hacker@gmail.com
Whitelist: admin@mediflow.ai,doctor@clinic.com
Result: ❌ "This Google account is not authorized"
```

**Scenario 2: Maximum Users Reached**
```
Current users: 5 admin accounts
New user tries: newdoctor@clinic.com (even if whitelisted)
Result: ❌ "Maximum number of admin accounts reached"
```

**Scenario 3: Whitelist Not Configured**
```
GOOGLE_ALLOWED_EMAILS is empty or not set
Result: ❌ "Google OAuth whitelist not configured"
```

## 📊 Monitoring & Logs

All unauthorized attempts are logged in the server console:

```
⚠️  Unauthorized Google OAuth attempt from: hacker@gmail.com
⚠️  Maximum admin user limit (5) reached. Rejected: newuser@gmail.com
```

Check your server logs regularly for suspicious activity.

## 🔐 Best Practices

### 1. Use Work/Organization Emails
```env
# ✅ Good - Organization emails
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,doctor@clinic.com

# ⚠️  Less secure - Personal emails
GOOGLE_ALLOWED_EMAILS=john123@gmail.com,mary456@yahoo.com
```

### 2. Keep the List Minimal
- Only add accounts that absolutely need access
- Remove accounts when staff leaves
- Review the list quarterly

### 3. Document Who Has Access
Keep a separate record of who owns each email:

```
admin@mediflow.ai - Dr. John Smith (Head Admin)
doctor@clinic.com - Dr. Mary Johnson (Branch Manager)
```

### 4. Regular Audits
Check your database for active admin users:

```bash
# Connect to your database
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

# List all admin users
SELECT email, name, created_at, last_login FROM admin_users ORDER BY created_at;
```

## 🛠️ Troubleshooting

### Problem: "This Google account is not authorized"

**Solution:**
1. Check if email is in `GOOGLE_ALLOWED_EMAILS`
2. Verify spelling and domain
3. Restart server after adding email

### Problem: "Maximum number of admin accounts reached"

**Solution:**
1. Check current user count in database
2. Remove inactive users if needed:
   ```sql
   DELETE FROM admin_users WHERE email = 'olduser@example.com';
   ```
3. Or increase limit in code (not recommended)

### Problem: "Google OAuth whitelist not configured"

**Solution:**
1. Make sure `GOOGLE_ALLOWED_EMAILS` is set in `.env`
2. Must have at least one email
3. Restart server

## 🔄 Changing the Maximum User Limit

If you need more than 5 admin accounts:

1. **Open**: `src/auth/authRoutes.ts`
2. **Find line** (~line 75):
   ```typescript
   if (userCount >= 5) {
   ```
3. **Change to your desired limit**:
   ```typescript
   if (userCount >= 10) {  // Now allows 10 users
   ```
4. **Save and restart server**

⚠️ **Warning**: Higher limits = more potential security risk

## 📝 Example Configurations

### Single Branch (2 users)
```env
GOOGLE_ALLOWED_EMAILS=admin@clinic.com,manager@clinic.com
```

### Multi-Branch (5 users)
```env
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,branch1@clinic.com,branch2@clinic.com,branch3@clinic.com,branch4@clinic.com
```

### Development + Production
```env
# Development
GOOGLE_ALLOWED_EMAILS=dev@mediflow.ai,test@mediflow.ai

# Production
GOOGLE_ALLOWED_EMAILS=admin@clinic.com,doctor@clinic.com
```

## 🔒 Additional Security Recommendations

1. **Enable MFA** for all admin accounts (even Google OAuth users)
2. **Use strong passwords** for email/password login
3. **Monitor login attempts** in auth_audit_log table
4. **Rotate credentials** if breach suspected
5. **Keep .env file secure** - never commit to git
6. **Use environment variables** in production (not .env file)

## 📞 Emergency: Lockout Recovery

If you accidentally lock yourself out:

1. **Direct database access**:
   ```sql
   -- Add your email to an existing user
   UPDATE admin_users 
   SET email = 'your-email@gmail.com' 
   WHERE email = 'admin@mediflow.ai';
   ```

2. **Or create new user manually**:
   ```sql
   INSERT INTO admin_users (id, email, name, password_hash, mfa_enabled)
   VALUES (
     gen_random_uuid()::text,
     'recovery@clinic.com',
     'Recovery Admin',
     '$2b$12$...',  -- Use bcrypt to hash a password
     FALSE
   );
   ```

3. **Update whitelist** and restart server

## 📚 Related Files

- `.env` - Whitelist configuration
- `src/auth/authRoutes.ts` - OAuth logic and limits
- `database/auth_schema.sql` - Database schema
- `GOOGLE_OAUTH_SETUP.md` - Initial OAuth setup guide
