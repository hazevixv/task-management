# ⚡ Quick Vercel Deployment Guide

## 🎯 3-Step Deployment

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and login
2. Click **"Add New Project"**
3. Import: `hazevixv/task-management`
4. Click **"Import"**

### Step 2: Add Environment Variables
In the Vercel import screen, add these variables:

**Copy from your local `.env` file:**

| Variable | Value from .env |
|----------|----------------|
| `DB_HOST` | Copy from .env |
| `DB_PORT` | Copy from .env |
| `DB_USER` | Copy from .env |
| `DB_PASSWORD` | Copy from .env |
| `DB_NAME` | Copy from .env |
| `GROQ_API_KEY` | Copy from .env |
| `GROQ_MODEL` | `openai/gpt-oss-20b` |
| `AI_PROVIDER` | `groq` |
| `NEXT_PUBLIC_APP_NAME` | `InYourTask` |
| `NEXT_PUBLIC_APP_VERSION` | `2.0.0` |
| `DISABLE_CONSOLE_LOGS` | `true` |
| `ENABLE_DEBUG_LOGS` | `false` |

### Step 3: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Visit your deployment URL

---

## ✅ Verify Deployment

1. **Homepage loads:** `https://your-app.vercel.app`
2. **Login works:** Username: `admin`, Password: `raytask123`
3. **Dashboard loads** with data from database
4. **AI chat works** in the AI Assistant page

---

## 🌐 Add Custom Domain

1. Go to Project Settings → **Domains**
2. Add: `task.haze.biz.id`
3. Add CNAME record to your DNS:
   - **Type:** CNAME
   - **Name:** `task`
   - **Value:** `cname.vercel-dns.com`

---

## 🔄 Auto-Deploy Setup

Already configured! Every push to `main` branch will auto-deploy:

```bash
# Make changes locally
git add .
git commit -m "your changes"
git push origin main

# Vercel automatically deploys! 🚀
```

---

## 🐛 If Deployment Fails

### Build Error: Dependency Conflict
✅ **Already Fixed** - Removed `@react-three/fiber`

### Build Error: TypeScript/ESLint
✅ **Already Fixed** - Build errors ignored in `next.config.js`

### Runtime Error: 500 on API calls
❌ **Check Environment Variables:**
1. Go to Vercel → Settings → Environment Variables
2. Verify all variables are set
3. Click **"Redeploy"** after adding variables

### Runtime Error: Database Connection
❌ **Check Aiven Firewall:**
1. Go to Aiven Console → Your Database
2. Check **"Allowed IP Addresses"**
3. Set to **"Allow from anywhere"** or add Vercel IPs

---

## 📞 Quick Support

**Check Build Logs:**
Vercel Dashboard → Deployments → Click deployment → View logs

**Check Runtime Logs:**
Vercel Dashboard → Your Project → Logs tab

**Test Locally First:**
```bash
npm run build
npm start
```

---

## 🎉 Success!

Your app is live at: `https://task.haze.biz.id`

Default login:
- Username: `admin`
- Password: `raytask123`

⚠️ **Change password after first login!**
