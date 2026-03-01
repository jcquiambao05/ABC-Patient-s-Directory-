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
const generateToken = (userId: string, email: string) => {
  return jwt.sign(
    { userId, email, role: 'admin' },
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
          return done(new Error('This Google account is not authorized to access MediFlow AI'), undefined);
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
      // Find user
      const result = await pool.query(
        'SELECT * FROM admin_users WHERE email = $1',
        [email.toLowerCase()]
      );

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

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

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

      // Generate full access token
      const token = generateToken(user.id, user.email);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
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
      const token = generateToken(user.id, user.email);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
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
        name: `MediFlow AI (${user.email})`,
        issuer: 'MediFlow AI'
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
      const token = generateToken(user.id, user.email);

      // Redirect to frontend with token
      res.redirect(`/?token=${token}`);
    })(req, res, next);
  });

  // GET /api/auth/me (Get current user)
  router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    try {
      const result = await pool.query(
        'SELECT id, email, name, mfa_enabled, created_at, last_login FROM admin_users WHERE id = $1',
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

  return router;
}
