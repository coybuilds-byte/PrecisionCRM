#!/usr/bin/env python
"""
Start the FastAPI resume parser service with proper error handling
"""
import sys
import os
import time

# Add the resume_parser directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resume_parser'))

# Import and run the app
from main import app
import uvicorn

if __name__ == "__main__":
    print("Starting Resume Parser Service on http://0.0.0.0:8001", flush=True)
    print("Service is ready for connections...", flush=True)
    
    # Keep retrying if the service crashes
    while True:
        try:
            uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
        except Exception as e:
            print(f"Service crashed with error: {e}", flush=True)
            print("Restarting in 5 seconds...", flush=True)
            time.sleep(5)