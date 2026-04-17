# ABCare PHP — Windows Server 2019 Setup Guide
## Offline / No Internet Required After Initial Download

---

## Recommendation: Local Download vs Internet

**Use local offline download.** Reasons:
- Windows Server 2019 VMs often have no internet by default
- XAMPP is a single installer that bundles Apache + PHP + MySQL — no dependency hell
- Reproducible: same installer = same result every time
- No risk of version mismatches or CDN failures during setup

---

## What to Download (do this once on a machine with internet)

| File | Download From | Size |
|------|--------------|------|
| XAMPP for Windows | https://www.apachefriends.org | ~170MB |
| The `abccare-php` folder | (copy from this project) | ~50KB |

Copy both to a USB drive or shared folder.

---

## Setup on Windows Server 2019 VM

### Step 1 — Install XAMPP

1. Run `xampp-windows-x64-8.2.x-installer.exe`
2. Install to default path: `C:\xampp`
3. Components needed: **Apache**, **MySQL**, **PHP** (uncheck others to save space)
4. Finish install

### Step 2 — Copy the PHP app

Copy the `abccare-php` folder to:
```
C:\xampp\htdocs\abccare-php\
```

Your folder structure should look like:
```
C:\xampp\htdocs\abccare-php\
  index.php          ← login page
  directory.php      ← patient directory
  logout.php
  includes\
    db.php
    auth.php
  database\
    schema.sql
```

### Step 3 — Start XAMPP services

Open XAMPP Control Panel (Start → XAMPP → XAMPP Control Panel)

Click **Start** next to:
- Apache
- MySQL

Both should show green "Running" status.

### Step 4 — Create the database

Open your browser and go to:
```
http://localhost/phpmyadmin
```

1. Click **New** in the left sidebar
2. Database name: `abccare`
3. Collation: `utf8mb4_unicode_ci`
4. Click **Create**
5. Click the `abccare` database
6. Click **Import** tab
7. Click **Choose File** → select `C:\xampp\htdocs\abccare-php\database\schema.sql`
8. Click **Go**

You should see "Import has been successfully finished."

### Step 5 — Access the app

Open browser:
```
http://localhost/abccare-php/
```

Login credentials:
| Account | Email | Password | Role |
|---------|-------|----------|------|
| Staff | staff@abcclinic.com | Staff@ABC2026! | Staff |
| Doctor | doctor@abcclinic.com | Doctor@ABC2026! | Doctor/Admin |

---

## Access from other computers on the same network

Find the server's IP address:
```cmd
ipconfig
# Look for IPv4 Address — e.g., 192.168.1.100
```

Allow Apache through Windows Firewall:
```powershell
# Run PowerShell as Administrator
netsh advfirewall firewall add rule name="XAMPP Apache" dir=in action=allow protocol=TCP localport=80
```

Other devices connect to:
```
http://192.168.1.100/abccare-php/
```

---

## Make XAMPP start automatically on boot

In XAMPP Control Panel:
- Click the red X next to Apache → changes to checkmark (auto-start)
- Click the red X next to MySQL → changes to checkmark (auto-start)

Or via Windows Services:
```cmd
# Run as Administrator
sc config Apache2.4 start=auto
sc config MySQL start=auto
```

---

## Troubleshooting

**"Port 80 already in use"**
IIS (Internet Information Services) may be running. Disable it:
```cmd
# Run as Administrator
iisreset /stop
sc config W3SVC start=disabled
```
Then restart Apache in XAMPP.

**"Access denied" for MySQL**
The default XAMPP MySQL has no password for root. If you set one, update `includes/db.php`:
```php
define('DB_PASS', 'your_password_here');
```

**White page / PHP errors**
Check Apache error log: `C:\xampp\apache\logs\error.log`

---

## Security note for production use

The default XAMPP setup is for development. Before using with real patient data:
1. Set a MySQL root password in phpMyAdmin → User Accounts
2. Update `DB_PASS` in `includes/db.php`
3. Delete `phpmyadmin` from `C:\xampp\htdocs\` or restrict access to localhost only
4. Change the default login passwords in the database

---

## What this PHP version includes

- Login with email/password (bcrypt hashed)
- Account lockout after 5 failed attempts
- Role-based access (staff vs doctor/admin)
- Patient directory grouped by last name
- Add new patient (staff only)
- Delete patient (staff only)
- Patient detail view
- Search by name
- Session-based authentication (no JWT needed)
- No Google OAuth — works 100% offline
