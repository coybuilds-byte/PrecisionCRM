import { spawn } from 'child_process';
import { log } from './vite';
import { existsSync } from 'fs';
import { join } from 'path';

export function startPythonResumeParser() {
  log('Starting Python Resume Parser Service on port 8001...');
  
  // Check for virtual environment Python on Windows
  const venvPython = join(process.cwd(), 'python-services', '.venv', 'Scripts', 'python.exe');
  const pythonCmd = existsSync(venvPython) ? venvPython : 'python';
  
  if (pythonCmd !== 'python') {
    log('Using Python from virtual environment');
  }
  
  const pythonProcess = spawn(pythonCmd, ['python-services/start_service.py'], {
    stdio: 'pipe',
    detached: false
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python Service] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Service Error] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python Service] Process exited with code ${code}`);
    // Restart after a delay if it crashes
    if (code !== 0) {
      console.log('[Python Service] Restarting in 5 seconds...');
      setTimeout(() => startPythonResumeParser(), 5000);
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python Service] Failed to start:', err);
    // Retry after delay
    console.log('[Python Service] Retrying in 5 seconds...');
    setTimeout(() => startPythonResumeParser(), 5000);
  });

  // Test the service after a delay
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:8001/health');
      if (response.ok) {
        log('✓ Python Resume Parser Service is running on port 8001');
      }
    } catch (error) {
      console.warn('[Python Service] Health check failed - service may still be starting');
    }
  }, 3000);

  return pythonProcess;
}