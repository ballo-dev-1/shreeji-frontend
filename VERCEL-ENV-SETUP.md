# Quick Guide: Add Environment Variables to Vercel

## 🚀 Quick Method (CLI)

### Option 1: Use the Automated Script
```bash
./scripts/add-vercel-env.sh
```

### Option 2: Manual CLI Commands
```bash
# Make sure you're logged in and linked
vercel login
vercel link  # If not already linked

# Add the main API URL for production
echo "http://164.92.249.220:4000" | vercel env add NEXT_PUBLIC_ECOM_API_URL production

# Add for preview environment (optional)
echo "http://164.92.249.220:4000" | vercel env add NEXT_PUBLIC_ECOM_API_URL preview
```

## 📋 Required Variable

Add this to Vercel (Production environment):

```
NEXT_PUBLIC_ECOM_API_URL=http://164.92.249.220:4000
```

## 🖥️ Dashboard Method

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `NEXT_PUBLIC_ECOM_API_URL`
6. Value: `http://164.92.249.220:4000`
7. Select: ✅ **Production** (and optionally ✅ **Preview**)
8. Click **Save**
9. **Redeploy** your application

## ✅ After Adding

**Important:** You must redeploy for changes to take effect!

- Go to **Deployments** tab
- Click **⋯** on latest deployment
- Click **Redeploy**

Or push a new commit to trigger automatic deployment.

## 📚 Full Documentation

See `docs/VERCEL-DEPLOYMENT.md` for detailed instructions.

