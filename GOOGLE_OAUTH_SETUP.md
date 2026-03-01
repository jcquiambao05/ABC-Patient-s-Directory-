# Google OAuth Setup Guide for MediFlow AI

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "MediFlow AI" → Click "Create"
4. Wait for project creation (notification will appear)

## Step 2: Enable Google+ API

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it → Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (for testing) → Click "Create"
3. Fill in the required fields:
   - **App name**: MediFlow AI
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click "Save and Continue"
5. On "Scopes" page → Click "Add or Remove Scopes"
   - Select: `userinfo.email`
   - Select: `userinfo.profile`
   - Click "Update" → "Save and Continue"
6. On "Test users" page → Click "Add Users"
   - Add your admin email: `admin@mediflow.ai` (or your actual email)
   - Click "Save and Continue"
7. Click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Application type": **Web application**
4. Name it: "MediFlow AI Web Client"
5. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://127.0.0.1:3000/api/auth/google/callback`
7. Click "Create"
8. **IMPORTANT**: Copy the credentials shown:
   - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc123xyz`)

## Step 5: Add to .env File

Add these lines to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from Step 4.

## Step 6: Restart Server

After adding credentials to `.env`:
```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## Testing Google OAuth

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Select your Google account
4. Grant permissions
5. You should be logged in!

## Production Setup (Later)

When deploying to production:
1. Update OAuth consent screen to "Production"
2. Add production domain to authorized origins/redirects
3. Update `GOOGLE_CALLBACK_URL` in production `.env`

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the callback URL in Google Console exactly matches your `.env` setting
- Check for trailing slashes (should NOT have one)

**Error: "Access blocked: This app's request is invalid"**
- Make sure you added your email as a test user in OAuth consent screen
- Make sure Google+ API is enabled

**Error: "invalid_client"**
- Double-check your Client ID and Client Secret in `.env`
- Make sure there are no extra spaces or quotes

## Security Notes

- Never commit `.env` file to git (already in `.gitignore`)
- Keep Client Secret confidential
- For production, use environment variables on your hosting platform
- Rotate credentials if compromised
