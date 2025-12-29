#!/bin/bash

# Navigate to the resume parser directory
cd /home/runner/workspace/python-services/resume_parser

# Start the FastAPI service with uvicorn
echo "Starting Resume Parser Service on port 8001..."
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info