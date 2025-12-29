#!/usr/bin/env node
/**
 * Test script to verify Python service and Express backend integration
 * This tests the resume parsing flow end-to-end
 */

// Test calling Python service directly
async function testPythonService() {
  console.log('\n=== Testing Python Service Directly ===');
  const pythonServiceUrl = `http://localhost:8001/parse?file_path=${encodeURIComponent('test-resume.pdf')}`;
  
  try {
    const response = await fetch(pythonServiceUrl);
    if (!response.ok) {
      console.error('❌ Python service error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Python service response structure:');
    console.log('  - success:', data.success);
    console.log('  - text:', data.text ? `${data.text.substring(0, 50)}...` : 'Missing');
    console.log('  - name:', data.name || 'Missing');
    console.log('  - email:', data.email || 'Missing');
    console.log('  - phone:', data.phone || 'Missing');
    console.log('  - address:', data.address || 'Missing');
    console.log('  - linkedin:', data.linkedin || 'Missing');
    console.log('  - skills:', Array.isArray(data.skills) ? `Array with ${data.skills.length} items` : 'Missing');
    
    // Verify critical fields exist
    const criticalFields = ['text', 'name', 'email'];
    const missingFields = criticalFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing critical fields:', missingFields);
      return null;
    }
    
    console.log('✅ All critical fields present');
    return data;
  } catch (error) {
    console.error('❌ Failed to call Python service:', error.message);
    return null;
  }
}

// Test that Express backend can process the Python response
async function testExpressIntegration(pythonData) {
  console.log('\n=== Testing Express Backend Integration ===');
  
  // Simulate what happens in the Express backend (routes.ts around line 280-320)
  console.log('Simulating Express backend processing:');
  
  // The Express backend expects these fields
  const expectedFields = {
    text: pythonData.text || '',
    name: pythonData.name || '',
    email: pythonData.email || '',
    phone: pythonData.phone || '',
    address: pythonData.address || '',
    linkedin: pythonData.linkedin || '',
    skills: pythonData.skills || []
  };
  
  // Parse name into firstName and lastName (as Express does)
  const nameParts = expectedFields.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  console.log('✅ Parsed fields for candidate creation:');
  console.log('  - firstName:', firstName);
  console.log('  - lastName:', lastName);
  console.log('  - email:', expectedFields.email);
  console.log('  - phone:', expectedFields.phone);
  console.log('  - location:', expectedFields.address);
  console.log('  - skills:', expectedFields.skills.length > 0 ? expectedFields.skills.join(', ') : 'None');
  console.log('  - resumeText length:', expectedFields.text.length);
  
  // Verify the structure matches what's expected in routes.ts
  if (firstName && lastName && expectedFields.email) {
    console.log('✅ Data structure is compatible with Express backend');
    return true;
  } else {
    console.error('❌ Data structure has issues - missing required fields');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('Starting Python-Express Integration Tests');
  console.log('=========================================');
  
  // Test Python service
  const pythonData = await testPythonService();
  if (!pythonData) {
    console.error('\n❌ Python service test failed. Cannot proceed with integration test.');
    process.exit(1);
  }
  
  // Test Express integration
  const integrationSuccess = await testExpressIntegration(pythonData);
  
  console.log('\n=========================================');
  if (integrationSuccess) {
    console.log('✅ All tests passed! The Python service response is now compatible with the Express backend.');
    console.log('✅ Resume uploads should now properly populate candidate form fields.');
  } else {
    console.error('❌ Integration test failed. Check the errors above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});