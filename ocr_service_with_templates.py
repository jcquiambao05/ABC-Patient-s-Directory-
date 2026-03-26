#!/usr/bin/env python3
"""
MediFlow OCR Service with Template Support
Processes medical charts and formats them according to customizable templates
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image
import torch
import cv2
import numpy as np
import io
import base64
import os
import re
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

print("="*60)
print("MediFlow OCR Service with Templates - CPU Mode")
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
    print("   Using default extraction only")

# Initialize PaddleOCR (CPU) - Minimal configuration
print("Loading PaddleOCR...")
paddle_ocr = PaddleOCR(lang='en')
print("✅ PaddleOCR loaded")

# Initialize TrOCR (CPU)
print("Loading TrOCR for handwritten text...")
trocr_model_path = os.path.expanduser("~/mediflow-models/trocr-handwritten")
trocr_processor = TrOCRProcessor.from_pretrained(trocr_model_path)
trocr_model = VisionEncoderDecoderModel.from_pretrained(trocr_model_path)
print("✅ TrOCR loaded")

print("="*60)
print("Device: CPU")
print("="*60)

def classify_region(confidence):
    """Classify text region as printed or handwritten"""
    return "handwritten" if confidence < 0.75 else "printed"

def process_handwritten(image_region):
    """Process handwritten text with TrOCR"""
    try:
        if isinstance(image_region, np.ndarray):
            image_region = Image.fromarray(cv2.cvtColor(image_region, cv2.COLOR_BGR2RGB))
        
        pixel_values = trocr_processor(image_region, return_tensors="pt").pixel_values
        generated_ids = trocr_model.generate(pixel_values)
        text = trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return text
    except Exception as e:
        print(f"TrOCR error: {e}")
        return ""

def extract_with_patterns(text, extraction_rules):
    """Extract structured data using regex patterns from templates"""
    extracted = {}
    
    # Common headers to exclude from name extraction
    EXCLUDED_NAMES = [
        'patient medical chart', 'medical chart', 'patient information',
        'patient info', 'hospital', 'clinic', 'community', 'health',
        'patient chart', 'medical record', 'emr', 'ehr'
    ]
    
    for field_name, rules in extraction_rules.items():
        patterns = rules.get('patterns', [])
        
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
                
                # Handle split_by for list fields
                if rules.get('split_by'):
                    value = [v.strip() for v in value.split(rules['split_by'])]
                
                extracted[field_name] = value
                break
    
    return extracted

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

def format_to_template(extracted_data, template_name="general_visit"):
    """Format extracted data according to specified template"""
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
    
    # Map extracted data to template fields
    for field_name, field_config in template['fields'].items():
        if field_name in extracted_data:
            formatted['data'][field_name] = extracted_data[field_name]
        elif field_config.get('required'):
            formatted['missing_required_fields'].append(field_name)
        else:
            formatted['data'][field_name] = None
    
    # Collect any data that doesn't fit the template
    template_fields = set(template['fields'].keys())
    extra_data = {k: v for k, v in extracted_data.items() if k not in template_fields}
    
    if extra_data:
        formatted['additional_notes'].append({
            "type": "unmatched_data",
            "content": extra_data,
            "note": "Unique details specific to this patient"
        })
    
    return formatted

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'device': 'cpu',
        'gpu_available': False,
        'models': {
            'paddleocr': 'v4',
            'trocr': 'base-handwritten'
        },
        'templates_loaded': len(templates.get('templates', {}))
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
    """Process document with OCR and format according to template"""
    try:
        data = request.json
        image_data = data.get('image')
        template_name = data.get('template', 'general_visit')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed (handles RGBA, grayscale, etc.)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_np = np.array(image)
        
        # Step 1: PaddleOCR for layout and printed text
        paddle_results = paddle_ocr.ocr(image_np)
        
        regions = []
        full_text = []
        
        if paddle_results and paddle_results[0]:
            for line in paddle_results[0]:
                bbox = line[0]
                text, confidence = line[1]
                
                region_type = classify_region(confidence)
                
                # Use TrOCR for handwritten regions
                if region_type == "handwritten":
                    x_coords = [p[0] for p in bbox]
                    y_coords = [p[1] for p in bbox]
                    x1, x2 = int(min(x_coords)), int(max(x_coords))
                    y1, y2 = int(min(y_coords)), int(max(y_coords))
                    
                    # Extract region with padding
                    pad = 5
                    x1 = max(0, x1 - pad)
                    y1 = max(0, y1 - pad)
                    x2 = min(image_np.shape[1], x2 + pad)
                    y2 = min(image_np.shape[0], y2 + pad)
                    
                    region = image_np[y1:y2, x1:x2]
                    
                    if region.size > 0:
                        handwritten_text = process_handwritten(region)
                        if handwritten_text:
                            text = handwritten_text
                            confidence = 0.9
                
                regions.append({
                    'text': text,
                    'confidence': float(confidence),
                    'type': region_type,
                    'bbox': [[int(p[0]), int(p[1])] for p in bbox]
                })
                
                full_text.append(text)
        
        # Step 2: Extract structured data using template patterns
        full_text_str = ' '.join(full_text)
        
        extraction_rules = templates.get('extraction_rules', {})
        extracted_data = extract_with_patterns(full_text_str, extraction_rules)
        
        # Step 3: Format according to template
        formatted_data = format_to_template(extracted_data, template_name)
        
        return jsonify({
            'success': True,
            'full_text': full_text_str,
            'regions': regions,
            'extracted_data': extracted_data,
            'formatted_data': formatted_data,
            'stats': {
                'total_regions': len(regions),
                'avg_confidence': sum(r['confidence'] for r in regions) / len(regions) if regions else 0,
                'handwritten_count': sum(1 for r in regions if r['type'] == 'handwritten'),
                'printed_count': sum(1 for r in regions if r['type'] == 'printed')
            }
        })
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/save_template', methods=['POST'])
def save_custom_template():
    """Save a custom template configuration"""
    try:
        data = request.json
        template_id = data.get('template_id')
        template_config = data.get('template_config')
        
        if not template_id or not template_config:
            return jsonify({'error': 'Missing template_id or template_config'}), 400
        
        # Load current templates
        if os.path.exists(TEMPLATE_FILE):
            with open(TEMPLATE_FILE, 'r') as f:
                current_templates = json.load(f)
        else:
            current_templates = {'templates': {}, 'extraction_rules': {}}
        
        # Add new template
        current_templates['templates'][template_id] = template_config
        
        # Save back to file
        with open(TEMPLATE_FILE, 'w') as f:
            json.dump(current_templates, f, indent=2)
        
        # Reload templates
        global templates
        templates = current_templates
        
        return jsonify({
            'success': True,
            'message': f'Template "{template_id}" saved successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 MediFlow OCR Service Started (CPU Mode with Templates)")
    print(f"📍 Listening on http://0.0.0.0:5000")
    print(f"💻 Device: CPU")
    print(f"📋 Templates: {len(templates.get('templates', {}))} loaded")
    print(f"⏱️  Processing: ~10-15 seconds per page")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
