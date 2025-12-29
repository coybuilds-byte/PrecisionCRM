# Render Deployment Guide for RecruitFlow CRM

## Prerequisites

1. **GitHub Repository** — Push your code to GitHub (public or private)
2. **Neon Database** — Already set up ✓
3. **Affinda API Key** — Already have it ✓
4. **Render Account** — Sign up at https://render.com (free tier available)

## Deployment Steps

### Step 1: Connect GitHub to Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Select **"Build and deploy from a Git repository"**
4. Authorize Render to access your GitHub account
5. Select the repository containing this project

### Step 2: Configure the Web Service

On the Render dashboard, fill in:

- **Name:** `recruitflow-api` (or your preferred name)
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Instance Type:** Standard (free tier available)

### Step 3: Add Environment Variables

In Render dashboard, go to **"Environment"** and add:

```
DATABASE_URL=postgresql://neondb_owner:npg_jEXpWGygf8C1@ep-crimson-star-ad1rqtwc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

AFFINDA_API_KEY=aff_6ae993530fbe3cf74b85120bd75fc5fd6b109ad1

NODE_ENV=production

AUTH_PEPPER=<generate-a-random-string>

SESSION_PEPPER=<generate-another-random-string>

PORT=5000
```

**To generate random strings for AUTH_PEPPER and SESSION_PEPPER:**
```powershell
# In PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

### Step 4: Deploy

1. Click **"Create Web Service"** on Render
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the project
   - Start the service

3. Monitor the deployment logs in the Render dashboard
4. Once deployed, your app will be available at: `https://<your-service-name>.onrender.com`

### Step 5: Initialize the Database

After deployment, run the seed script to create the initial user and recruiter:

Option A: Via Render Shell
1. In Render dashboard, go to your service
2. Click **"Shell"**
3. Run: `npx tsx server/seed.ts`

Option B: Via Local CLI (if Render CLI is set up)
```bash
render run npx tsx server/seed.ts
```

## Verify Deployment

- API Health: `https://<your-service-name>.onrender.com/api/health`
- Login: Navigate to `https://<your-service-name>.onrender.com` and log in with:
  - Email: `jesse@precisionsourcemanagement.com`
  - Password: `Staffpass1`

## Post-Deployment

### Set up Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Custom Domain"**
3. Add your domain and follow DNS setup instructions

### Enable Auto-Deploy

1. Go to your service **"Settings"**
2. Enable **"Auto-Deploy"** to automatically redeploy on Git push

### Monitor Logs

View real-time logs in Render dashboard:
- Deployment logs
- Application logs
- Error tracking

## Troubleshooting

### Build Fails
- Check `npm run build` runs locally: `npm install && npm run build`
- Ensure all dependencies are in `package.json`

### Database Connection Fails
- Verify `DATABASE_URL` is correctly set in Render environment variables
- Ensure Neon database is active and accessible

### Python Service Issues (if using Affinda)
- Affinda integration runs inside the Node backend
- Ensure `AFFINDA_API_KEY` is set correctly

### Application Won't Start
- Check logs in Render dashboard
- Verify `npm run start` works locally
- Ensure `PORT=5000` is set

## Useful Render Commands

```bash
# View logs (requires Render CLI)
render logs --service=recruitflow-api

# Trigger redeploy
render redeploy --service=recruitflow-api

# Scale replicas (paid plans only)
render scale --service=recruitflow-api --num=2
```

## Cost Considerations

**Free Tier:**
- 750 hours/month of web service runtime (enough for always-on service)
- Neon free tier: 10 GB storage, reasonable query limits
- Good for development/testing

**Paid Tier:**
- Pay-as-you-go: $0.10/hour per instance
- Neon paid tier: $0.3/GB storage, higher limits

## Next Steps

1. Push code to GitHub
2. Follow steps 1-4 above
3. Monitor deployment in Render dashboard
4. Test login and resume parsing
5. Optional: Set up custom domain and SSL

For more help: https://render.com/docs
