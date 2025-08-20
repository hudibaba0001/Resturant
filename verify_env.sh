#!/bin/bash

# 🔍 Environment Variable Verification Script
# Run this to check if all required env vars are set

echo "🔍 Verifying Environment Variables..."
echo "====================================="

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    
    # Check required variables
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
        "NEXT_PUBLIC_WIDGET_ORIGIN"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.local; then
            echo "✅ $var is set"
        else
            echo "❌ $var is missing"
        fi
    done
    
    # Check optional variables
    OPTIONAL_VARS=(
        "STRIPE_WEBHOOK_SECRET"
        "SENTRY_DSN"
    )
    
    echo ""
    echo "Optional variables:"
    for var in "${OPTIONAL_VARS[@]}"; do
        if grep -q "^$var=" .env.local; then
            echo "✅ $var is set"
        else
            echo "⚠️  $var is not set (optional for development)"
        fi
    done
    
else
    echo "❌ .env.local file not found"
    echo "Please create .env.local with the required variables"
fi

echo ""
echo "📋 Vercel Production Environment Variables:"
echo "Make sure these are set in Vercel → Settings → Environment Variables:"
echo ""
echo "Required:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- OPENAI_API_KEY"
echo "- STRIPE_SECRET_KEY"
echo "- NEXT_PUBLIC_WIDGET_ORIGIN"
echo ""
echo "Optional:"
echo "- STRIPE_WEBHOOK_SECRET"
echo "- SENTRY_DSN"
echo ""
echo "⚠️  Remember: NEXT_PUBLIC_WIDGET_ORIGIN must be exact origin (no trailing slash)"
