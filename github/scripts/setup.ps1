<#
  Workspace setup script for Windows PowerShell (v5.1+).
  - Creates a Python virtual environment at `.venv` if `python` or `py` is available.
  - Prints suggested next steps.
#>

Write-Output "Initializing workspace..."

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) { $pythonCmd = Get-Command py -ErrorAction SilentlyContinue }

if ($pythonCmd) {
    Write-Output "Python found: $($pythonCmd.Path)"
    if (-not (Test-Path -Path .venv)) {
        Write-Output "Creating virtual environment at '.venv'..."
        & $pythonCmd.Path -ArgumentList '-m', 'venv', '.venv'
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Virtual environment created. Activate with: .\.venv\Scripts\Activate.ps1"
        }
        else {
            Write-Output "Creation of virtual environment returned exit code $LASTEXITCODE."
        }
    }
    else {
        Write-Output "'.venv' already exists."
    }
}
else {
    Write-Output "No Python executable found (python or py). Skipping virtualenv creation."
}

Write-Output "\nDone. Suggested next steps:"
Write-Output " - In PowerShell: .\\.venv\\Scripts\\Activate.ps1  (if you created a venv)"
Write-Output " - Open the workspace file: desktop-tutorial.code-workspace"
Write-Output " - Install recommended extensions from .vscode/extensions.json"

exit 0
