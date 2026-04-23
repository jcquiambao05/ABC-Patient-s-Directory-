/**
 * Authentication Routes
 * Handles login, MFA, password reset, and Google OAuth
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { Pool } from 'pg';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const router = Router();

// JWT Secret (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '8h';

// Debug: Log JWT_SECRET status (only first 10 chars for security)
console.log('AuthRoutes JWT_SECRET:', JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'NOT SET');

// Helper: Generate JWT token
const generateToken = (userId: string, email: string, role: string = 'staff') => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};
// Helper: Generate temporary token for MFA
const generateTempToken = (userId: string) => {
  return jwt.sign(
    { userId, temp: true },
    JWT_SECRET,
    { expiresIn: '5m' } // 5 minutes to complete MFA
  );
};

// Middleware: Verify JWT token
export const authenticateToken = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next();
  });
};

// Initialize auth routes
export default function initAuthRoutes(pool: Pool) {
  
  // Configure Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // SECURITY: Check if email is in whitelist
        const allowedEmails = process.env.GOOGLE_ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
        
        if (allowedEmails.length === 0) {
          return done(new Error('Google OAuth whitelist not configured'), undefined);
        }

        if (!allowedEmails.includes(email.toLowerCase())) {
          console.warn(`⚠️  Unauthorized Google OAuth attempt from: ${email}`);
          return done(new Error('This Google account is not authorized to access ABC Patient Directory'), undefined);
        }

        // Check if user exists
        const result = await pool.query(
          'SELECT * FROM admin_users WHERE email = $1',
          [email.toLowerCase()]
        );

        let user = result.rows[0];

        if (!user) {
          // Check total admin user count (limit to prevent abuse)
          const countResult = await pool.query('SELECT COUNT(*) as count FROM admin_users');
          const userCount = parseInt(countResult.rows[0].count);
          
          if (userCount >= 5) {
            console.warn(`⚠️  Maximum admin user limit (5) reached. Rejected: ${email}`);
            return done(new Error('Maximum number of admin accounts reached'), undefined);
          }

          // Create new admin user from Google account
          const userId = crypto.randomBytes(16).toString('hex');
          const insertResult = await pool.query(
            `INSERT INTO admin_users (id, email, name, password_hash, mfa_enabled, created_at, last_login)
             VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())
             RETURNING *`,
            [
              userId,
              email.toLowerCase(),
              profile.displayName || email.split('@')[0],
              await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12) // Random password (won't be used)
            ]
          );
          user = insertResult.rows[0];
          console.log(`✅ New admin user created via Google OAuth: ${email}`);
        } else {
          // Update last login
          await pool.query(
            'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
            [user.id]
          );
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }));
  }
  
  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    try {
      // Support "admin" keyword as a special username shortcut
      const identifier = email.trim().toLowerCase();
      const isAdminKeyword = identifier === 'admin';
      const isSuperAdminKeyword = identifier === 'adminabcare';

      // Find user — by keyword shortcuts or by email
      let result;
      if (isSuperAdminKeyword) {
        // Direct lookup by the superadmin's fixed email
        result = await pool.query(
          `SELECT * FROM admin_users WHERE email = 'adminabcare@abclinic.local' AND role = 'superadmin' LIMIT 1`
        );
      } else if (isAdminKeyword) {
        result = await pool.query(
          `SELECT * FROM admin_users WHERE LOWER(email) LIKE '%admin%' AND role = 'admin' ORDER BY created_at ASC LIMIT 1`
        );
      } else {
        result = await pool.query(
          'SELECT * FROM admin_users WHERE email = $1',
          [identifier]
        );
      }

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({ 
          error: 'Account temporarily locked due to multiple failed attempts. Try again later.' 
        });
      }

      // Verify password — superadmin with no password set uses empty string
      const passwordToCheck = password || '';
      const isValidPassword = await bcrypt.compare(passwordToCheck, user.password_hash);

      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = failedAttempts >= 5 
          ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          : null;

        await pool.query(
          'UPDATE admin_users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [failedAttempts, lockUntil, user.id]
        );

        return res.status(401).json({ 
          error: 'Invalid email or password',
          attemptsRemaining: Math.max(0, 5 - failedAttempts)
        });
      }

      // Reset failed attempts on successful password verification
      await pool.query(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Check if MFA is enabled
      if (user.mfa_enabled && user.mfa_secret) {
        const tempToken = generateTempToken(user.id);
        return res.json({
          requiresMFA: true,
          tempToken
        });
      }

      // Generate full access token (include role from DB)
      const token = generateToken(user.id, user.email, user.role || 'staff');

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'staff'
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/verify-mfa
  router.post('/verify-mfa', async (req: Request, res: Response) => {
    const { tempToken, mfaCode } = req.body;

    if (!tempToken || !mfaCode) {
      return res.status(400).json({ error: 'Temp token and MFA code required' });
    }

    try {
      // Verify temp token
      const decoded = jwt.verify(tempToken, JWT_SECRET) as any;

      if (!decoded.temp) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get user
      const result = await pool.query(
        'SELECT * FROM admin_users WHERE id = $1',
        [decoded.userId]
      );

      const user = result.rows[0];

      if (!user || !user.mfa_enabled || !user.mfa_secret) {
        return res.status(401).json({ error: 'MFA not enabled for this user' });
      }

      // Verify MFA code
      const isValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaCode,
        window: 2 // Allow 2 time steps before/after for clock drift
      });

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }

      // Generate full access token
      const token = generateToken(user.id, user.email, user.role || 'staff');

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'staff'
        }
      });

    } catch (error) {
      console.error('MFA verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    try {
      // Find user
      const result = await pool.query(
        'SELECT id, email FROM admin_users WHERE email = $1',
        [email.toLowerCase()]
      );

      const user = result.rows[0];

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ 
          message: 'If an account exists with that email, password reset instructions have been sent.' 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await pool.query(
        'UPDATE admin_users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
        [resetTokenHash, resetTokenExpiry, user.id]
      );

      // TODO: Send email with reset link
      // For now, log the reset token (in production, send via email)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);

      res.json({ 
        message: 'If an account exists with that email, password reset instructions have been sent.' 
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    // Validate password strength
    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters long' });
    }

    try {
      // Hash the token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const result = await pool.query(
        'SELECT * FROM admin_users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
        [tokenHash]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await pool.query(
        'UPDATE admin_users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, password_changed_at = NOW() WHERE id = $2',
        [passwordHash, user.id]
      );

      res.json({ message: 'Password reset successful' });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/setup-mfa
  router.get('/setup-mfa', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    try {
      // Get user
      const result = await pool.query(
        'SELECT email, name FROM admin_users WHERE id = $1',
        [userId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `ABC Patient Directory (${user.email})`,
        issuer: 'ABC Patient Directory'
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Store secret temporarily (not enabled until verified)
      await pool.query(
        'UPDATE admin_users SET mfa_secret_temp = $1 WHERE id = $2',
        [secret.base32, userId]
      );

      res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl
      });

    } catch (error) {
      console.error('Setup MFA error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/enable-mfa
  router.post('/enable-mfa', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { mfaCode } = req.body;

    if (!mfaCode) {
      return res.status(400).json({ error: 'MFA code required' });
    }

    try {
      // Get user with temp secret
      const result = await pool.query(
        'SELECT mfa_secret_temp FROM admin_users WHERE id = $1',
        [userId]
      );

      const user = result.rows[0];

      if (!user || !user.mfa_secret_temp) {
        return res.status(400).json({ error: 'MFA setup not initiated' });
      }

      // Verify MFA code
      const isValid = speakeasy.totp.verify({
        secret: user.mfa_secret_temp,
        encoding: 'base32',
        token: mfaCode,
        window: 2
      });

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }

      // Enable MFA and move temp secret to permanent
      await pool.query(
        'UPDATE admin_users SET mfa_enabled = TRUE, mfa_secret = mfa_secret_temp, mfa_secret_temp = NULL WHERE id = $1',
        [userId]
      );

      res.json({ message: 'MFA enabled successfully' });

    } catch (error) {
      console.error('Enable MFA error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/disable-mfa
  router.post('/disable-mfa', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable MFA' });
    }

    try {
      // Get user
      const result = await pool.query(
        'SELECT password_hash FROM admin_users WHERE id = $1',
        [userId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Disable MFA
      await pool.query(
        'UPDATE admin_users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1',
        [userId]
      );

      res.json({ message: 'MFA disabled successfully' });

    } catch (error) {
      console.error('Disable MFA error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/google (Initiate Google OAuth)
  router.get('/google', (req: Request, res: Response, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        error: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file.' 
      });
    }

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false
    })(req, res, next);
  });

  // GET /api/auth/google/callback (Google OAuth callback)
  router.get('/google/callback', (req: Request, res: Response, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect('/?error=oauth_not_configured');
    }

    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/?error=oauth_failed'
    }, (err: any, user: any) => {
      if (err) {
        console.error('Google OAuth error:', err.message);
        
        // Handle specific error cases
        if (err.message.includes('not authorized')) {
          return res.redirect('/?error=unauthorized_account');
        } else if (err.message.includes('Maximum number')) {
          return res.redirect('/?error=max_users_reached');
        } else if (err.message.includes('whitelist not configured')) {
          return res.redirect('/?error=whitelist_not_configured');
        }
        
        return res.redirect('/?error=oauth_failed');
      }

      if (!user) {
        return res.redirect('/?error=oauth_failed');
      }

      // Generate JWT token
      const token = generateToken(user.id, user.email, user.role || 'staff');

      // Redirect to frontend with token
      res.redirect(`/?token=${token}`);
    })(req, res, next);
  });

  // GET /api/auth/me (Get current user)
  router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    try {
      const result = await pool.query(
        'SELECT id, email, name, display_name, role, mfa_enabled, created_at, last_login, preferences FROM admin_users WHERE id = $1',
        [userId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/auth/preferences
  router.patch('/preferences', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object required' });
    }
    try {
      await pool.query(
        'UPDATE admin_users SET preferences = $1 WHERE id = $2',
        [JSON.stringify(preferences), userId]
      );
      res.json({ success: true, preferences });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/signup-availability — check how many slots remain
  router.get('/signup-availability', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          (2 - COUNT(*) FILTER (WHERE role = 'staff'))::int  AS staff_slots,
          (2 - COUNT(*) FILTER (WHERE role = 'admin'))::int  AS admin_slots
         FROM admin_users`
      );
      const { staff_slots, admin_slots } = result.rows[0];
      res.json({
        staff_slots:  Math.max(0, staff_slots),
        admin_slots:  Math.max(0, admin_slots),
        total_slots:  Math.max(0, staff_slots) + Math.max(0, admin_slots),
        registration_open: (staff_slots > 0 || admin_slots > 0)
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/signup — create a new account (max 2 staff + 2 admin)
  router.post('/signup', async (req: Request, res: Response) => {
    const { name, email, password, confirmPassword, role } = req.body;

    // ── Basic field validation ──────────────────────────────
    if (!name?.trim() || !email?.trim() || !password || !confirmPassword || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be staff or admin' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // ── Password strength validation ────────────────────────
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Google OAuth conflict check ─────────────────────────
    // If this email is in the Google whitelist, block password signup
    const googleAllowed = process.env.GOOGLE_ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    if (googleAllowed.includes(normalizedEmail)) {
      return res.status(400).json({
        error: 'This email is linked to Google sign-in. Please use the "Continue with Google" button instead.',
        useGoogle: true
      });
    }

    try {
      // ── Slot count check (server-side, cannot be bypassed) ──
      const slotResult = await pool.query(
        `SELECT
          (2 - COUNT(*) FILTER (WHERE role = 'staff'))::int AS staff_slots,
          (2 - COUNT(*) FILTER (WHERE role = 'admin'))::int AS admin_slots
         FROM admin_users`
      );
      const { staff_slots, admin_slots } = slotResult.rows[0];
      const availableSlot = role === 'staff' ? Math.max(0, staff_slots) : Math.max(0, admin_slots);

      if (availableSlot <= 0) {
        return res.status(403).json({
          error: `No more ${role === 'admin' ? 'Doctor/Admin' : 'Staff'} accounts can be created. Maximum of 2 reached.`
        });
      }

      // ── Duplicate email check ───────────────────────────────
      const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      // ── Create account ──────────────────────────────────────
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = crypto.randomBytes(16).toString('hex');

      await pool.query(
        `INSERT INTO admin_users (id, email, name, password_hash, role, mfa_enabled, failed_login_attempts, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, 0, NOW())`,
        [userId, normalizedEmail, name.trim(), passwordHash, role]
      );

      res.status(201).json({
        success: true,
        message: 'Account created. Now set up MFA.',
        userId  // returned so frontend can call setup-mfa next
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/signup-setup-mfa
  // Step 2 of signup: generate TOTP secret + QR code for a newly created account
  // The account is NOT yet mfa_enabled — it becomes enabled only after the user
  // scans the QR code and verifies the first code successfully.
  router.post('/signup-setup-mfa', async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
      const result = await pool.query('SELECT email, name, mfa_enabled FROM admin_users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.mfa_enabled) return res.status(400).json({ error: 'MFA already set up for this account' });

      // Generate TOTP secret — stored locally, no internet needed
      const secret = speakeasy.generateSecret({
        name: `ABCare (${user.email})`,
        issuer: 'ABCare OmniFlow'
      });

      // Store temp secret (not active until verified)
      await pool.query('UPDATE admin_users SET mfa_secret_temp = $1 WHERE id = $2', [secret.base32, userId]);

      // Generate QR code as data URL — user scans this with Google Authenticator / Authy
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      res.json({ qrCode, secret: secret.base32 });
    } catch (error) {
      console.error('Signup MFA setup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/signup-verify-mfa
  // Step 3 of signup: user enters the first 6-digit code to confirm their app is working
  // This activates MFA on the account — after this, every login requires the code
  router.post('/signup-verify-mfa', async (req: Request, res: Response) => {
    const { userId, mfaCode } = req.body;
    if (!userId || !mfaCode) return res.status(400).json({ error: 'userId and mfaCode required' });

    try {
      const result = await pool.query('SELECT mfa_secret_temp, mfa_enabled FROM admin_users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.mfa_enabled) return res.status(400).json({ error: 'MFA already activated' });
      if (!user.mfa_secret_temp) return res.status(400).json({ error: 'MFA setup not started. Call signup-setup-mfa first.' });

      // Verify the code the user typed matches what the app would generate
      const isValid = speakeasy.totp.verify({
        secret: user.mfa_secret_temp,
        encoding: 'base32',
        token: mfaCode,
        window: 2
      });

      if (!isValid) return res.status(401).json({ error: 'Invalid code. Check your authenticator app and try again.' });

      // Code is correct — activate MFA permanently
      await pool.query(
        'UPDATE admin_users SET mfa_enabled = TRUE, mfa_secret = mfa_secret_temp, mfa_secret_temp = NULL WHERE id = $1',
        [userId]
      );

      res.json({ success: true, message: 'MFA activated. Your account is ready. Please log in.' });
    } catch (error) {
      console.error('Signup MFA verify error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/auth/change-password — any authenticated user can change their own password
  router.patch('/change-password', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ error: 'newPassword is required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    try {
      const result = await pool.query('SELECT password_hash, role FROM admin_users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Superadmin with no password set can skip current password check
      const isSuperAdminNoPassword = user.role === 'superadmin' && currentPassword === '';
      if (!isSuperAdminNoPassword) {
        if (!currentPassword) return res.status(400).json({ error: 'currentPassword is required' });
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE admin_users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2', [hash, userId]);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/auth/display-name — any authenticated user can update their display name
  router.patch('/display-name', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { display_name } = req.body;
    if (!display_name?.trim()) return res.status(400).json({ error: 'display_name is required' });
    try {
      await pool.query('UPDATE admin_users SET display_name = $1, name = $1 WHERE id = $2', [display_name.trim(), userId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Superadmin-only user management endpoints ──────────────────────────

  const requireSuperAdmin = (req: Request, res: Response, next: Function) => {
    if ((req as any).user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
  };

  // GET /api/auth/users — list all accounts (superadmin only)
  router.get('/users', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, email, name, display_name, role, mfa_enabled, created_at, last_login FROM admin_users ORDER BY created_at ASC'
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/auth/users/:id — delete a user account (superadmin only, cannot delete self)
  router.delete('/users/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
    const requesterId = (req as any).user.userId;
    if (req.params.id === requesterId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    if (req.params.id === 'superadmin-001') {
      return res.status(400).json({ error: 'Cannot delete the primary superadmin account' });
    }
    try {
      const r = await pool.query('SELECT name, role FROM admin_users WHERE id = $1', [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
      await pool.query('DELETE FROM admin_users WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/auth/users/:id/reset-password — superadmin resets any user's password
  router.patch('/users/:id/reset-password', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }
    try {
      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE admin_users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2', [hash, req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/auth/google-whitelist — get current whitelist (superadmin only)
  router.get('/google-whitelist', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
    const emails = process.env.GOOGLE_ALLOWED_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
    res.json({ emails });
  });

  // PUT /api/auth/google-whitelist — update whitelist (superadmin only)
  // Updates the in-memory env var AND writes to .env file
  router.put('/google-whitelist', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
    const { emails } = req.body;
    if (!Array.isArray(emails)) return res.status(400).json({ error: 'emails must be an array' });

    const cleaned = emails.map((e: string) => e.trim().toLowerCase()).filter(Boolean);

    // Update in-memory immediately (takes effect for new logins right away)
    process.env.GOOGLE_ALLOWED_EMAILS = cleaned.join(',');

    // Persist to .env file so it survives restarts
    try {
      const fs = await import('fs');
      const path = await import('path');
      const envPath = path.resolve('.env');
      let envContent = fs.readFileSync(envPath, 'utf8');

      if (envContent.includes('GOOGLE_ALLOWED_EMAILS=')) {
        envContent = envContent.replace(
          /^GOOGLE_ALLOWED_EMAILS=.*$/m,
          `GOOGLE_ALLOWED_EMAILS=${cleaned.join(',')}`
        );
      } else {
        envContent += `\nGOOGLE_ALLOWED_EMAILS=${cleaned.join(',')}`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (err) {
      console.error('Could not write .env file:', err);
      // Still return success since in-memory update worked
    }

    res.json({ success: true, emails: cleaned });
  });

  return router;
}
