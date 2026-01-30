#!/bin/bash

# Script to add environment variables to Vercel
# Usage: ./scripts/add-vercel-env.sh

echo "🚀 Adding environment variables to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "   Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel."
    echo "   Run: vercel login"
    exit 1
fi

echo "✅ Vercel CLI is ready"
echo ""

# Read variables from .env.production
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.production file not found"
    exit 1
fi

echo "📋 Reading variables from .env.production..."
echo ""

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    local environments=$3  # "production,preview,development"
    
    echo "Adding: $var_name"
    
    IFS=',' read -ra ENVS <<< "$environments"
    for env in "${ENVS[@]}"; do
        echo "  → Setting for $env environment..."
        echo "$var_value" | vercel env add "$var_name" "$env" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "    ✅ Added to $env"
        else
            echo "    ⚠️  Failed or already exists for $env"
        fi
    done
    echo ""
}

# Extract and add NEXT_PUBLIC_ECOM_API_URL
ECOMM_API_URL=$(grep "^NEXT_PUBLIC_ECOM_API_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ -n "$ECOMM_API_URL" ]; then
    add_env_var "NEXT_PUBLIC_ECOM_API_URL" "$ECOMM_API_URL" "production,preview"
else
    echo "⚠️  NEXT_PUBLIC_ECOM_API_URL not found in .env.production"
fi

# Extract and add NEXT_PUBLIC_STRAPI_URL (if uncommented)
STRAPI_URL=$(grep "^NEXT_PUBLIC_STRAPI_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ -n "$STRAPI_URL" ]; then
    add_env_var "NEXT_PUBLIC_STRAPI_URL" "$STRAPI_URL" "production,preview"
fi

# Extract and add NEXT_PUBLIC_STRAPI_API_KEY (if uncommented)
STRAPI_KEY=$(grep "^NEXT_PUBLIC_STRAPI_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ -n "$STRAPI_KEY" ]; then
    add_env_var "NEXT_PUBLIC_STRAPI_API_KEY" "$STRAPI_KEY" "production,preview"
fi

# Extract and add IMGHIPPO_API_KEY (if uncommented)
IMGHIPPO_KEY=$(grep "^IMGHIPPO_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ -n "$IMGHIPPO_KEY" ]; then
    add_env_var "IMGHIPPO_API_KEY" "$IMGHIPPO_KEY" "production,preview"
fi

echo ""
echo "✅ Done! Environment variables have been added."
echo ""
echo "📝 Next steps:"
echo "   1. Go to Vercel Dashboard to verify the variables"
echo "   2. Redeploy your application for changes to take effect"
echo "   3. Or push a new commit to trigger a new deployment"
echo ""

