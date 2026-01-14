# GitHub Pages Setup Guide

## ✅ Code Pushed Successfully!

Commit: `9123fda`
Repository: `magyk-ai/circuitraces`

## 🚀 Enable GitHub Pages (One-Time Setup)

### Step 1: Enable GitHub Actions for Pages

1. Go to your repository on GitHub:
   **https://github.com/magyk-ai/circuitraces**

2. Click **Settings** (top right)

3. In the left sidebar, click **Pages**

4. Under **Build and deployment**:
   - **Source:** Select **GitHub Actions**
   - (Not "Deploy from a branch")

5. Save the settings

### Step 2: Trigger the First Deployment

The workflow is already configured in `.github/workflows/deploy.yml`.

**Option A - Automatic (Recommended):**
- The push to main should have triggered the workflow automatically
- Check the Actions tab to see the deployment in progress

**Option B - Manual Trigger:**
1. Go to the **Actions** tab
2. Click **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

### Step 3: Check Deployment Status

1. Go to **Actions** tab in your repo
2. Look for the workflow run "Implement Circuit Races MVP..."
3. Click on it to see progress
4. Wait for both jobs to complete:
   - ✅ build
   - ✅ deploy

This takes about 2-3 minutes for the first deployment.

### Step 4: Access Your Deployed App

Once deployment completes, your app will be live at:

**https://magyk-ai.github.io/circuitraces/**

## 🔍 Troubleshooting

### Workflow Doesn't Appear
- Go to **Settings → Actions → General**
- Check that "Allow all actions and reusable workflows" is enabled
- Check that "Read and write permissions" is enabled under Workflow permissions

### Deployment Fails
Check the workflow logs in the Actions tab. Common issues:

1. **Build fails:**
   - Check Node.js version (should be 20)
   - Check if dependencies install correctly

2. **Permissions error:**
   - Go to **Settings → Actions → General**
   - Under "Workflow permissions", select:
     - ✅ "Read and write permissions"
   - Save

3. **Pages not enabled:**
   - Ensure you selected "GitHub Actions" as the source (not "Deploy from a branch")

### App Loads But Shows Errors

1. **Blank page:**
   - Check browser console for errors
   - Verify base path in `apps/web/vite.config.ts` is set to `'./'`

2. **404 on assets:**
   - Build may need `base: '/circuitraces/'` if repo name path
   - Current config uses `base: './'` for root

3. **Puzzle doesn't load:**
   - Check `publicDir` in vite.config.ts
   - Verify `sample.json` is being served

## 🎮 Test Your Deployment

Once live, test these:

1. **Page loads** - Visit the URL
2. **Grid renders** - See 5x5 letter grid
3. **Selection works** - Try dragging to select words
4. **Puzzle completes** - Find all 4 words
5. **Mobile works** - Test on your phone

## 📊 Monitor Deployments

Every push to `main` branch will trigger automatic deployment.

Check status:
1. Go to **Actions** tab
2. See the workflow runs
3. Green ✓ = deployed successfully

## 🔧 Workflow Configuration

Your deployment workflow (`.github/workflows/deploy.yml`):
- Triggers on: push to main, manual dispatch
- Builds: engine package, then web app
- Deploys: `apps/web/dist/` to GitHub Pages
- Node version: 20
- Cache: npm packages

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. Go to **Settings → Pages**
2. Under "Custom domain", enter your domain
3. Add DNS records as instructed by GitHub
4. Enable "Enforce HTTPS"

## 📝 Next Steps After Deployment

1. Visit your live app
2. Test on desktop and mobile
3. Share the URL!
4. Continue with Sprint A (mobile hardening)

## 🎉 Success Checklist

- [ ] GitHub Pages enabled with "GitHub Actions" source
- [ ] Workflow triggered and completed successfully
- [ ] App accessible at https://magyk-ai.github.io/circuitraces/
- [ ] Grid renders correctly
- [ ] Can play and complete puzzle
- [ ] Works on mobile devices

---

## Quick Commands

```bash
# Check git status
git status

# Pull latest
git pull origin main

# Push changes (triggers deployment)
git push origin main

# View workflow file
cat .github/workflows/deploy.yml
```

## Need Help?

1. Check the Actions tab for error logs
2. Review CLAUDE.md for technical details
3. Check CURRENT_STATUS.md for known issues
4. Review vite.config.ts for build settings

---

**Your app is ready to go live! 🚀**

Just enable GitHub Pages in Settings → Pages → Source: GitHub Actions
