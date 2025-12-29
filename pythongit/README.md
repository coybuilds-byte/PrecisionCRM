# RecruitFlow (extracted)

This repository contains an extracted copy of the RecruitFlow full-stack application under `imported_recruitflow/RecruitFlow/RecruitFlow`.

This README provides minimal, actionable steps to run the project locally (Node/TypeScript backend + client, and the Python FastAPI resume-parser service).

Prerequisites
- Node.js (v18+ recommended) and `npm`
- Python 3.11+
- `git`, and optionally `bash`/WSL for running shell scripts on Windows

Quick start (PowerShell)

1) Install Node dependencies and run the server in development

```powershell
cd imported_recruitflow/RecruitFlow/RecruitFlow
npm install
$env:NODE_ENV = 'development'
# Run dev server (starts Vite client + Node server)
npx tsx server/index.ts
# Alternatively, on POSIX shells: NODE_ENV=development tsx server/index.ts
```

Note: In development the Node server will attempt to spawn the Python resume-parser service automatically (see `server/start-python-service.ts`). Ensure `python` is available on your PATH.

2) Start the Python Resume Parser service manually (optional)

```powershell
cd imported_recruitflow/RecruitFlow/RecruitFlow/python-services
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python start_service.py
# or: cd resume_parser; python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

3) Run Python unit tests

```powershell
cd imported_recruitflow/RecruitFlow/RecruitFlow/python-services
python -m pytest tests/test_resume_parser.py -v
```

Ports
- Node/Express + client: defaults to port `5000` (or `PORT` env var)
- Python resume parser: `8001`

Useful files & locations
- Node server entry: `imported_recruitflow/RecruitFlow/RecruitFlow/server/index.ts`
- Node helper that starts the Python service: `server/start-python-service.ts`
- Node scripts & deps: `imported_recruitflow/RecruitFlow/RecruitFlow/package.json`
- Python microservice root: `imported_recruitflow/RecruitFlow/RecruitFlow/python-services`
- Python FastAPI app: `python-services/resume_parser/main.py`
- Python requirements: `python-services/requirements.txt`
- Python startup helper: `python-services/start_service.py`
- Python tests: `python-services/tests/test_resume_parser.py`
- Project Python metadata (root): `imported_recruitflow/RecruitFlow/RecruitFlow/pyproject.toml`

Quick troubleshooting
- If the Node dev server fails to start, ensure `NODE_ENV` is set to `development` and run `npx tsx server/index.ts` from the project folder.
- If the Python service fails to start, ensure you activated the venv and installed packages from `requirements.txt` and that port `8001` is free.
- On Windows, if you prefer the provided shell scripts (e.g., `start-all-services.sh`), run them via Git Bash or WSL.

Next steps I can do for you
- Add a concise top-level `pyproject.toml` or `requirements.txt` if you want a single place for Python deps.
- Add a short `run-local.ps1` wrapper to start both services on Windows.
- Merge further project-specific guidance into `.github/copilot-instructions.md` (I already added a concrete overview; I can include file-level examples).

If you want me to make any of the above changes (wrap scripts, add Windows helpers, extend the Copilot docs), tell me which and I'll implement them.
