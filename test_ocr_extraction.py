#!/usr/bin/env python3
"""
Test OCR Extraction - Verify name extraction improvements
"""

import re
from datetime import datetime

# Simulated OCR text from your medical chart
test_text = """
PATIENT MEDICAL CHART

PATIENT INFORMATION                Patient ID: LT-382941
Name: Liam Thompson              Gender: M    Admit Date: 11/15/2023
DOB: 09/12/1975                  Email: lthompson75@email.com
                                 Address: 78 Oak onset chest pain, Apt 2C, Pineville, MN 55102
CHIEF COMPLAINT
"""

# Exclusion list (same as in ocr_service_simple.py)
EXCLUDED_NAMES = [
    'patient medical chart', 'medical chart', 'patient information',
    'patient info', 'hospital', 'clinic', 'community', 'health',
    'patient chart', 'medical record', 'emr', 'ehr', 'community',
    # Single word exclusions
    'patient', 'name', 'gender', 'male', 'female', 'address', 'phone',
    'email', 'date', 'dob', 'admit', 'chief', 'complaint', 'history',
    'exam', 'assessment', 'plan', 'diagnosis', 'treatment', 'notes',
    # Common form labels
    'information', 'contact', 'emergency', 'insurance', 'provider'
]

# Test patterns
patterns = [
    r"Name\s*[:\|]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*)?\s+[A-Z][a-z]+)",
    r"Patient Name\s*[:\|]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*)?\s+[A-Z][a-z]+)",
    r"Patient\s*[:\|]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*)?\s+[A-Z][a-z]+)"
]

print("="*60)
print("OCR Name Extraction Test")
print("="*60)
print()

print("Test Text:")
print("-"*60)
print(test_text)
print()

print("Testing Name Extraction:")
print("-"*60)

for i, pattern in enumerate(patterns, 1):
    print(f"\nPattern {i}: {pattern}")
    matches = re.findall(pattern, test_text, re.IGNORECASE | re.MULTILINE)
    
    if matches:
        for match in matches:
            value = match.strip()
            value_lower = value.lower()
            
            print(f"  Raw match: '{value}'")
            
            # Apply filters
            if value_lower in EXCLUDED_NAMES:
                print(f"  ❌ EXCLUDED: In exclusion list")
                continue
            
            words = value_lower.split()
            if any(word in EXCLUDED_NAMES for word in words):
                if len(words) == 1 or all(word in EXCLUDED_NAMES for word in words):
                    print(f"  ❌ EXCLUDED: Contains excluded word(s)")
                    continue
            
            if len(value.split()) < 2:
                print(f"  ❌ EXCLUDED: Less than 2 words")
                continue
            
            if ':' in value:
                print(f"  ❌ EXCLUDED: Contains colon")
                continue
            
            if not value[0].isupper():
                print(f"  ❌ EXCLUDED: Doesn't start with capital")
                continue
            
            print(f"  ✅ ACCEPTED: '{value}'")
    else:
        print(f"  No matches found")

print()
print("="*60)
print("Expected Result: 'Liam Thompson'")
print("="*60)
