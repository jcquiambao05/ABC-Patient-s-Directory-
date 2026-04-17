"""
Generate a realistic handwritten-style medical chart image for testing AI upload.
Run: python3 generate_test_chart.py
Output: test_chart.png
"""

from PIL import Image, ImageDraw, ImageFont
import random
import math
import os

# Canvas — slightly off-white like real paper
W, H = 850, 1100
img = Image.new('RGB', (W, H), color=(248, 245, 238))
draw = ImageDraw.Draw(img)

# Try to load a handwriting-like font, fall back to default
def get_font(size):
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                pass
    return ImageFont.load_default()

font_title  = get_font(18)
font_label  = get_font(13)
font_hand   = get_font(15)
font_small  = get_font(11)

# ── Helpers ────────────────────────────────────────────────────────────────

def jitter(x, y, amount=2):
    """Simulate shaky hand — small random offset."""
    return x + random.uniform(-amount, amount), y + random.uniform(-amount, amount)

def wobbly_line(draw, x1, y1, x2, y2, color=(180,180,180), segments=20):
    """Draw a slightly wobbly horizontal line."""
    pts = []
    for i in range(segments + 1):
        t = i / segments
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t + random.uniform(-1.2, 1.2)
        pts.append((x, y))
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i+1]], fill=color, width=1)

def handwrite(draw, x, y, text, font, color=(30, 30, 80), slant=0.0):
    """Draw text with slight per-character jitter to simulate handwriting."""
    cx = x
    for ch in text:
        jx, jy = jitter(cx, y, amount=1.5)
        jy += slant * (cx - x) * 0.01
        draw.text((jx, jy), ch, font=font, fill=color)
        bbox = font.getbbox(ch)
        cx += (bbox[2] - bbox[0]) + random.uniform(-0.5, 1.0)

def label(draw, x, y, text):
    draw.text((x, y), text, font=font_label, fill=(80, 80, 80))

def field_line(draw, x, y, width=300):
    wobbly_line(draw, x, y + 18, x + width, y + 18, color=(160, 160, 160))

# ── Paper texture — faint ruled lines ─────────────────────────────────────
for row in range(60, H, 28):
    wobbly_line(draw, 40, row, W - 40, row, color=(220, 215, 205))

