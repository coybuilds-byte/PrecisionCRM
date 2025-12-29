#!/usr/bin/env python
"""
Test script to verify the Resume Parser API is working
"""
import requests
import sys

def test_api():
    """Test the Resume Parser API endpoints"""
    base_url = "http://localhost:8001"
    
    print("Testing Resume Parser API...")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✓ Root endpoint working:", response.json())
        else:
            print("✗ Root endpoint failed:", response.status_code)
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API at", base_url)
        print("  Please ensure the service is running: cd python-services/resume_parser && python -m uvicorn main:app --host 0.0.0.0 --port 8001")
        return False
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✓ Health endpoint working:", response.json())
        else:
            print("✗ Health endpoint failed:", response.status_code)
    except Exception as e:
        print("✗ Health endpoint error:", str(e))
    
    # Test parse endpoint with missing parameter
    try:
        response = requests.get(f"{base_url}/parse")
        if response.status_code == 422:
            print("✓ Parse endpoint validation working (correctly rejected missing parameter)")
        else:
            print("✗ Parse endpoint validation not working as expected")
    except Exception as e:
        print("✗ Parse endpoint error:", str(e))
    
    # Test parse endpoint with test file
    try:
        response = requests.get(f"{base_url}/parse?file_path=test_resume.pdf")
        if response.status_code in [404, 422]:
            print("✓ Parse endpoint working (correctly reported file not found)")
        elif response.status_code == 200:
            print("✓ Parse endpoint working:", response.json().get('success'))
        else:
            print("✗ Parse endpoint failed:", response.status_code)
    except Exception as e:
        print("✗ Parse endpoint error:", str(e))
    
    print("\nAPI test complete!")
    return True

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)