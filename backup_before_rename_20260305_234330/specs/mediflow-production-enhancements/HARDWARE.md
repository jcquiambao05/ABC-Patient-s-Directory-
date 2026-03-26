# ABC Patient Directory - Hardware Recommendations

## Overview

This guide provides hardware recommendations for running the system on-premise at medical clinics.

## Minimum Requirements

### For Web Application Only (Cloud OCR)
- **CPU:** Dual-core processor
- **RAM:** 4GB
- **Storage:** 20GB SSD
- **Network:** 10 Mbps internet connection
- **Cost:** ~$200-300 (used PC)

### For Complete System (Local OCR)
- **CPU:** Quad-core processor (Intel i5/AMD Ryzen 5)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 120GB SSD
- **Network:** 10 Mbps internet connection
- **Cost:** ~$400-600 (used PC)

## Recommended Configurations

### Budget Setup ($400-500)

**Use Case:** Single clinic, moderate usage (10-20 patients/day)

**Specifications:**
- **CPU:** Intel i5-6500 or AMD Ryzen 5 1600 (used)
- **RAM:** 16GB DDR4
- **Storage:** 240GB SSD
- **Network:** Gigabit Ethernet
- **OS:** Ubuntu 22.04 LTS

**Where to Buy:**
- Used office PCs on eBay/Craigslist
- Refurbished Dell OptiPlex or HP EliteDesk
- Local computer shops

**Example Build:**
```
Dell OptiPlex 7040 (used)      $200
+ 16GB RAM upgrade             $40
+ 240GB SSD                    $30
+ Ubuntu 22.04 (free)          $0
Total:                         $270
```

### Standard Setup ($600-800)

**Use Case:** Multi-location clinic, heavy usage (30-50 patients/day)

**Specifications:**
- **CPU:** Intel i5-8500 or AMD Ryzen 5 3600
- **RAM:** 16GB DDR4
- **Storage:** 500GB SSD
- **Network:** Gigabit Ethernet
- **Backup:** External 1TB HDD
- **OS:** Ubuntu 22.04 LTS

**Example Build:**
```
HP EliteDesk 800 G4 (used)     $350
+ 16GB RAM                     $50
+ 500GB SSD                    $60
+ 1TB External HDD             $50
+ Ubuntu 22.04 (free)          $0
Total:                         $510
```

### Professional Setup ($1000-1500)

**Use Case:** Large clinic, very heavy usage (100+ patients/day)

**Specifications:**
- **CPU:** Intel i7-9700 or AMD Ryzen 7 3700X
- **RAM:** 32GB DDR4
- **Storage:** 1TB NVMe SSD
- **Network:** Gigabit Ethernet
- **Backup:** NAS with RAID
- **UPS:** 1500VA UPS for power protection
- **OS:** Ubuntu 22.04 LTS

**Example Build:**
```
Dell Precision 3640 (used)     $600
+ 32GB RAM upgrade             $100
+ 1TB NVMe SSD                 $100
+ Synology DS220j NAS          $200
+ APC UPS 1500VA               $150
Total:                         $1,150
```

## Component Details

### CPU Requirements

**Minimum:** Dual-core, 2.5GHz
- Handles web application
- Basic OCR processing
- 1-2 concurrent users

**Recommended:** Quad-core, 3.0GHz+
- Faster OCR processing
- Multiple concurrent users
- Better multitasking

**High-End:** 6-8 cores, 3.5GHz+
- Very fast OCR processing
- Many concurrent users
- Future-proof

**Specific Models:**
- **Budget:** Intel i3-8100, AMD Ryzen 3 3200G
- **Standard:** Intel i5-9400, AMD Ryzen 5 3600
- **Professional:** Intel i7-9700, AMD Ryzen 7 3700X

### RAM Requirements

**8GB:** Minimum for basic operation
- Can run all services
- May slow down with heavy use
- Not recommended for production

**16GB:** Recommended for most clinics
- Smooth operation
- Handles multiple users
- Good for OCR processing

**32GB:** For large clinics
- Excellent performance
- Many concurrent users
- Future-proof

### Storage Requirements

**120GB SSD:** Minimum
- OS + Application: 20GB
- Database: 10-50GB (grows over time)
- Documents: 20-50GB
- Logs: 5-10GB

**240-500GB SSD:** Recommended
- Plenty of space for growth
- Room for backups
- Better performance

**1TB+ SSD:** For large clinics
- Long-term storage
- Multiple years of data
- Local backups

**Storage Type:**
- **SSD:** Required for good performance
- **HDD:** Only for backups, not main storage
- **NVMe:** Best performance, but not required

### Network Requirements

**Internet Connection:**
- **Minimum:** 10 Mbps download, 5 Mbps upload
- **Recommended:** 50 Mbps download, 10 Mbps upload
- **Ideal:** 100 Mbps download, 20 Mbps upload

**Local Network:**
- Gigabit Ethernet (1000 Mbps)
- WiFi 5 (802.11ac) or better
- Reliable router with QoS support

### Power Requirements

**Power Consumption:**
- Idle: 30-50W
- Active: 80-150W
- Peak: 200W

**Monthly Electricity Cost:**
- Average usage: 100W × 24h × 30 days = 72 kWh
- At $0.12/kWh: ~$8.64/month
- At $0.20/kWh: ~$14.40/month

**UPS Recommendations:**
- **Minimum:** 600VA (360W)
- **Recommended:** 1000VA (600W)
- **Professional:** 1500VA (900W)

**Benefits of UPS:**
- Protects against power outages
- Prevents data corruption
- Allows graceful shutdown
- Protects hardware from surges

## Operating System

### Recommended: Ubuntu 22.04 LTS

**Pros:**
- Free and open source
- Long-term support (5 years)
- Easy to install and maintain
- Great for servers
- Large community support

