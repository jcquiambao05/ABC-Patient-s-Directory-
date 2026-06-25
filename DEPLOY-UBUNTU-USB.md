# ABCare OmniFlow — Ubuntu LTS Server Deployment Guide (USB / Offline)

**Target OS:** Ubuntu 24.04 LTS Server (Noble Numbat)  
**Method:** USB flash drive — no internet required on the server  
**Auto-start:** App starts automatically every time the server computer powers on  

---

## What You Need

- USB flash drive (minimum 8GB recommended)
- A computer with internet to prepare the USB (your Kubuntu laptop)
- The server computer where you'll install Ubuntu 24.04 LTS

---

## PART A — Prepare USB on Your Kubuntu Laptop (with internet)

Do these steps ONCE on your Kubuntu machine before going to the server.

### Step 1 — Install Docker on Kubuntu (if not already installed)

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2 — Pull Docker images while online

```bash
docker pull node:20-alpine
docker pull postgres:15-alpine
```

### Step 3 — Mount your USB drive and check its path

```bash
lsblk
# Look for your USB — usually /dev/sdb1 or similar
# It will be mounted at /media/yourname/USBNAME
ls /media/
```

### Step 4 — Copy the app files to USB

```bash
# Replace /media/jermaine/USBDRIVE with your actual USB mount path
USB="/media/jermaine/USBDRIVE"

# Copy the entire project (excluding node_modules and git history to save space)
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='dist' \
          --exclude='uploads' \
          /home/jermaine/Documents/Repo/Kiro_Repo/ABC-Patient-s-Directory-/ \
          "$USB/abccare/"

echo "App files copied"
```

### Step 5 — Save Docker images to USB

```bash
USB="/media/jermaine/USBDRIVE"

docker save -o "$USB/docker-images.tar" node:20-alpine postgres:15-alpine
echo "Docker images saved: $(du -sh $USB/docker-images.tar)"
```

### Step 6 — Verify USB contents

```bash
USB="/media/jermaine/USBDRIVE"
ls -lh "$USB/"
# Should show: abccare/  docker-images.tar
du -sh "$USB/"
```

### Step 7 — Safely eject USB

```bash
sync
sudo umount /media/jermaine/USBDRIVE
```

---

## PART B — Install Ubuntu 24.04 LTS on the Server Computer

### Step 1 — Download Ubuntu 24.04 LTS Server ISO

Download from: https://ubuntu.com/download/server  
Select: **Ubuntu Server 24.04.4 LTS** → **64-bit PC (AMD64) server install image**

### Step 2 — Flash ISO to a separate USB (bootable installer)

Use a different USB than your app USB.  
On Kubuntu:
```bash
# Find your installer USB device (NOT your app USB)
lsblk
# Flash the ISO (replace /dev/sdX with your installer USB device)
sudo dd if=~/Downloads/ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
sync
```

### Step 3 — Install Ubuntu on the server computer

1. Plug in the bootable installer USB into the server computer
2. Boot from USB (press F2/F12/Delete during startup for boot menu)
3. Select **Install Ubuntu Server**
4. Follow the installer:
   - Language: English
   - Network: configure your ethernet (or skip if no internet)
   - Storage: **Use entire disk** (erases everything — confirm this)
   - Profile: set your username and password
   - **SSH**: CHECK "Install OpenSSH server" ← IMPORTANT
   - Additional snaps: skip everything
5. Wait for installation to complete (~10-15 minutes)
6. Remove USB when prompted and reboot

---

## PART C — Deploy the App on Ubuntu Server (from USB)

### Step 1 — Log into the server

Either directly at the keyboard, or SSH from your Kubuntu laptop:
```bash
# Find server IP
ip addr show | grep "inet " | grep -v 127

# From Kubuntu:
ssh youruser@SERVER_IP
```

### Step 2 — Install Docker on the server

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin curl git
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

### Step 3 — Plug in your app USB and find the mount point

```bash
lsblk
ls /media/
# Your USB should auto-mount or mount it manually:
sudo mkdir -p /mnt/usb
sudo mount /dev/sdb1 /mnt/usb
ls /mnt/usb/
# Should show: abccare/  docker-images.tar
```

### Step 4 — Load Docker images from USB (no internet needed)

```bash
sudo docker load -i /mnt/usb/docker-images.tar
docker images
# Should show node:20-alpine and postgres:15-alpine
```

### Step 5 — Copy app files from USB to server

