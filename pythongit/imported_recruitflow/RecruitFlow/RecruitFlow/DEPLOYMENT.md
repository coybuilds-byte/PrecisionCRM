# RecruitFlow Deployment on Render

## Prerequisites
1. GitHub repository pushed with latest changes ✓
2. Render account (sign up at render.com)
3. Environment variables ready

## Deployment Steps

### 1. Connect GitHub Repository
1. Go to https://render.com/dashboard
2. Click **New** → **Blueprint**
3. Connect your GitHub account if not already connected
4. Select repository: `coybuilds-byte/PrecisionCRM`
5. Branch: `crm`
6. Render will detect `render.yaml` automatically

### 2. Configure Environment Variables
Both services need these variables. Set them in the Render dashboard:

**recruitflow-api service:**
- `DATABASE_URL`: (your Neon PostgreSQL connection string)
  ```
  postgresql://neondb_owner:npg_jEXpWGygf8C1@ep-crimson-star-ad1rqtwc-pooler.c-2.us-east-1.aws.neon.tech/neondb
  ```
- `AFFINDA_API_KEY`: (your Affinda API key or leave empty to use local parsing)
- `AUTH_PEPPER`: (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `SESSION_PEPPER`: (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `RESEND_API_KEY`: (your Resend API key for emails, if using 2FA)

**recruitflow-python service:**
- `AFFINDA_API_KEY`: (same as above)

### 3. Deploy
1. Click **Apply** in Render dashboard
2. Render will create both services:
   - `recruitflow-api` (Node.js backend + React frontend)
   - `recruitflow-python` (Python FastAPI with OCR)
3. Wait for builds to complete (~5-10 minutes)
4. OCR dependencies (Tesseract + Poppler) will be installed automatically

### 4. Verify Deployment
1. Check `recruitflow-api` logs for successful startup
2. Check `recruitflow-python` logs for "Application startup complete"
3. Visit your app URL: `https://recruitflow-api.onrender.com`
4. Test resume upload functionality

## Important Notes

### Free Tier Limitations
- Free services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to Starter plan ($7/month per service) for always-on

### Database
- Using external Neon PostgreSQL (already configured)
- No need to create database in Render

### Python Service Communication
- Backend automatically connects to Python service via internal Render URL
- Configured in `render.yaml` with `PYTHON_SERVICE_URL`

### OCR Support
- Tesseract and Poppler installed during build
- Supports image-based PDF parsing
- May need to increase build timeout if build fails (Settings → Advanced)

## Troubleshooting

### Build fails for Python service
- Check logs for OCR installation errors
- May need to add `apt-get install -y tesseract-ocr-eng` for English language pack

### Python service health check fails
- Verify `/health` endpoint exists in main.py
- Check if port 8001 is used in startCommand

### Backend can't connect to Python service
- Verify `PYTHON_SERVICE_URL` is set correctly in render.yaml
- Check Python service is running and healthy

### Database connection fails
- Verify `DATABASE_URL` is set correctly
- Check Neon database allows connections from Render IPs

## Post-Deployment

### Monitor Services
- Check logs regularly: Dashboard → Service → Logs tab
- Set up alerts for errors: Settings → Notifications

### Update Application
1. Push changes to GitHub `crm` branch
2. Render auto-deploys on every push
3. Monitor deployment in dashboard

### Scaling
- Upgrade to paid plans for better performance
- Consider upgrading Python service first (handles resume parsing)
- Standard plan ($25/month) recommended for production use

## Cost Estimate
- Free tier: $0/month (both services free with limitations)
- Starter tier: $14/month ($7 × 2 services, always-on)
- Standard tier: $50/month ($25 × 2 services, better performance)

## Support
- Render docs: https://render.com/docs
- Contact: jesse@precisionsourcemanagement.com
