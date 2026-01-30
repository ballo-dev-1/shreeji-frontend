# Vercel Deployment - Environment Variables Setup

This guide explains how to add environment variables to your Vercel deployment.

## Required Environment Variables

Based on your `.env.production` file, you need to add the following environment variables to Vercel:

### Production Environment Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_ECOM_API_URL` | `http://164.92.249.220:4000` | Backend API URL (required) |
| `NODE_ENV` | `production` | Node environment (optional, Vercel sets this automatically) |

### Optional Environment Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_STRAPI_URL` | `http://localhost:1337` | Strapi CMS URL (if using Strapi) |
| `NEXT_PUBLIC_STRAPI_API_KEY` | `your_strapi_api_key_here` | Strapi API key (if using Strapi) |
| `IMGHIPPO_API_KEY` | `your_imghippo_api_key_here` | Image upload service key (server-side only) |

## Method 1: Using Vercel Dashboard (Recommended)

### Step 1: Navigate to Your Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create a new one if needed)

### Step 2: Access Environment Variables
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 3: Add Variables
For each environment variable:

1. Click **Add New**
2. Enter the **Name** (e.g., `NEXT_PUBLIC_ECOM_API_URL`)
3. Enter the **Value** (e.g., `http://164.92.249.220:4000`)
4. Select the environments where this variable should be available:
   - ✅ **Production** (required for production deployments)
   - ✅ **Preview** (optional, for preview deployments)
   - ✅ **Development** (optional, for local development with Vercel CLI)
5. Click **Save**

### Step 4: Redeploy
After adding environment variables:
1. Go to the **Deployments** tab
2. Click the **⋯** (three dots) menu on your latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Method 2: Using Vercel CLI

If you have Vercel CLI installed, you can add environment variables from the command line:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variable for production
vercel env add NEXT_PUBLIC_ECOM_API_URL production
# When prompted, enter: http://164.92.249.220:4000

# Add for preview environment (optional)
vercel env add NEXT_PUBLIC_ECOM_API_URL preview
# When prompted, enter: http://164.92.249.220:4000

# Pull environment variables to verify
vercel env pull .env.local
```

## Quick Setup Script

You can also use this script to add all required variables at once via CLI:

```bash
# Make sure you're logged in and linked to your project
vercel env add NEXT_PUBLIC_ECOM_API_URL production <<< "http://164.92.249.220:4000"
```

## Important Notes

### 1. NEXT_PUBLIC_ Prefix
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- These are embedded in the JavaScript bundle at build time
- Make sure these don't contain sensitive information

### 2. Server-Side Variables
- Variables without `NEXT_PUBLIC_` prefix are only available on the server
- Examples: `IMGHIPPO_API_KEY` (if you use it)

### 3. Environment-Specific Values
- You can set different values for Production, Preview, and Development
- For example, use `http://localhost:4000` for Development and `http://164.92.249.220:4000` for Production

### 4. After Adding Variables
- **Redeploy your application** for changes to take effect
- Environment variables are baked into the build at build time
- Simply saving variables won't update existing deployments

### 5. Verification
After deployment, you can verify variables are loaded by:
- Checking the build logs in Vercel
- Adding a temporary debug endpoint in your Next.js app
- Using browser dev tools to check the network requests (for `NEXT_PUBLIC_` variables)

## Troubleshooting

### Variables Not Working?
1. ✅ Make sure you selected the correct environment (Production/Preview/Development)
2. ✅ Redeploy after adding variables
3. ✅ Check variable names match exactly (case-sensitive)
4. ✅ For `NEXT_PUBLIC_` variables, ensure they're set before the build runs
5. ✅ Check build logs for any errors

### Build Failing?
- Check that all required variables are set
- Verify variable values don't have extra spaces or quotes
- Ensure URLs are properly formatted (no trailing slashes needed, but they're handled)

## Current Configuration

Based on your `.env.production` file, add this variable to Vercel:

```
NEXT_PUBLIC_ECOM_API_URL=http://164.92.249.220:4000
```

Make sure to:
- ✅ Select **Production** environment
- ✅ Optionally select **Preview** if you want preview deployments to use the same URL
- ✅ Redeploy after adding

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

