# Deployment Setup Guide - Digital Ocean

## ✅ CD Pipeline Status

**CD (Continuous Deployment) is now configured!** 

The deployment workflow will automatically deploy to your Digital Ocean droplet after tests pass successfully.

## 🔐 Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### **1. DEPLOY_SSH_KEY** (Required)
- **What**: Your SSH private key for deployment
- **Where to add**: GitHub → Settings → Secrets and variables → Actions → New repository secret
- **Value**: Paste the entire SSH private key (the one you showed me from `/root/.ssh/github_deploy_key`)

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
... (paste entire key here)
-----END OPENSSH PRIVATE KEY-----
```

### **2. DEPLOY_HOST** (Required)
- **What**: Your Digital Ocean droplet IP address
- **Value**: `46.101.230.91`

### **3. DEPLOY_USER** (Optional)
- **What**: SSH username for deployment
- **Default**: `root` (if not set)
- **Value**: `root` (or your username if different)

### **4. DEPLOY_PATH** (Optional)
- **What**: Project directory path on the server
- **Default**: `/root/trailhub1` (if not set)
- **Value**: `/root/trailhub1` (or your actual path if different)

## 📋 How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `DEPLOY_SSH_KEY` → Value: (paste your SSH private key)
   - Name: `DEPLOY_HOST` → Value: `46.101.230.91`
   - Name: `DEPLOY_USER` → Value: `root` (optional, defaults to root)
   - Name: `DEPLOY_PATH` → Value: `/root/trailhub1` (optional, defaults to /root/trailhub1)

## 🚀 How It Works

### Deployment Flow

```
1. Push to Development branch
   ↓
2. CI Tests Run (Playwright E2E tests)
   ↓
3. If tests pass → Deploy job starts
   ↓
4. SSH into Digital Ocean droplet
   ↓
5. Pull latest code from GitHub
   ↓
6. Run docker compose up -d --build
   ↓
7. Verify deployment health
   ↓
8. ✅ Deployment complete!
```

### What Gets Deployed

- **Backend**: Node.js backend service (port 3000)
- **Frontend**: Nginx serving built frontend (port 8080)
- **Database**: PostgreSQL database (port 5432)

### Deployment Steps (Automatic)

1. **Pull Latest Code**: `git fetch origin && git reset --hard origin/Development`
2. **Pull Docker Images**: `docker compose pull`
3. **Build & Start**: `docker compose up -d --build`
4. **Health Check**: Verifies backend is responding at `/healthz`

## 🔍 Monitoring Deployments

### View Deployment Status

1. Go to your GitHub repository
2. Click **Actions** tab
3. You'll see two jobs:
   - ✅ **test** - CI tests
   - ✅ **Deploy to Digital Ocean** - CD deployment (only runs if tests pass)

### Check Server Logs

If deployment fails, check logs on your server:

```bash
ssh root@46.101.230.91
cd /root/trailhub1
docker compose logs
docker compose ps
```

## ⚙️ Server Requirements

Make sure your Digital Ocean droplet has:

- ✅ Docker installed
- ✅ Docker Compose installed
- ✅ Git repository cloned at `/root/trailhub1`
- ✅ SSH key added to GitHub (or use HTTPS with token)
- ✅ `.env` file configured on server
- ✅ Ports 3000, 8080, 5432 accessible (if needed)

## 🔄 Manual Deployment (If Needed)

If you need to deploy manually:

```bash
ssh root@46.101.230.91
cd /root/trailhub1
git pull origin Development
docker compose up -d --build
docker compose ps
```

## 🛠️ Troubleshooting

### Issue: "Permission denied (publickey)"
- **Solution**: Make sure `DEPLOY_SSH_KEY` secret contains the complete private key including headers

### Issue: "Project directory not found"
- **Solution**: Set `DEPLOY_PATH` secret to the correct path, or ensure project is at `/root/trailhub1`

### Issue: "Backend health check failed"
- **Solution**: Check server logs: `docker compose logs backend`
- Verify `.env` file is configured correctly
- Check if port 3000 is accessible

### Issue: Deployment doesn't trigger
- **Solution**: 
  - Ensure you're pushing to `Development` branch (not `main` or other branches)
  - Check that CI tests passed (deployment only runs after successful tests)
  - Verify workflow file is in `.github/workflows/playwright.yml`

## 📝 Notes

- **Deployment only runs on push** (not on pull requests)
- **Deployment only runs after tests pass**
- **Deployment runs on `Development` branch only**
- The workflow uses `docker compose up -d --build` to rebuild containers with latest code
- Database migrations should be handled separately or added to deployment script

## 🔐 Security Best Practices

1. ✅ SSH key is stored as GitHub secret (encrypted)
2. ✅ Key has restricted permissions (chmod 600)
3. ✅ StrictHostKeyChecking disabled for automation (acceptable for known server)
4. ⚠️ Consider using a dedicated deployment user instead of root
5. ⚠️ Consider restricting SSH access by IP in server firewall

## 🎯 Next Steps

1. Add the required secrets to GitHub
2. Push a commit to `Development` branch
3. Watch the Actions tab to see deployment in action!
4. Verify your app is running at `http://46.101.230.91:8080`

---

**Status**: ✅ CD Pipeline Ready  
**Last Updated**: 2025-01-XX
