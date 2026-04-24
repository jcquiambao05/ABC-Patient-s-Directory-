-- Admin Users Table
-- Stores admin user accounts with security features

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- MFA (Multi-Factor Authentication)
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret TEXT,                    -- TOTP secret (base32 encoded)
  mfa_secret_temp TEXT,               -- Temporary secret during setup
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,             -- Account lock expiry
  reset_token TEXT,                   -- Password reset token (hashed)
  reset_token_expiry TIMESTAMP,       -- Reset token expiration
  
  -- OAuth
  google_id TEXT UNIQUE,              -- Google OAuth ID
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_google_id ON admin_users(google_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users(reset_token);

-- Session Tokens Table (for token blacklisting on logout)
CREATE TABLE IF NOT EXISTS session_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,           -- SHA-256 hash of JWT token
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_token_hash ON session_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires_at ON session_tokens(expires_at);

-- Audit Log Table (track all authentication events)
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,           -- login_success, login_failed, mfa_enabled, password_reset, etc.
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM session_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_id TEXT,
  p_event_type TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent, details)
  VALUES (p_user_id, p_event_type, p_ip_address, p_user_agent, p_details);
END;
$$ LANGUAGE plpgsql;

-- Create default admin user (password: Admin@123456)
-- IMPORTANT: Change this password immediately after first login!
INSERT INTO admin_users (id, email, password_hash, name)
VALUES (
  'admin-001',
  'admin@mediflow.ai',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWeCrm4u', -- Admin@123456
  'System Administrator'
)
ON CONFLICT (email) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE admin_users IS 'Admin user accounts with MFA and security features';
COMMENT ON COLUMN admin_users.mfa_secret IS 'TOTP secret for two-factor authentication (base32 encoded)';
COMMENT ON COLUMN admin_users.failed_login_attempts IS 'Counter for failed login attempts (locks account after 5 attempts)';
COMMENT ON COLUMN admin_users.locked_until IS 'Account lock expiry timestamp (15 minutes after 5 failed attempts)';
COMMENT ON COLUMN admin_users.reset_token IS 'SHA-256 hashed password reset token';

COMMENT ON TABLE session_tokens IS 'JWT token tracking for logout and revocation';
COMMENT ON TABLE auth_audit_log IS 'Audit log for all authentication events';
