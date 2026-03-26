#!/usr/bin/env python3
"""
MediFlow Simple OCR Service - Tesseract + TrOCR (CPU Compatible)
Fallback service when PaddleOCR has CPU issues
Uses Tesseract for document text extraction and TrOCR for handwritten text
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
print("MediFlow Simple OCR Service - Tesseract + TrOCR")
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

# Initialize TrOCR (CPU) - for handwritten text
TROCR_AVAILABLE = False
try:
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    print("Loading TrOCR for handwritten text...")
    trocr_model_path = os.path.expanduser("~/mediflow-models/trocr-handwritten")
    if os.path.exists(trocr_model_path):
        trocr_processor = TrOCRProcessor.from_pretrained(trocr_model_path)
        trocr_model = VisionEncoderDecoderModel.from_pretrained(trocr_model_path)
        print("✅ TrOCR loaded")
        TROCR_AVAILABLE = True
    else:
        print("⚠️  TrOCR model not found at:", trocr_model_path)
except Exception as e:
    print(f"⚠️  TrOCR not available: {e}")

print("="*60)
print(f"Device: CPU")
print(f"Tesseract: {'✅' if TESSERACT_AVAILABLE else '❌'}")
print(f"TrOCR: {'✅' if TROCR_AVAILABLE else '❌'}")
print("="*60)

def extract_text_simple(image):
    """Extract text using Tesseract OCR (primary) or TrOCR (fallback)"""
    try:
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Try Tesseract first (best for printed text and documents)
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
        
        # Fallback to TrOCR for handwritten text
        if TROCR_AVAILABLE:
            try:
                pixel_values = trocr_processor(image, return_tensors="pt").pixel_values
                generated_ids = trocr_model.generate(pixel_values)
                text = trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
                print(f"✅ TrOCR extracted: {text}")
                return text
            except Exception as e:
                print(f"⚠️  TrOCR failed: {e}")
        
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

def extract_with_patterns(text, extraction_rules):
    """Extract structured data using regex patterns"""
    extracted = {}
    
    # Common headers to exclude from name extraction
    EXCLUDED_NAMES = [
        'patient medical chart', 'medical chart', 'patient information',
        'patient info', 'hospital', 'clinic', 'community', 'health',
        'patient chart', 'medical record', 'emr', 'ehr', 'ssmmunity'
    ]
    
    # Special fields that should be omitted (not set to N/A) if not found
    # This allows the server to use default values
    omit_if_missing = ['date', 'visit_date', 'date_of_birth', 'dob']
    
    for field_name, rules in extraction_rules.items():
        patterns = rules.get('patterns', [])
        
        found = False
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1) if match.groups() else match.group(0)
                value = value.strip()
                
                # Special handling for patient_name - filter out headers
                if field_name == 'patient_name':
                    if value.lower() in EXCLUDED_NAMES:
                        continue
                    # Must have at least first and last name (2 words minimum)
                    if len(value.split()) < 2:
                        continue
                    # Filter out lines with colons (likely labels)
                    if ':' in value:
                        continue
                
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
            # Replace null/None with "N/A"
            value = extracted_data[field_name]
            formatted['data'][field_name] = value if value else "N/A"
        elif field_config.get('required'):
            formatted['missing_required_fields'].append(field_name)
        else:
            # Use "N/A" instead of None for missing optional fields
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
            'tesseract': TESSERACT_AVAILABLE,
            'trocr': TROCR_AVAILABLE
        },
        'templates_loaded': len(templates.get('templates', {})),
        'mode': 'simple_fallback'
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
    """Process document with Tesseract OCR"""
    try:
        data = request.json
        image_data = data.get('image')
        template_name = data.get('template', 'general_visit')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Check if OCR is available
        if not TESSERACT_AVAILABLE and not TROCR_AVAILABLE:
            return jsonify({'error': 'No OCR engine available. Install pytesseract or TrOCR.'}), 500
        
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        print(f"📄 Processing image: {image.size} pixels, mode: {image.mode}")
        
        # Extract text using Tesseract or TrOCR
        full_text = extract_text_simple(image)
        
        if not full_text or not full_text.strip():
            return jsonify({
                'error': 'No text could be extracted from the image. Please ensure the image contains readable text.'
            }), 400
        
        print(f"📝 Extracted text ({len(full_text)} chars): {full_text[:100]}...")
        
        # Extract structured data
        extraction_rules = templates.get('extraction_rules', {})
        extracted_data = extract_with_patterns(full_text, extraction_rules)
        
        # Format according to template
        formatted_data = format_to_template(extracted_data, template_name)
        
        # Determine confidence based on OCR engine used
        confidence = 0.90 if TESSERACT_AVAILABLE else 0.75
        
        return jsonify({
            'success': True,
            'full_text': full_text,
            'regions': [{
                'text': full_text,
                'confidence': confidence,
                'type': 'printed' if TESSERACT_AVAILABLE else 'handwritten',
                'bbox': [[0, 0], [image.width, 0], [image.width, image.height], [0, image.height]]
            }],
            'extracted_data': extracted_data,
            'formatted_data': formatted_data,
            'stats': {
                'total_regions': 1,
                'avg_confidence': confidence,
                'handwritten_count': 0 if TESSERACT_AVAILABLE else 1,
                'printed_count': 1 if TESSERACT_AVAILABLE else 0,
                'ocr_engine': 'tesseract' if TESSERACT_AVAILABLE else 'trocr'
            }
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 MediFlow Simple OCR Service Started")
    print(f"📍 Listening on http://0.0.0.0:5000")
    print(f"💻 Device: CPU")
    print(f"🔍 OCR Engines: {'Tesseract' if TESSERACT_AVAILABLE else ''}{' + TrOCR' if TROCR_AVAILABLE else 'TrOCR only' if not TESSERACT_AVAILABLE else ''}")
    print(f"📋 Templates: {len(templates.get('templates', {}))} loaded")
    if not TESSERACT_AVAILABLE and not TROCR_AVAILABLE:
        print("⚠️  WARNING: No OCR engine available!")
        print("   Install Tesseract: sudo apt-get install tesseract-ocr")
        print("   Install pytesseract: pip install pytesseract")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
