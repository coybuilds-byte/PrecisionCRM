#!/usr/bin/env python
"""
Simple script to start the FastAPI resume parser service
"""
import sys
import os

# Add the resume_parser directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resume_parser'))

# Import and run the app
from main import app
import uvicorn

if __name__ == "__main__":
    print("Starting Resume Parser Service on http://0.0.0.0:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