**Installation:**
1. Download Ubuntu 22.04 LTS Desktop
2. Create bootable USB drive
3. Install with default options
4. Update system: `sudo apt-get update && sudo apt-get upgrade`

### Alternative: Ubuntu Server 22.04 LTS

**Pros:**
- Lighter weight (no GUI)
- Better performance
- Lower resource usage

**Cons:**
- Command-line only
- Steeper learning curve
- Requires SSH for remote access

### Windows (Not Recommended)

**Cons:**
- License cost ($100-200)
- More resource intensive
- More complex setup
- Security concerns

**Only use if:**
- Already have Windows license
- Staff familiar with Windows only
- Need Windows-specific software

## Networking Setup

### Router Requirements

**Minimum:**
- Gigabit Ethernet ports
- WiFi 5 (802.11ac)
- Basic firewall

**Recommended:**
- Gigabit Ethernet ports
- WiFi 6 (802.11ax)
- Advanced firewall
- QoS (Quality of Service)
- VPN support

**Recommended Models:**
- **Budget:** TP-Link Archer A7 ($50)
- **Standard:** ASUS RT-AX55 ($100)
- **Professional:** Ubiquiti UniFi Dream Machine ($300)

### Network Security

**Essential:**
- Change default router password
- Enable WPA3 WiFi encryption
- Disable WPS
- Enable firewall
- Regular firmware updates

**Recommended:**
- Separate guest WiFi network
- VPN for remote access
- Network monitoring
- Intrusion detection

## Backup Solutions

### Local Backup

**External HDD:**
- **Capacity:** 1-2TB
- **Cost:** $50-80
- **Backup:** Daily automated backups
- **Retention:** 30 days

**NAS (Network Attached Storage):**
- **Capacity:** 2-4TB (RAID 1)
- **Cost:** $200-400
- **Backup:** Continuous replication
- **Retention:** 90 days

**Recommended NAS:**
- Synology DS220j (2-bay, $200)
- QNAP TS-251D (2-bay, $300)
- Synology DS420+ (4-bay, $500)

### Cloud Backup

**Services:**
- Backblaze B2: $5/TB/month
- AWS S3 Glacier: $4/TB/month
- Google Cloud Storage: $20/TB/month

**Recommendation:**
- Keep 7 days local backup
- Keep 30 days cloud backup
- Encrypt before uploading

## Peripheral Devices

### Scanner (for Document Digitization)

**Budget:**
- Canon CanoScan LiDE 400 ($90)
- Epson Perfection V19 ($70)

**Professional:**
- Fujitsu ScanSnap iX1600 ($400)
- Brother ADS-2700W ($300)

**Features to Look For:**
- Automatic document feeder (ADF)
- Duplex scanning
- Fast scan speed (20+ ppm)
- Good OCR software included

### Printer (Optional)

**Budget:**
- Brother HL-L2350DW ($100)
- HP LaserJet Pro M15w ($100)

**Professional:**
- Brother MFC-L2750DW ($200)
- HP LaserJet Pro MFP M428fdw ($400)

## Maintenance

### Regular Maintenance

**Weekly:**
- Check disk space
- Review system logs
- Verify backups completed

**Monthly:**
- Clean dust from computer
- Check for system updates
- Test backup restoration

**Quarterly:**
- Deep clean hardware
- Replace thermal paste (if needed)
- Check all cables and connections

**Annually:**
- Replace UPS battery
- Upgrade system if needed
- Review hardware performance

### Hardware Lifespan

**Expected Lifespan:**
- **CPU:** 5-10 years
- **RAM:** 5-10 years
- **SSD:** 3-5 years (depends on usage)
- **HDD:** 3-5 years
- **UPS Battery:** 2-3 years
- **Router:** 3-5 years

**Replacement Schedule:**
- **SSD:** Replace after 3 years or when showing signs of failure
- **UPS Battery:** Replace every 2-3 years
- **Complete System:** Upgrade every 5 years

## Cost Summary

### Initial Investment

**Budget Setup:**
- Hardware: $400
- UPS: $80
- External backup: $60
- **Total: $540**

**Standard Setup:**
- Hardware: $600
- UPS: $120
- NAS backup: $250
- **Total: $970**

**Professional Setup:**
- Hardware: $1,000
- UPS: $150
- NAS backup: $400
- Scanner: $300
- **Total: $1,850**

### Ongoing Costs

**Electricity:**
- Budget: $10/month
- Standard: $15/month
- Professional: $20/month

**Maintenance:**
- UPS battery replacement: $40 every 2-3 years
- SSD replacement: $60 every 3-5 years

**Total 5-Year Cost:**
- Budget: $540 + ($10 × 60) + $100 = $1,240
- Standard: $970 + ($15 × 60) + $140 = $2,010
- Professional: $1,850 + ($20 × 60) + $200 = $3,250

## Conclusion

**For Most Clinics:**
- Standard setup ($600-800) is recommended
- Provides good performance
- Room for growth
- Reasonable cost

**For Budget-Conscious:**
- Budget setup ($400-500) is sufficient
- Can upgrade later if needed
- Start small, scale up

**For Large Operations:**
- Professional setup ($1,000-1,500) recommended
- Better performance
- More reliable
- Future-proof

## Where to Buy

**New Hardware:**
- Amazon
- Newegg
- B&H Photo
- Local computer stores

**Used/Refurbished:**
- eBay
- Craigslist
- Facebook Marketplace
- TechSoup (for nonprofits)

**Business Suppliers:**
- Dell Business
- HP Business
- Lenovo Business
- CDW

## Support

For hardware questions:
- Check manufacturer specifications
- Verify compatibility with Ubuntu
- Test before deploying to production
- Keep receipts and warranties
