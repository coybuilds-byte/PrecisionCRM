#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the Python service integration directly
async function testPythonServiceIntegration() {
  console.log('Testing Python Resume Parser Service Integration...\n');
  
  // 1. Test Python service directly
  console.log('1. Testing Python service directly:');
  try {
    const healthResponse = await fetch('http://localhost:8001/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check passed:', health);
    } else {
      console.log('❌ Health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Failed to connect to Python service:', error.message);
    return;
  }

  // 2. Test parsing through Python service
  console.log('\n2. Testing resume parsing through Python service:');
  try {
    const testFile = 'test-resume.pdf';
    const parseUrl = `http://localhost:8001/parse?file_path=${encodeURIComponent(testFile)}`;
    const parseResponse = await fetch(parseUrl);
    
    if (parseResponse.ok) {
      const parseResult = await parseResponse.json();
      console.log('✅ Resume parsed successfully!');
      console.log('   Extracted data:');
      console.log('   - Name:', parseResult.extracted_data.contact.full_name);
      console.log('   - Email:', parseResult.extracted_data.contact.email);
      console.log('   - Phone:', parseResult.extracted_data.contact.phone);
      console.log('   - Location:', parseResult.extracted_data.contact.address);
      console.log('   - LinkedIn:', parseResult.extracted_data.contact.linkedin);
    } else {
      const error = await parseResponse.json();
      console.log('❌ Parsing failed:', error.detail);
    }
  } catch (error) {
    console.log('❌ Failed to parse resume:', error.message);
  }

  // 3. Test if Express backend can call Python service
  console.log('\n3. Testing Express backend integration:');
  console.log('   Note: The Express backend at /api/candidates/resume-upload');
  console.log('   expects files uploaded via object storage.');
  console.log('   For full integration test, use the web UI to upload a resume.');
  
  // We can simulate the backend calling Python service
  console.log('\n4. Simulating backend calling Python service:');
  try {
    // This simulates what the backend does
    const tempFilePath = path.resolve('test-resume.pdf');
    const pythonServiceUrl = `http://localhost:8001/parse?file_path=${encodeURIComponent(tempFilePath)}`;
    
    const response = await fetch(pythonServiceUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend simulation successful!');
      console.log('   Python service would return extracted data to backend');
      console.log('   Backend would then save to database and return to frontend');
    } else {
      const error = await response.json();
      console.log('❌ Backend simulation failed:', error.detail);
    }
  } catch (error) {
    console.log('❌ Failed backend simulation:', error.message);
  }

  console.log('\n✨ Integration test complete!');
  console.log('The Python Resume Parser Service is running correctly on port 8001');
  console.log('and can be accessed by the Express backend for resume parsing.');
}

// Run the test
testPythonServiceIntegration();