# ── Header ─────────────────────────────────────────────────────────────────
draw.rectangle([30, 20, W-30, 75], outline=(100,100,140), width=2)
draw.text((W//2 - 130, 28), "ABC CLINIC — PATIENT CHART", font=font_title, fill=(40,40,100))
draw.text((W//2 - 80, 50), "General Data Form", font=font_small, fill=(100,100,120))

# ── Section: General Data ──────────────────────────────────────────────────
y = 95
draw.text((40, y), "GENERAL DATA", font=font_label, fill=(60,60,60))
wobbly_line(draw, 40, y+16, W-40, y+16, color=(120,120,120))

y = 125
label(draw, 40, y, "Patient Name:")
field_line(draw, 155, y, 320)
handwrite(draw, 158, y, "Maria Santos", font_hand, color=(20,20,80), slant=0.3)

label(draw, 510, y, "Date:")
field_line(draw, 555, y, 200)
handwrite(draw, 558, y, "03 / 28 / 2026", font_hand, color=(20,20,80))

y = 165
label(draw, 40, y, "Age:")
field_line(draw, 80, y, 80)
handwrite(draw, 83, y, "34", font_hand, color=(20,20,80))

label(draw, 185, y, "Gender:")
field_line(draw, 240, y, 120)
handwrite(draw, 243, y, "Female", font_hand, color=(20,20,80))

label(draw, 390, y, "Civil Status:")
field_line(draw, 470, y, 150)
handwrite(draw, 473, y, "Married", font_hand, color=(20,20,80))

y = 205
label(draw, 40, y, "Date of Birth:")
field_line(draw, 130, y, 160)
handwrite(draw, 133, y, "15 / 06 / 1991", font_hand, color=(20,20,80))

label(draw, 320, y, "Contact No.:")
field_line(draw, 405, y, 200)
handwrite(draw, 408, y, "0917-832-4451", font_hand, color=(20,20,80))

y = 245
label(draw, 40, y, "Address:")
field_line(draw, 105, y, 650)
handwrite(draw, 108, y, "123 Mabini St., Brgy. San Jose, Quezon City", font_hand, color=(20,20,80), slant=0.2)

y = 285
label(draw, 40, y, "Occupation:")
field_line(draw, 120, y, 220)
handwrite(draw, 123, y, "Nurse", font_hand, color=(20,20,80))

label(draw, 370, y, "Referred By:")
field_line(draw, 450, y, 250)
handwrite(draw, 453, y, "Dr. Reyes", font_hand, color=(20,20,80))

# ── Section: Chief Complaint ───────────────────────────────────────────────
y = 330
draw.text((40, y), "CHIEF COMPLAINT / REASON FOR VISIT", font=font_label, fill=(60,60,60))
wobbly_line(draw, 40, y+16, W-40, y+16, color=(120,120,120))

y = 355
field_line(draw, 40, y, W-80)
handwrite(draw, 43, y, "Persistent cough for 2 weeks, mild fever, fatigue", font_hand, color=(20,20,80), slant=0.15)

y = 385
field_line(draw, 40, y, W-80)
handwrite(draw, 43, y, "No known allergies. Takes Metformin 500mg daily.", font_hand, color=(20,20,80), slant=-0.1)

# ── Section: Vital Signs ───────────────────────────────────────────────────
y = 425
draw.text((40, y), "VITAL SIGNS", font=font_label, fill=(60,60,60))
wobbly_line(draw, 40, y+16, W-40, y+16, color=(120,120,120))

y = 455
label(draw, 40, y, "BP:")
field_line(draw, 65, y, 110)
handwrite(draw, 68, y, "120/80", font_hand, color=(20,20,80))

label(draw, 200, y, "Temp:")
field_line(draw, 240, y, 100)
handwrite(draw, 243, y, "37.8°C", font_hand, color=(20,20,80))

label(draw, 365, y, "HR:")
field_line(draw, 390, y, 90)
handwrite(draw, 393, y, "88 bpm", font_hand, color=(20,20,80))

label(draw, 505, y, "RR:")
field_line(draw, 530, y, 90)
handwrite(draw, 533, y, "18/min", font_hand, color=(20,20,80))

label(draw, 645, y, "Wt:")
field_line(draw, 670, y, 90)
handwrite(draw, 673, y, "58 kg", font_hand, color=(20,20,80))

# ── Section: Assessment / Plan ─────────────────────────────────────────────
y = 500
draw.text((40, y), "ASSESSMENT / PLAN", font=font_label, fill=(60,60,60))
wobbly_line(draw, 40, y+16, W-40, y+16, color=(120,120,120))

y = 525
field_line(draw, 40, y, W-80)
handwrite(draw, 43, y, "Dx: Upper Respiratory Tract Infection (URTI)", font_hand, color=(20,20,80), slant=0.2)

y = 555
field_line(draw, 40, y, W-80)
handwrite(draw, 43, y, "Rx: Amoxicillin 500mg TID x 7 days, Paracetamol PRN", font_hand, color=(20,20,80), slant=-0.15)

y = 585
field_line(draw, 40, y, W-80)
handwrite(draw, 43, y, "Advised rest, increase fluid intake, RTC if no improvement", font_hand, color=(20,20,80), slant=0.1)

# ── Section: Past Medical History (checkboxes) ─────────────────────────────
y = 630
draw.text((40, y), "PAST MEDICAL HISTORY", font=font_label, fill=(60,60,60))
wobbly_line(draw, 40, y+16, W-40, y+16, color=(120,120,120))

conditions = [
    ("Hypertension", False), ("Diabetes Mellitus", True), ("Bronchial Asthma", False),
    ("Heart Disease", False), ("Tuberculosis", False), ("Allergies", False),
    ("Thyroid Disease", False), ("Surgeries", True), ("Others", False),
]
cx, cy = 40, 660
for i, (cond, checked) in enumerate(conditions):
    col = i % 3
    row = i // 3
    bx = cx + col * 250
    by = cy + row * 28
    # Draw checkbox with slight imperfection
    draw.rectangle([bx, by+2, bx+12, by+14], outline=(80,80,80), width=1)
    if checked:
        # Checkmark — slightly wobbly
        draw.line([(bx+2, by+8), (bx+5, by+12), (bx+11, by+4)], fill=(20,20,80), width=2)
    draw.text((bx+16, by), cond, font=font_small, fill=(50,50,50))

# ── Doctor signature area ──────────────────────────────────────────────────
y = 780
wobbly_line(draw, 500, y, 780, y, color=(100,100,100))
draw.text((500, y+5), "Physician's Signature", font=font_small, fill=(100,100,100))

# Fake scribble signature
sx, sy = 520, 755
pts = [(sx, sy), (sx+15, sy-8), (sx+30, sy+5), (sx+50, sy-10),
       (sx+70, sy+3), (sx+90, sy-5), (sx+110, sy+8), (sx+130, sy-3)]
for i in range(len(pts)-1):
    draw.line([pts[i], pts[i+1]], fill=(20,20,80), width=2)

# ── Add some coffee stain / paper imperfection ─────────────────────────────
for _ in range(3):
    sx = random.randint(100, 700)
    sy = random.randint(200, 900)
    r = random.randint(8, 25)
    for dr in range(r, 0, -1):
        alpha = int(255 * (1 - dr/r) * 0.04)
        draw.ellipse([sx-dr, sy-dr, sx+dr, sy+dr],
                     fill=(180, 140, 100))

# ── Save ───────────────────────────────────────────────────────────────────
img.save('test_chart.png', 'PNG', quality=95)
print("✅ test_chart.png generated successfully!")
print("   Use this image to test the AI Upload feature.")
print("   The chart contains:")
print("   - Patient: Maria Santos, Female, 34, DOB 15/06/1991")
print("   - Contact: 0917-832-4451")
print("   - Diagnosis: URTI")
print("   - Medications: Amoxicillin, Paracetamol")
print("   - Diabetes Mellitus and Surgeries checked in past medical history")