```bash
sudo cp -r /mnt/usb/abccare /opt/abccare
sudo chown -R $USER:$USER /opt/abccare
ls /opt/abccare/
# Should show: server.ts, package.json, docker-compose.yml, manage.sh, etc.
```

### Step 6 — Create and configure the .env file

```bash
cd /opt/abccare
cp .env.example .env
nano .env
```

**Fill in these values in nano** (use arrow keys, Ctrl+O to save, Ctrl+X to exit):

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
NODE_ENV=production
APP_PORT=3000

# Generate new secrets (copy the output of these commands):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=PASTE_YOUR_64_CHAR_HEX_HERE
SESSION_SECRET=PASTE_ANOTHER_64_CHAR_HEX_HERE

# Email (for password reset OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=ABCare OmniFlow <noreply@abcclinic.com>

# SMS (Semaphore)
SMS_API_KEY=your_semaphore_api_key
SMS_SENDER_NAME=ABCClinic
```

**Generate the JWT secrets** in a separate terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run twice — use first output for JWT_SECRET, second for SESSION_SECRET
```

### Step 7 — Build the Docker image (uses the pre-loaded node:20-alpine)

```bash
cd /opt/abccare
docker compose build
# This takes 2-5 minutes on first build
```

### Step 8 — Load the database schema

```bash
# Start just the database container first
docker compose up -d postgres

# Wait for postgres to be ready
sleep 5

# Load the full schema
docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/01-full_schema.sql

# Verify tables were created
docker compose exec postgres psql -U postgres -d postgres -c "\dt"
```

### Step 9 — Start the full application

```bash
cd /opt/abccare
bash manage.sh start
```

You should see:
```
✓  ABCare OmniFlow is ready!
Open in browser:  http://localhost:3000
```

### Step 10 — Test it works

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

Open a browser on any computer on the same network:
```
http://SERVER_IP:3000
```

---

## PART D — Auto-Start on Server Boot (Run Once)

This makes the app start automatically every time the server computer turns on.

### Method 1 — systemd service (recommended, most reliable)

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/abccare.service << 'SERVICE'
[Unit]
Description=ABCare OmniFlow Clinic Management
After=docker.service network.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/abccare
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable abccare
sudo systemctl start abccare

# Verify it's active
sudo systemctl status abccare
```

### Method 2 — Docker restart policy (already configured)

The `docker-compose.yml` already has `restart: unless-stopped` on all containers.
This means if Docker is running, the containers restart automatically after a reboot.

You just need to ensure Docker starts on boot:
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### Test the auto-start

```bash
# Reboot the server
sudo reboot

# After reboot, SSH back in and check
ssh youruser@SERVER_IP
docker ps
curl http://localhost:3000/api/health
# App should already be running without any manual intervention
```

---

## PART E — Configure Firewall

```bash
# Allow SSH (so you can manage the server)
sudo ufw allow ssh

# Allow the app port
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## PART F — Daily Management Commands

All management is done with the `manage.sh` script:

```bash
cd /opt/abccare

# Check if app is running
bash manage.sh status

# View live logs
bash manage.sh logs

# Restart app
bash manage.sh restart

# Stop app
bash manage.sh stop

# Start app
bash manage.sh start
```

---

## Default Login Credentials

**Change all passwords immediately after first login!**

| Role | Username | Password |
|------|----------|----------|
| Superadmin | `adminabcare` | `Admin@ABCare2026` |
| Doctor | `doctor@abcclinic.com` | `Doctor@ABC2026!` |
| Staff | `staff@abcclinic.com` | `Staff@ABC2026!` |

---

## Troubleshooting

### App not starting
```bash
bash manage.sh logs
docker compose logs app
```

### Database connection error
```bash
docker compose ps
# Check if postgres container is running
docker compose restart postgres
bash manage.sh restart
```

### Port 3000 already in use
```bash
sudo ss -tlnp | grep 3000
sudo kill -9 $(sudo lsof -ti:3000)
bash manage.sh start
```

### Check server IP address
```bash
ip addr show | grep "inet " | grep -v 127
hostname -I
```

---

## File Structure on Server After Deployment

```
/opt/abccare/
├── server.ts              # Backend
├── src/                   # Frontend source
├── database/
│   ├── full_schema.sql    # Database schema
│   └── seed_demo_data.sql # Demo patients
├── uploads/               # Patient photos, charts (persisted)
├── manage.sh              # Management script
├── docker-compose.yml     # Container config
├── Dockerfile             # App container definition
└── .env                   # Your secrets (never commit this)
```

---

*Generated for ABCare OmniFlow — Ubuntu 24.04 LTS offline USB deployment*
