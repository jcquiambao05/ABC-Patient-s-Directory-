# White Screen Troubleshooting Guide

## Quick Fixes (Try These First)

### 1. Hard Refresh Browser
Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac) to clear cache and reload.

### 2. Clear Browser Cache
1. Open DevTools: `F12` or `Ctrl + Shift + I`
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 3. Check Browser Console
1. Open DevTools: `F12`
2. Go to "Console" tab
3. Look for red error messages
4. Share any errors you see

### 4. Check Network Tab
1. Open DevTools: `F12`
2. Go to "Network" tab
3. Refresh page
4. Look for failed requests (red status codes)
5. Check if `main.tsx` loads successfully

## Common Issues & Solutions

### Issue 1: "Failed to fetch" or CORS errors
**Solution:** Server not running or wrong port
```bash
# Check if server is running
curl http://localhost:3000

# Restart server
npm run dev
```

### Issue 2: "Unexpected token '<'" in console
**Solution:** JavaScript file returning HTML (build issue)
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue 3: CSS not loading (page loads but unstyled)
**Solution:** Tailwind CSS not compiling
```bash
# Check if Tailwind is installed
npm list @tailwindcss/vite

# Reinstall if missing
npm install @tailwindcss/vite
```

### Issue 4: React not rendering
**Solution:** Check if root element exists
- Open DevTools → Elements tab
- Look for `<div id="root"></div>`
- Should have React components inside

## Diagnostic Commands

Run these to check system health:

```bash
# 1. Check if server is running
curl http://localhost:3000

# 2. Check if API is responding
curl http://localhost:3000/api/auth/me

# 3. Check Node/npm versions
node --version  # Should be v18+
npm --version

# 4. Check for port conflicts
lsof -i:3000

# 5. Check server logs
# Look at terminal where you ran 'npm run dev'
```

## Step-by-Step Debugging

### Step 1: Verify Server is Running
```bash
npm run dev
```
Should see:
```
✅ Connected to PostgreSQL/Supabase successfully.
✅ Database schema verified/created.
Server running on http://localhost:3000
```

### Step 2: Test in Browser
1. Open http://localhost:3000
2. Should see login screen (not white screen)

### Step 3: Check Browser Console
Press `F12` and look for errors like:
- ❌ "Cannot read property of undefined"
- ❌ "Failed to fetch"
- ❌ "Unexpected token"
- ❌ "Module not found"

### Step 4: Check Network Requests
In DevTools → Network tab:
- ✅ `main.tsx` should load (200 status)
- ✅ `App.tsx` should load (200 status)
- ✅ `index.css` should load (200 status)

## Nuclear Option (If Nothing Works)

```bash
# 1. Stop server
# Press Ctrl+C in terminal

# 2. Kill all Node processes
pkill -f node

# 3. Clear everything
rm -rf node_modules package-lock.json .vite

# 4. Reinstall
npm install

# 5. Restart
npm run dev

# 6. Hard refresh browser
# Ctrl + Shift + R
```

## What to Check in Browser DevTools

### Console Tab
Look for:
- Red error messages
- Yellow warnings about missing modules
- Network errors

### Network Tab
Check:
- Status codes (should be 200 or 304)
- Failed requests (red)
- Slow requests (>1s)

### Elements Tab
Verify:
- `<div id="root">` exists
- Has child elements (React components)
- Not empty

## Still White Screen?

If you still see a white screen after trying everything:

1. **Take a screenshot** of:
   - Browser console (F12 → Console tab)
   - Network tab showing failed requests
   - Terminal showing server logs

2. **Check these files exist**:
   ```bash
   ls -la src/components/App.tsx
   ls -la src/components/Login.tsx
   ls -la src/components/main.tsx
   ls -la index.html
   ```

3. **Verify file contents**:
   ```bash
   # Check if App.tsx has content
   wc -l src/components/App.tsx
   # Should show ~650+ lines
   ```

## Quick Test: Is React Working?

Create a simple test file:

```bash
# Create test.html
cat > test.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>If you see this, HTML works!</h1>
  <div id="root"></div>
  <script>
    document.getElementById('root').innerHTML = '<p>JavaScript works!</p>';
  </script>
</body>
</html>
EOF

# Open in browser
# http://localhost:3000/test.html
```

If you see "HTML works!" and "JavaScript works!", then the issue is with React/Vite.

## Common Causes Summary

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Completely white | Browser cache | Hard refresh (Ctrl+Shift+R) |
| White + console errors | JavaScript error | Check console, fix error |
| White + network errors | Server not running | Restart `npm run dev` |
| Loads then white | React render error | Check App.tsx for errors |
| Unstyled content | CSS not loading | Check Tailwind config |

## Emergency Recovery

If you need to get back to a working state:

```bash
# 1. Backup your .env file
cp .env .env.backup

# 2. Reset to clean state
git status  # Check what changed
git diff    # See changes

# 3. If needed, restore specific files
git checkout src/components/App.tsx
git checkout src/components/Login.tsx

# 4. Restore .env
cp .env.backup .env

# 5. Reinstall and restart
npm install
npm run dev
```

## Contact Points

If still stuck, provide:
1. Browser console screenshot
2. Network tab screenshot  
3. Terminal output from `npm run dev`
4. Output of `curl http://localhost:3000`
5. Node version: `node --version`
