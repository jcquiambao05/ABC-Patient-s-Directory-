#!/usr/bin/env python3
"""
ABC Patient Directory OCR Service - Production-Grade Tesseract OCR
Robust name extraction with comprehensive validation and debug logging
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
import os
import re
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

print("="*60)
print("ABC Patient Directory OCR Service - Robust Edition")
print("="*60)

# Load templates
TEMPLATE_FILE = "medical_chart_templates.json"
templates = {}

try:
    with open(TEMPLATE_FILE, 'r') as f:
        templates = json.load(f)
    print(f"✅ Loaded {len(templates.get('templates', {}))} templates")
except FileNotFoundError:
    print(f"⚠️  Template file not found: {TEMPLATE_FILE}")

# Initialize Tesseract OCR
try:
    import pytesseract
    print("✅ Tesseract OCR available")
    TESSERACT_AVAILABLE = True
except ImportError:
    print("⚠️  Tesseract not available - install with: pip install pytesseract")
    TESSERACT_AVAILABLE = False

print("="*60)
print(f"Device: CPU")
print(f"Tesseract: {'✅' if TESSERACT_AVAILABLE else '❌'}")
print("="*60)

def extract_text_simple(image):
    """Extract text using Tesseract OCR"""
    try:
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Use Tesseract with optimized config
        if TESSERACT_AVAILABLE:
            try:
                # Use custom Tesseract config for better accuracy
                custom_config = r'--oem 3 --psm 6'
                text = pytesseract.image_to_string(image, config=custom_config)
                if text and text.strip():
                    print(f"✅ Tesseract extracted {len(text)} characters")
                    return text.strip()
            except Exception as e:
                print(f"⚠️  Tesseract failed: {e}")
        
        return ""
    except Exception as e:
        print(f"❌ OCR error: {e}")
        return ""

def normalize_date(date_str):
    """Normalize various date formats to YYYY-MM-DD"""
    if not date_str or date_str == 'N/A':
        return None
    
    # Try various date formats
    date_formats = [
        '%m/%d/%Y',      # 05/18/1985
        '%m/%d/%y',      # 05/18/85
        '%m-%d-%Y',      # 05-18-1985
        '%m-%d-%y',      # 05-18-85
        '%Y-%m-%d',      # 1985-05-18 (already normalized)
        '%B %d, %Y',     # May 18, 1985
        '%b %d, %Y',     # May 18, 1985
        '%d/%m/%Y',      # 18/05/1985
        '%d-%m-%Y',      # 18-05-1985
    ]
    
    for fmt in date_formats:
        try:
            parsed_date = datetime.strptime(date_str.strip(), fmt)
            return parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    # If all formats fail, return None
    return None

def is_valid_patient_name(value):
    """
    Validate if extracted value is a real patient name.
    Returns (is_valid, reason) tuple for debugging.
    
    Production-grade validation with 11 comprehensive checks.
    """
    if not value or not value.strip():
        return False, "empty value"
    
    value = value.strip()
    value_lower = value.lower()
    
    # List of invalid exact matches
    INVALID_EXACT_MATCHES = [
        'n/a', 'na', 'none', 'unknown', 'patient', 'name', 'gender',
        'male', 'female', 'patient, n/a', 'patient n/a', 'patient,n/a',
        'patient information', 'patient info'
    ]
    
    # List of invalid words (if first word matches, reject)
    INVALID_FIRST_WORDS = [
        'patient', 'name', 'gender', 'male', 'female', 'address', 'phone',
        'email', 'date', 'dob', 'admit', 'chief', 'complaint', 'history',
        'exam', 'assessment', 'plan', 'diagnosis', 'treatment', 'notes',
        'information', 'contact', 'emergency', 'insurance', 'provider',
        'medical', 'chart', 'record', 'hospital', 'clinic', 'health'
    ]
    
    # Check 1: Exact match against invalid values
    if value_lower in INVALID_EXACT_MATCHES:
        return False, f"exact match: '{value_lower}'"
    
    # Check 2: Contains "n/a" anywhere (catches "Patient, N/A")
    if 'n/a' in value_lower or 'n / a' in value_lower:
        return False, "contains n/a"
    
    # Check 3: Contains form field indicators
    if any(indicator in value for indicator in [':', '|', '_____', '___', '...']):
        return False, "contains form indicators"
    
    # Check 4: Must have at least 2 words (first and last name)
    words = value.split()
    if len(words) < 2:
        return False, f"only {len(words)} word(s)"
    
    # Check 5: First word must not be an invalid word (catches "Patient Something", "Gender Something")
    first_word = words[0].lower()
    if first_word in INVALID_FIRST_WORDS:
        return False, f"first word is invalid: '{first_word}'"
    
    # Check 6: Check if any word is "n/a" or similar (catches "Something N/A")
    for word in words:
        word_clean = word.lower().strip(',.')
        if word_clean in ['n/a', 'na', 'none', 'unknown']:
            return False, f"contains invalid word: '{word_clean}'"
    
    # Check 7: Must start with capital letter (proper name format)
    if not value[0].isupper():
        return False, "doesn't start with capital"
    
    # Check 8: Each word should start with capital (proper name format)
    # Allow for middle initials and suffixes like "Jr.", "Sr.", "III"
    for word in words:
        if len(word) > 0 and word not in ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']:
            if not word[0].isupper():
                return False, f"word '{word}' not capitalized"
    
    # Check 9: Must contain only letters, spaces, hyphens, apostrophes, and periods
    # This filters out things like "Patient, N/A" (has comma)
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -'.")
    if not all(c in allowed_chars for c in value):
        invalid_chars = [c for c in value if c not in allowed_chars]
        return False, f"contains invalid characters: {invalid_chars}"
    
    # Check 10: Name shouldn't be too long (likely extracted wrong)
    if len(value) > 50:
        return False, f"too long ({len(value)} chars)"
    
    # Check 11: Each word should be reasonable length (2-20 chars, except middle initials)
    for word in words:
        word_clean = word.strip('.,')
        # Allow single letter middle initials
        if len(word_clean) == 1:
            continue
        if len(word_clean) < 2 or len(word_clean) > 20:
            return False, f"word '{word}' has unusual length"
    
    return True, "valid"

def extract_with_patterns(text, extraction_rules):
    """Extract structured data using regex patterns with robust validation"""
    extracted = {}
    
    # Special fields that should be omitted (not set to N/A) if not found
    omit_if_missing = ['date', 'visit_date', 'date_of_birth', 'dob']
    
    for field_name, rules in extraction_rules.items():
        patterns = rules.get('patterns', [])
        
        found = False
        for pattern_idx, pattern in enumerate(patterns):
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1) if match.groups() else match.group(0)
                value = value.strip()
                
                # Special handling for patient_name - comprehensive validation
                if field_name == 'patient_name':
                    is_valid, reason = is_valid_patient_name(value)
                    
                    # Debug logging (always show for name extraction)
                    print(f"🔍 Name validation: '{value}'")
                    print(f"   Pattern #{pattern_idx + 1}: {pattern[:60]}...")
                    print(f"   Result: {'✅ VALID' if is_valid else '❌ REJECTED'} - {reason}")
                    
                    if not is_valid:
                        continue  # Try next pattern
                
                # Special handling for dates - normalize format
                if field_name in ['date_of_birth', 'date', 'visit_date']:
                    value = normalize_date(value)
                    if not value:  # Skip if date normalization failed
                        continue
                
                if rules.get('split_by'):
                    value = [v.strip() for v in value.split(rules['split_by'])]
                
                # Only add if value is not empty
                if value and str(value).strip():
                    extracted[field_name] = value
                    found = True
                    break
        
        # If no value found, set to "N/A" unless it's a special field
        if not found and field_name not in omit_if_missing:
            extracted[field_name] = "N/A"
    
    return extracted

def format_to_template(extracted_data, template_name="general_visit"):
    """Format extracted data according to template"""
    if not templates or 'templates' not in templates:
        return extracted_data
    
    template = templates['templates'].get(template_name)
    if not template:
        return extracted_data
    
    formatted = {
        "template_name": template['name'],
        "template_description": template['description'],
        "generated_at": datetime.now().isoformat(),
        "data": {},
        "missing_required_fields": [],
        "additional_notes": []
    }
    
    for field_name, field_config in template['fields'].items():
        if field_name in extracted_data:
            value = extracted_data[field_name]
            formatted['data'][field_name] = value if value else "N/A"
        elif field_config.get('required'):
            formatted['missing_required_fields'].append(field_name)
        else:
            formatted['data'][field_name] = "N/A"
    
    template_fields = set(template['fields'].keys())
    extra_data = {k: v for k, v in extracted_data.items() if k not in template_fields}
    
    if extra_data:
        formatted['additional_notes'].append({
            "type": "unmatched_data",
            "content": extra_data
        })
    
    return formatted

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'device': 'cpu',
        'gpu_available': False,
        'models': {
            'tesseract': TESSERACT_AVAILABLE
        },
        'templates_loaded': len(templates.get('templates', {})),
        'mode': 'robust_production',
        'version': '2.0'
    })

@app.route('/templates', methods=['GET'])
def list_templates():
    """List available templates"""
    if not templates or 'templates' not in templates:
        return jsonify({'error': 'No templates loaded'}), 500
    
    template_list = []
    for key, template in templates['templates'].items():
        template_list.append({
            'id': key,
            'name': template['name'],
            'description': template['description'],
            'fields': list(template['fields'].keys())
        })
    
    return jsonify({'templates': template_list})

@app.route('/process', methods=['POST'])
def process_document():
    """Process document with Tesseract OCR and robust validation"""
    try:
        data = request.json
        image_data = data.get('image')
        template_name = data.get('template', 'general_visit')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Check if OCR is available
        if not TESSERACT_AVAILABLE:
            return jsonify({'error': 'Tesseract OCR not available. Install pytesseract.'}), 500
        
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        print(f"\n📄 Processing image: {image.size} pixels, mode: {image.mode}")
        
        # Extract text using Tesseract
        full_text = extract_text_simple(image)
        
        if not full_text or not full_text.strip():
            return jsonify({
                'error': 'No text could be extracted from the image. Please ensure the image contains readable text.'
            }), 400
        
        print(f"📝 Extracted text ({len(full_text)} chars)")
        print(f"   First 150 chars: {full_text[:150]}...")
        
        # Extract structured data with robust validation
        extraction_rules = templates.get('extraction_rules', {})
        extracted_data = extract_with_patterns(full_text, extraction_rules)
        
        print(f"✅ Extracted data: {extracted_data}")
        
        # Format according to template
        formatted_data = format_to_template(extracted_data, template_name)
        
        return jsonify({
            'success': True,
            'full_text': full_text,
            'regions': [{
                'text': full_text,
                'confidence': 0.90,
                'type': 'printed',
                'bbox': [[0, 0], [image.width, 0], [image.width, image.height], [0, image.height]]
            }],
            'extracted_data': extracted_data,
            'formatted_data': formatted_data,
            'stats': {
                'total_regions': 1,
                'avg_confidence': 0.90,
                'handwritten_count': 0,
                'printed_count': 1,
                'ocr_engine': 'tesseract',
                'version': '2.0_robust'
            }
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 ABC Patient Directory OCR Service Started (Robust Edition)")
    print(f"📍 Listening on http://0.0.0.0:5000")
    print(f"💻 Device: CPU")
    print(f"🔍 OCR Engine: Tesseract")
    print(f"📋 Templates: {len(templates.get('templates', {}))} loaded")
    print(f"✨ Features: 11-layer name validation + debug logging")
    if not TESSERACT_AVAILABLE:
        print("⚠️  WARNING: Tesseract OCR not available!")
        print("   Install: sudo apt-get install tesseract-ocr")
        print("   Install: pip install pytesseract")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
