# Deploy RecruitFlow CRM to Render - Quick Guide

## ✅ What's Already Done
- Application is configured for Render deployment
- Database (Neon PostgreSQL) is set up
- Environment variables are ready
- 5 users are created and ready

## 🚀 Deploy to Render (Step-by-Step)

### Step 1: Push Code to GitHub

If not already done, push your code to GitHub:

```powershell
cd "c:\Users\jesse\OneDrive - Precision Source Management LLC\Documents\GitHub\desktop-tutorial\pythongit\imported_recruitflow\RecruitFlow\RecruitFlow"

# Initialize git if needed
git init
git add .
git commit -m "Initial commit - RecruitFlow CRM ready for Render"

# Add your GitHub remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Create Web Service on Render

1. Go to **https://dashboard.render.com**
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `recruitflow-crm`
   - **Runtime:** Node
   - **Branch:** `main`
   - **Root Directory:** Leave blank (or set to `imported_recruitflow/RecruitFlow/RecruitFlow` if repo includes parent folders)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** Standard (or Free for testing)

### Step 3: Add Environment Variables

In Render dashboard → Environment tab, add these variables:

```bash
# Database (already set up)
DATABASE_URL=postgresql://neondb_owner:npg_jEXpWGygf8C1@ep-crimson-star-ad1rqtwc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Authentication Security
AUTH_PEPPER=rf_auth_9k2m4n8p1x5z7w3q6v0c8b5n2m4k7j9
SESSION_PEPPER=rf_sess_7h5j2k9m3p6r8t1w4y6u0a3d5f8h1j4

# Email Service (Resend)
RESEND_API_KEY=re_bcJRULX8_CeugYkXZEYcPGuqHw81sqNSB

# Resume Parser (Affinda)
AFFINDA_API_KEY=aff_6ae993530fbe3cf74b85120bd75fc5fd6b109ad1

# Node Environment (automatically set by render.yaml)
NODE_ENV=production
PORT=5000
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait 3-5 minutes for the build to complete
4. Your app will be live at: `https://recruitflow-crm.onrender.com` (or your chosen name)

### Step 5: Update Reset Password URL

After deployment, update the forgot password reset link to use your actual Render URL:

1. Open `server/auth-routes.ts`
2. Find line ~577: `const resetLink = \`http://localhost:5000/reset-password?token=\${resetToken}\`;`
3. Change to: `const resetLink = \`https://YOUR-APP-NAME.onrender.com/reset-password?token=\${resetToken}\`;`
4. Commit and push the change

### Step 6: Test Your Deployment

1. Visit `https://your-app-name.onrender.com`
2. Log in with any of these accounts:

**All Users (Password: Staffpass1 or Staffpass1!):**
- jesse@precisionsourcemanagement.com (Admin)
- john.smith@precisionsource.com
- sarah.jones@precisionsource.com
- dianeb@precisionsourcemanagement.com
- Kassandra@precisionsourcemanagement.com

## 📧 Email Configuration

Your Resend API key is already configured! Emails will work for:
- Two-factor authentication codes
- Password reset links
- Candidate outreach emails

## 🔧 Optional: Custom Domain

1. In Render dashboard → Settings → Custom Domain
2. Add your domain (e.g., `crm.precisionsourcemanagement.com`)
3. Update DNS records as shown by Render
4. Update reset password URL to use your custom domain

## 💰 Render Pricing

**Free Tier:**
- Web service spins down after 15 min of inactivity
- 750 hours/month free
- Good for testing

**Standard Tier (~$7/month):**
- Always-on service
- No spin-down
- Recommended for production

## 🐛 Troubleshooting

**Build Fails:**
- Check that all files are committed to Git
- Verify `npm run build` works locally

**Database Connection Error:**
- Double-check DATABASE_URL is correctly copied
- Ensure no extra spaces in environment variable

**Python Service Issues:**
- Python resume parser starts automatically in production
- Check logs in Render dashboard for errors

**Application Not Loading:**
- Check Render logs for errors
- Verify all environment variables are set
- Ensure PORT is set to 5000

## 📝 Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Can log in with test accounts
- [ ] 2FA emails are being sent
- [ ] Forgot password works and sends emails
- [ ] Can navigate all CRM sections (Dashboard, Candidates, Clients, Positions)
- [ ] Update reset password URL to production domain
- [ ] Set up custom domain (optional)
- [ ] Enable auto-deploy on Git push

## 🔄 Making Updates

After initial deployment:

```powershell
# Make your changes
git add .
git commit -m "Description of changes"
git push

# Render will automatically redeploy (if auto-deploy is enabled)
```

## 📞 Support

If you encounter issues:
1. Check Render dashboard logs
2. Review environment variables
3. Verify database connectivity
4. Check that all environment variables match your .env file

Your CRM is production-ready and configured to deploy to Render! 🎉
