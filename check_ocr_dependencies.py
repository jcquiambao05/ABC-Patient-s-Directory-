#!/usr/bin/env python3
"""
MediFlow OCR Dependency Checker
Verifies all required packages and models are installed before running OCR service
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check Python version"""
    print("="*60)
    print("Checking Python Version...")
    print("="*60)
    version = sys.version_info
    print(f"Python {version.major}.{version.minor}.{version.micro}")
    if version.major == 3 and version.minor >= 8:
        print("✅ Python version is compatible (3.8+)")
        return True
    else:
        print("❌ Python 3.8+ required")
        return False

def check_package(package_name, import_name=None):
    """Check if a Python package is installed"""
    if import_name is None:
        import_name = package_name
    
    try:
        __import__(import_name)
        print(f"✅ {package_name} installed")
        return True
    except ImportError:
        print(f"❌ {package_name} NOT installed")
        return False

def check_model_files():
    """Check if TrOCR model files are downloaded"""
    print("\n" + "="*60)
    print("Checking Model Files...")
    print("="*60)
    
    model_path = Path.home() / "mediflow-models" / "trocr-handwritten"
    
    if model_path.exists():
        # Check for essential config files
        config_exists = (model_path / "config.json").exists()
        # Check for either preprocessor_config.json or processor_config.json
        preprocessor_exists = (model_path / "preprocessor_config.json").exists() or (model_path / "processor_config.json").exists()
        
        # Check for model weights (can be pytorch_model.bin, model.safetensors, or sharded)
        model_files = list(model_path.glob("*.bin")) + list(model_path.glob("*.safetensors"))
        model_exists = len(model_files) > 0
        
        if config_exists and preprocessor_exists and model_exists:
            print(f"✅ TrOCR model found at: {model_path}")
            print(f"   Config: ✅  Processor: ✅  Model weights: ✅")
            return True
        else:
            print(f"⚠️  TrOCR model directory exists but incomplete: {model_path}")
            print(f"   Config: {'✅' if config_exists else '❌'}  Processor: {'✅' if preprocessor_exists else '❌'}  Model weights: {'✅' if model_exists else '❌'}")
            return False
    else:
        print(f"❌ TrOCR model NOT found at: {model_path}")
        return False

def check_ollama():
    """Check if Ollama is installed and Qwen model is available"""
    print("\n" + "="*60)
    print("Checking Ollama...")
    print("="*60)
    
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print("✅ Ollama installed")
            
            if "qwen2.5:7b-instruct-q4_K_M" in result.stdout or "qwen2.5" in result.stdout:
                print("✅ Qwen 2.5 model available")
                return True
            else:
                print("⚠️  Qwen 2.5 model NOT found")
                print("   Run: ollama pull qwen2.5:7b-instruct-q4_K_M")
                return False
        else:
            print("❌ Ollama not responding")
            return False
            
    except FileNotFoundError:
        print("❌ Ollama NOT installed")
        print("   Install: curl -fsSL https://ollama.com/install.sh | sh")
        return False
    except subprocess.TimeoutExpired:
        print("⚠️  Ollama command timed out")
        return False

def main():
    """Run all dependency checks"""
    print("\n" + "="*60)
    print("MediFlow OCR Dependency Checker")
    print("="*60 + "\n")
    
    checks = []
    
    # Python version
    checks.append(("Python Version", check_python_version()))
    
    # Core packages
    print("\n" + "="*60)
    print("Checking Core Packages...")
    print("="*60)
    
    packages = [
        ("torch", "torch"),
        ("torchvision", "torchvision"),
        ("paddlepaddle", "paddle"),
        ("paddleocr", "paddleocr"),
        ("transformers", "transformers"),
        ("opencv-python-headless", "cv2"),
        ("Pillow", "PIL"),
        ("Flask", "flask"),
        ("flask-cors", "flask_cors"),
        ("numpy", "numpy"),
        ("sentencepiece", "sentencepiece"),
    ]
    
    for package_name, import_name in packages:
        checks.append((package_name, check_package(package_name, import_name)))
    
    # Model files
    checks.append(("TrOCR Model", check_model_files()))
    
    # Ollama
    checks.append(("Ollama + Qwen", check_ollama()))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ✅ ✅ ALL DEPENDENCIES READY! ✅ ✅ ✅")
        print("\nYou can now run the OCR service:")
        print("  source ~/mediflow-ocr-env/bin/activate")
        print("  python3 ~/mediflow-ocr-service/ocr_service.py")
        return 0
    else:
        print("\n❌ MISSING DEPENDENCIES")
        print("\nFailed checks:")
        for name, result in checks:
            if not result:
                print(f"  - {name}")
        
        print("\nPlease install missing dependencies before running OCR service.")
        print("See KUBUNTU-25.04-OCR-SETUP.md for installation instructions.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
