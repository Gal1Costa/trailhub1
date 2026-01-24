# GitHub CI/CD Setup Guide - TrailHub

## **Complete Setup Instructions**

### **Phase 1: Create GitHub Repository**

1. **Go to GitHub** → https://github.com/new
2. **Create new repository:**
   - Repository name: `trailhub` (or your preferred name)
   - Description: `TrailHub - Hiking trails and guides platform`
   - Visibility: **Public** (or Private if preferred)
   - ✅ DO NOT initialize with README, .gitignore, or license
   - Click **Create repository**

3. **You'll see setup instructions** - follow these commands in PowerShell:

```powershell
# Navigate to project root
cd C:\Users\tauntaun\Desktop\trailhub1

# Initialize git
git init

# Set default branch to main (GitHub standard)
git branch -M main

# Add all files
git add .

# Commit
git commit -m "Initial commit with Playwright E2E tests"

# Add remote (replace USERNAME and REPO with your details)
git remote add origin https://github.com/USERNAME/trailhub.git

# Push to GitHub
git push -u origin main
```

**Example:**
```powershell
git remote add origin https://github.com/tauntaun/trailhub.git
git push -u origin main
```

### **Phase 2: Verify GitHub Actions Setup**

1. **Go to your GitHub repo** → https://github.com/USERNAME/trailhub
2. **Click "Actions"** tab
3. **Should see "Playwright E2E Tests"** workflow
4. **Click on it** → You'll see it running or waiting to run

### **Phase 3: What Happens Automatically**

✅ **On every push to `main` or `develop`:**
- Ubuntu server starts
- Node.js 18 installs
- Dependencies install
- Vite dev server starts
- Playwright tests run (all 30 tests)
- HTML report generated
- Report uploaded as artifact

✅ **On every Pull Request:**
- Same tests run
- Results show in PR comment
- Blocks merge if tests fail

---

## **File Structure Added**

```
.github/
  workflows/
    playwright.yml          ← GitHub Actions config (NEW)
frontend/
  playwright.config.js      ← Updated with XML reporter
  tests/
    *.spec.js              ← All your tests
```

---

## **Viewing Test Results**

### **Option 1: In GitHub UI**
1. Go to your repo → **Actions** tab
2. Click latest workflow run
3. Scroll down → **Artifacts** section
4. Download `playwright-report-18.x.zip`
5. Extract and open `index.html` in browser

### **Option 2: In Pull Request**
- Test results automatically post as comment on PR
- ✅ Passed/❌ Failed status shown

### **Option 3: Command Line**
```bash
# View workflow runs
gh run list --repo USERNAME/trailhub

# Download latest report
gh run download -R USERNAME/trailhub -n playwright-report-18.x

# View artifact status
gh run view LATEST -R USERNAME/trailhub
```

---

## **Common Issues & Fixes**

### **Issue: "npm: command not found"**
**Solution:** Add Node.js setup to workflow (already included)

### **Issue: "Cannot find dev server"**
**Solution:** Ensure `npm run dev` command exists in frontend/package.json
```json
{
  "scripts": {
    "dev": "vite"
  }
}
```

### **Issue: Tests timeout on GitHub**
**Solutions:**
- Increase timeout in workflow: `timeout-minutes: 60` ✅ (already set)
- Check if server started: Look at workflow logs
- Increase individual test timeouts if needed

### **Issue: "Branch protection rules"**
If you want to **require tests to pass before merging**:
1. Go to repo → **Settings** → **Branches**
2. Add rule for `main` branch
3. Check "Require status checks to pass"
4. Select "Playwright E2E Tests"

---

## **Next Steps**

### **1. Monitor Tests**
- Every commit triggers tests automatically
- Check Results in Actions tab
- Fix failing tests immediately

### **2. Set up Branch Protection** (Optional but Recommended)
```
Settings → Branches → Add rule
- Pattern: main
- ✅ Require status checks to pass
- ✅ Select "Playwright Test Results"
```

### **3. Create develop Branch** (Recommended)
```powershell
git checkout -b develop
git push -u origin develop
```

### **4. Use Protected Main**
- All work on `develop` branch
- Create PR to `main`
- Tests run automatically
- Merge only if tests pass

---

## **Workflow File Reference**

Your `.github/workflows/playwright.yml` does:

| Step | What | Why |
|------|------|-----|
| Trigger | `push` to main/develop, `pull_request` | Tests run on code changes |
| Node Setup | Install Node 18.x | Vite & Playwright need Node |
| Cache deps | `npm ci` | Faster installs (use lock file) |
| Browsers | `npx playwright install` | Download browser binaries |
| Dev server | `npm run dev` | Start Vite on localhost:5173 |
| Wait | `wait-on` | Ensures server is ready |
| Tests | `npx playwright test` | Run 30 tests |
| Report | Upload artifacts | View results in GitHub |

---

## **Quick Commands**

```powershell
# Push local changes to GitHub
git add .
git commit -m "Your message"
git push

# Pull latest from GitHub
git pull

# Check git status
git status

# View commit history
git log --oneline

# Create new branch
git checkout -b feature/my-feature
git push -u origin feature/my-feature
```

---

## **Success Indicators**

✅ Green checkmark on commits in GitHub  
✅ "All checks passed" on PRs  
✅ Test report artifact downloadable  
✅ Tests run in ~2-3 minutes  

---

## **Support**

If tests fail on GitHub but pass locally:
1. Check logs: Click on "Playwright E2E Tests" in Actions
2. Look for error messages
3. Common causes:
   - Different Node versions
   - Environment variables missing
   - Port 5173 already in use
   - Database connection issues

---

## **To Test Locally (same as GitHub)**

```powershell
cd frontend

# Install deps
npm ci

# Run tests (just like GitHub does)
npx playwright test

# View report
npx playwright show-report
```
