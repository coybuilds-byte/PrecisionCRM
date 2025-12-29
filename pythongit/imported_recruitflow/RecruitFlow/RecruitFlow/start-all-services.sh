#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping services..."
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null
    fi
    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null
    fi
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Start Python resume parser service
echo "Starting Python Resume Parser Service on port 8001..."
cd python-services && python start_service.py &
PYTHON_PID=$!
cd ..

# Wait for Python service to start
sleep 3

# Test if Python service is running
curl -s http://localhost:8001/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Python Resume Parser Service is running on port 8001"
else
    echo "⚠ Warning: Python Resume Parser Service may not be running correctly"
fi

# Start Node.js application
echo "Starting Node.js application..."
NODE_ENV=development tsx server/index.ts &
NODE_PID=$!

echo ""
echo "All services started:"
echo "  - Python Resume Parser: http://localhost:8001"
echo "  - Node.js Application: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait $PYTHON_PID $NODE_PID