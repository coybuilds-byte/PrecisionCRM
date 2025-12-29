# PowerShell script to run Python unit tests for the resume parser
# Usage: .\run-tests.ps1

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found on PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Python:"
    Write-Host "  1. Download from https://www.python.org/downloads/windows/"
    Write-Host "  2. During install, CHECK 'Add Python to PATH'"
    Write-Host "  3. Restart PowerShell after installation"
    Write-Host ""
    exit 1
}

# Navigate to python-services
$servicePath = "imported_recruitflow/RecruitFlow/RecruitFlow/python-services"
if (!(Test-Path $servicePath)) {
    Write-Host "✗ Python services folder not found at: $servicePath" -ForegroundColor Red
    exit 1
}

cd $servicePath
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

# Create venv if it doesn't exist
if (!(Test-Path ".venv")) {
    Write-Host ""
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create venv" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to activate venv" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Virtual environment activated" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Run tests
Write-Host ""
Write-Host "Running tests..." -ForegroundColor Cyan
Write-Host "" 
python -m pytest tests/test_resume_parser.py -v
$testExitCode = $LASTEXITCODE

Write-Host ""
if ($testExitCode -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed (exit code: $testExitCode)" -ForegroundColor Red
}

exit $testExitCode
