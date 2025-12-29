# RecruitFlowCRM - Setup and Push to GitHub Guide

## ✅ Application Renamed to RecruitFlowCRM

Your CRM has been renamed from "Precision Source CRM" to **RecruitFlowCRM**.

## 📦 Install Git (Required)

Git is not currently installed. You have two options:

### Option 1: Install Git for Windows (Recommended)

1. Download Git from: https://git-scm.com/download/win
2. Run the installer with default settings
3. Restart PowerShell after installation
4. Verify installation: `git --version`

### Option 2: Use GitHub Desktop (Easier GUI)

1. Download from: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. Use the GUI to manage your repository

## 🚀 Push to GitHub - After Installing Git

### Step 1: Initialize Git Repository

```powershell
cd "c:\Users\jesse\OneDrive - Precision Source Management LLC\Documents\GitHub\desktop-tutorial\pythongit\imported_recruitflow\RecruitFlow\RecruitFlow"

# Initialize git
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit - RecruitFlowCRM ready for deployment"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `RecruitFlowCRM`
3. Description: "Professional recruitment CRM system"
4. Choose Public or Private
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 3: Push to GitHub

GitHub will show you commands. Use these:

```powershell
# Add GitHub as remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/RecruitFlowCRM.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using GitHub Desktop

If you installed GitHub Desktop:

1. Open GitHub Desktop
2. File → Add Local Repository
3. Browse to: `C:\Users\jesse\OneDrive - Precision Source Management LLC\Documents\GitHub\desktop-tutorial\pythongit\imported_recruitflow\RecruitFlow\RecruitFlow`
4. Click "Create a repository" if prompted
5. Click "Publish repository" button
6. Choose name: `RecruitFlowCRM`
7. Click "Publish Repository"

## 📋 Files to Exclude (.gitignore)

Create a `.gitignore` file to exclude sensitive files:

```
node_modules/
dist/
.env
.venv/
__pycache__/
*.pyc
.pytest_cache/
.DS_Store
```

## ✅ After Pushing to GitHub

1. Your repository will be at: `https://github.com/YOUR_USERNAME/RecruitFlowCRM`
2. Proceed to Render deployment following DEPLOY_TO_RENDER.md
3. In Render, connect this GitHub repository

## 🔐 Important: Secure Your .env File

The `.gitignore` should prevent `.env` from being pushed, but double-check:
- Your `.env` file should NOT appear in GitHub
- If it does, remove it immediately and rotate all keys

## Next Steps

1. Install Git (or GitHub Desktop)
2. Push code to GitHub
3. Deploy to Render using your new GitHub repository
4. Access your CRM at `https://recruitflow-crm.onrender.com`

---

**Application Name:** RecruitFlowCRM  
**Package Name:** recruitflow-crm  
**GitHub Repo:** RecruitFlowCRM  
**Render Service:** recruitflow-crm
